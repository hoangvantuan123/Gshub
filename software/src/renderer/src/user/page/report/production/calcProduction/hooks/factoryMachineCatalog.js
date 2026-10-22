import storageAdapter from '../storage'
import { queryProdMachineCatalogs } from '@renderer/user/page/report/registration/machineCatalog/machineCatalogService'
import { mapMasterFactoryToCatalogKey } from '../engine/machineComparison'

const extractMachineRows = (response) => {
  const candidates = [response?.data, response?.data?.data, response]
  for (const value of candidates) {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.items)) return value.items
    if (Array.isArray(value?.rows)) return value.rows
  }
  return []
}

const rawFactoryOf = (row) =>
  row?.Factory || row?.['Nhà máy'] || row?.factory || row?.FactoryName || row?.factory_name || ''

const belongsToFactory = (row, factoryKey) => {
  const rawFactory = rawFactoryOf(row)
  if (!rawFactory) return false
  return mapMasterFactoryToCatalogKey(rawFactory) === factoryKey
}

/**
 * Resolve the factory machine list from the calculation snapshot, local cache,
 * or server. The optional snapshot is the catalog used by a saved calculation.
 */
export async function loadFactoryMachineCatalog(
  factoryName,
  {
    preferredCatalog = [],
    preferredFactoryKey = '',
    preferSnapshot = true,
    refresh = false
  } = {}
) {
  const factoryKey = mapMasterFactoryToCatalogKey(factoryName)
  const snapshotMatches = !preferredFactoryKey || preferredFactoryKey === factoryKey

  const hasSnapshot =
    snapshotMatches && Array.isArray(preferredCatalog) && preferredCatalog.length > 0

  if (preferSnapshot && hasSnapshot) {
    if (factoryKey) {
      try {
        const cached = await storageAdapter.getFactoryMachines(factoryKey)
        if (!Array.isArray(cached) || cached.length === 0) {
          await storageAdapter.saveFactoryMachines(factoryKey, preferredCatalog)
        }
      } catch {
        await storageAdapter.saveFactoryMachines(factoryKey, preferredCatalog)
      }
    }
    return preferredCatalog
  }

  if (!refresh && factoryKey) {
    try {
      const cached = await storageAdapter.getFactoryMachines(factoryKey)
      if (Array.isArray(cached) && cached.length > 0) return cached
    } catch (error) {
      console.warn('[MachineCatalog] Lỗi đọc danh mục máy đã lưu:', error)
    }
  }

  try {
    const params = { page: 1, pageSize: 1000 }
    if (factoryKey) params.Factory = factoryKey
    let machines = extractMachineRows(await queryProdMachineCatalogs(params))

    if (machines.length === 0) {
      const allMachines = extractMachineRows(
        await queryProdMachineCatalogs({ page: 1, pageSize: 1000 })
      )
      machines = factoryKey
        ? allMachines.filter((row) => belongsToFactory(row, factoryKey))
        : allMachines
    }

    if (machines.length > 0 && factoryKey) {
      await storageAdapter.saveFactoryMachines(factoryKey, machines)
    }
    return machines.length > 0 ? machines : hasSnapshot ? preferredCatalog : []
  } catch (error) {
    console.warn('[MachineCatalog] Lỗi tải danh mục máy từ máy chủ:', error)
    return hasSnapshot ? preferredCatalog : []
  }
}
