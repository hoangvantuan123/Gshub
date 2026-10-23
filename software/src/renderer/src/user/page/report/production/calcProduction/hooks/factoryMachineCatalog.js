import storageAdapter from '../storage'
import { queryProdMachineCatalogs } from '@renderer/user/page/report/registration/machineCatalog/machineCatalogService'
import {
  filterMachineCatalogByFactory,
  mapMasterFactoryToCatalogKey
} from '../engine/machineComparison'

const extractMachineRows = (response) => {
  const candidates = [response?.data?.data, response?.data, response]
  for (const value of candidates) {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.items)) return value.items
    if (Array.isArray(value?.rows)) return value.rows
  }
  return []
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

  const snapshotRows = snapshotMatches
    ? filterMachineCatalogByFactory(preferredCatalog, factoryName)
    : []
  const hasSnapshot = snapshotRows.length > 0

  if (preferSnapshot && hasSnapshot) {
    if (factoryKey) {
      try {
        const cached = await storageAdapter.getFactoryMachines(factoryKey)
        if (!Array.isArray(cached) || cached.length === 0) {
          await storageAdapter.saveFactoryMachines(factoryKey, snapshotRows)
        }
      } catch {
        await storageAdapter.saveFactoryMachines(factoryKey, snapshotRows)
      }
    }
    return snapshotRows
  }

  if (!refresh && factoryKey) {
    try {
      const cached = await storageAdapter.getFactoryMachines(factoryKey)
      const safeCached = filterMachineCatalogByFactory(cached, factoryName)
      if (safeCached.length > 0) {
        if (safeCached.length !== cached.length) {
          await storageAdapter.saveFactoryMachines(factoryKey, safeCached)
        }
        return safeCached
      }
    } catch (error) {
      console.warn('[MachineCatalog] Lỗi đọc danh mục máy đã lưu:', error)
    }
  }

  try {
    const params = { page: 1, pageSize: 1000 }
    if (factoryKey) params.FactoryExact = factoryKey
    let machines = filterMachineCatalogByFactory(
      extractMachineRows(await queryProdMachineCatalogs(params)),
      factoryName
    )

    if (machines.length === 0) {
      const allMachines = extractMachineRows(
        await queryProdMachineCatalogs({ page: 1, pageSize: 1000 })
      )
      machines = filterMachineCatalogByFactory(allMachines, factoryName)
    }
    if (machines.length > 0 && factoryKey) {
      await storageAdapter.saveFactoryMachines(factoryKey, machines)
    }
    return machines.length > 0 ? machines : hasSnapshot ? snapshotRows : []
  } catch (error) {
    console.warn('[MachineCatalog] Lỗi tải danh mục máy từ máy chủ:', error)
    return hasSnapshot ? snapshotRows : []
  }
}
