/* eslint-disable no-unused-vars, no-empty */
/**
 * Unified Storage Adapter
 * Tự động điều phối lưu trữ:
 * - Nếu chạy trên Web -> IndexedDB
 * - Nếu chạy trên Electron Desktop -> SQLite (hoặc IndexedDB fallback)
 */

import {
  saveArchitectureFileIDB,
  getArchitectureFileIDB,
  getArchitectureFilePageIDB,
  getAllArchitectureFilesIDB,
  getAllFileSummariesIDB,
  deleteArchitectureFileIDB,
  saveCalculationResultIDB
} from './indexedDbStorage'

import {
  saveArchitectureFileSQLite,
  getArchitectureFileSQLite,
  getArchitectureFilePageSQLite,
  getAllArchitectureFilesSQLite,
  getAllFileSummariesSQLite,
  deleteArchitectureFileSQLite,
  isElectronSqliteAvailable
} from './sqliteStorage'

// Tự động dọn dẹp sạch hoàn toàn tàn dư S_MASTER_REG_* và S_CALC_RESULTS_* trong localStorage (nếu có từ bản cũ)
// Chuyển dịch 100% việc lưu trữ dữ liệu sang IndexedDB (bản Web) và SQLite (bản Desktop)
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('S_MASTER_REG_') || k.startsWith('S_CALC_RESULTS_'))) {
        legacyKeys.push(k)
      }
    }
    legacyKeys.forEach((k) => localStorage.removeItem(k))
  } catch {}
}

export const getStorageMode = () => {
  const isElectron = Boolean(window?.electron || window?.process?.type === 'renderer')
  if (isElectron && isElectronSqliteAvailable()) {
    return 'sqlite'
  }
  return 'indexeddb'
}

export const storageAdapter = {
  getMode: getStorageMode,

  saveFile: async (fileType, fileData, onProgress = null, regCode = '') => {
    const activeReg = regCode || fileData?.regCode || ''
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await saveArchitectureFileSQLite(fileType, fileData, onProgress, activeReg)
    }
    return await saveArchitectureFileIDB(fileType, fileData, onProgress, activeReg)
  },

  saveAllFilesData: async (regCode, filesData) => {
    if (!filesData) return
    for (const [fType, fData] of Object.entries(filesData)) {
      if (fData && (fData.data || Array.isArray(fData))) {
        await storageAdapter.saveFile(fType, fData, null, regCode)
      }
    }
  },

  getAllSummaries: async (regCode = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getAllFileSummariesSQLite(regCode)
    }
    return await getAllFileSummariesIDB(regCode)
  },

  getFile: async (fileType, regCode = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getArchitectureFileSQLite(fileType, regCode)
    }
    return await getArchitectureFileIDB(fileType, regCode)
  },

  getFilePage: async (fileType, page = 1, pageSize = 1500, searchFilters = {}, regCode = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getArchitectureFilePageSQLite(fileType, page, pageSize, searchFilters, regCode)
    }
    return await getArchitectureFilePageIDB(fileType, page, pageSize, searchFilters, regCode)
  },

  getAllFiles: async (regCode = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getAllArchitectureFilesSQLite(regCode)
    }
    return await getAllArchitectureFilesIDB(regCode)
  },

  deleteFile: async (fileType, regCode = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await deleteArchitectureFileSQLite(fileType, regCode)
    }
    return await deleteArchitectureFileIDB(fileType, regCode)
  },

  cleanCache: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { cleanCacheSQLite } = await import('./sqliteStorage')
      return await cleanCacheSQLite()
    }
    return { success: true }
  },

  getVersionedBundle: async (bundleCode) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { getVersionedBundleSQLite } = await import('./sqliteStorage')
      return await getVersionedBundleSQLite(bundleCode)
    }
    const { getVersionedBundleIDB } = await import('./indexedDbStorage')
    return await getVersionedBundleIDB(bundleCode)
  },

  saveVersionedBundle: async (payload) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { saveVersionedBundleSQLite } = await import('./sqliteStorage')
      return await saveVersionedBundleSQLite(payload)
    }
    const { saveVersionedBundleIDB } = await import('./indexedDbStorage')
    return await saveVersionedBundleIDB(payload)
  },

  saveCalcResult: async (resultIdOrObj, maybeData) => {
    let resultId = resultIdOrObj
    let data = maybeData
    if (typeof resultIdOrObj === 'object' && resultIdOrObj !== null && maybeData === undefined) {
      resultId = resultIdOrObj.id || resultIdOrObj.regCode || 'CURRENT_CALC'
      data = resultIdOrObj
    }
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { saveCalcResultsSQLite } = await import('./sqliteStorage')
      return await saveCalcResultsSQLite(resultId, data)
    }
    const { saveCalculationResultIDB } = await import('./indexedDbStorage')
    return await saveCalculationResultIDB(resultId, data)
  },

  saveCalcResults: async (resultIdOrObj, maybeData) => {
    let resultId = resultIdOrObj
    let data = maybeData
    if (typeof resultIdOrObj === 'object' && resultIdOrObj !== null && maybeData === undefined) {
      resultId = resultIdOrObj.id || resultIdOrObj.regCode || 'CURRENT_CALC'
      data = resultIdOrObj
    }
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { saveCalcResultsSQLite } = await import('./sqliteStorage')
      return await saveCalcResultsSQLite(resultId, data)
    }
    const { saveCalculationResultIDB } = await import('./indexedDbStorage')
    return await saveCalculationResultIDB(resultId, data)
  },

  getCalcResult: async (resultId) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { getCalcResultsSQLite } = await import('./sqliteStorage')
      return await getCalcResultsSQLite(resultId)
    }
    const { getCalculationResultIDB } = await import('./indexedDbStorage')
    return await getCalculationResultIDB(resultId)
  },

  getCalcResults: async (resultId) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { getCalcResultsSQLite } = await import('./sqliteStorage')
      return await getCalcResultsSQLite(resultId)
    }
    const { getCalculationResultIDB } = await import('./indexedDbStorage')
    return await getCalculationResultIDB(resultId)
  },

  saveMasterRegistration: async (record) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { saveMasterRegistrationSQLite } = await import('./sqliteStorage')
      return await saveMasterRegistrationSQLite(record)
    }
    const { saveMasterRegistrationIDB } = await import('./indexedDbStorage')
    return await saveMasterRegistrationIDB(record)
  },

  getMasterRegistration: async (regCode) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { getMasterRegistrationSQLite } = await import('./sqliteStorage')
      return await getMasterRegistrationSQLite(regCode)
    }
    const { getMasterRegistrationIDB } = await import('./indexedDbStorage')
    return await getMasterRegistrationIDB(regCode)
  },

  getAllMasterRegistrations: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { getAllMasterRegistrationsSQLite } = await import('./sqliteStorage')
      return await getAllMasterRegistrationsSQLite()
    }
    const { getAllMasterRegistrationsIDB } = await import('./indexedDbStorage')
    return await getAllMasterRegistrationsIDB()
  },

  deleteMasterRegistration: async (regCode) => {
    try {
      const { deleteMasterRegistrationSQLite } = await import('./sqliteStorage')
      await deleteMasterRegistrationSQLite(regCode).catch(() => {})
    } catch {}
    try {
      const { deleteMasterRegistrationIDB } = await import('./indexedDbStorage')
      await deleteMasterRegistrationIDB(regCode).catch(() => {})
    } catch {}
    try {
      localStorage.removeItem(`S_MASTER_REG_${regCode}`)
      localStorage.removeItem(`S_CALC_RESULTS_${regCode}`)
    } catch {}
    return { success: true }
  },

  publishMasterRegistration: async (regCode, version = '1.0') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { publishMasterRegistrationSQLite } = await import('./sqliteStorage')
      return await publishMasterRegistrationSQLite(regCode, version)
    }
    const { updateMasterRegistrationStatusIDB } = await import('./indexedDbStorage')
    return await updateMasterRegistrationStatusIDB(regCode, 'PUBLISHED', version)
  },

  updateMasterStatus: async (regCode, status = 'CANCELLED', remark = '') => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { updateMasterStatusSQLite } = await import('./sqliteStorage')
      return await updateMasterStatusSQLite(regCode, status, remark)
    }
    const { updateMasterRegistrationStatusIDB } = await import('./indexedDbStorage')
    return await updateMasterRegistrationStatusIDB(regCode, status, '1.0', remark)
  },

  saveTabSearchState: async (tabId, searchState) => {
    const { saveTabSearchStateIDB } = await import('./indexedDbStorage')
    return await saveTabSearchStateIDB(tabId, searchState)
  },

  getTabSearchState: async (tabId) => {
    const { getTabSearchStateIDB } = await import('./indexedDbStorage')
    return await getTabSearchStateIDB(tabId)
  },

  getStorageStats: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      try {
        const { getStorageStatsSQLite } = await import('./sqliteStorage')
        const sqliteStats = await getStorageStatsSQLite()
        if (sqliteStats && sqliteStats.success) {
          return {
            mode: 'sqlite',
            ...sqliteStats
          }
        }
      } catch (e) {
        console.warn('Lỗi getStorageStatsSQLite fallback to IDB:', e)
      }
    }
    const { getStorageStatsIDB } = await import('./indexedDbStorage')
    const idbStats = await getStorageStatsIDB()
    return {
      mode: 'indexeddb',
      ...idbStats
    }
  },

  clearAllCalcCache: async (options = {}) => {
    const mode = getStorageMode()
    let res = { success: true }
    if (mode === 'sqlite') {
      try {
        const { clearAllCalcCacheSQLite } = await import('./sqliteStorage')
        res = await clearAllCalcCacheSQLite(options)
      } catch (e) {
        console.warn('Lỗi clearAllCalcCacheSQLite:', e)
      }
    }
    try {
      const { clearAllCalcCacheIDB } = await import('./indexedDbStorage')
      await clearAllCalcCacheIDB(options)
    } catch {}

    // Dọn dẹp RAM SWR Cache
    try {
      const { clearReportCache } = await import('../../../common/reportDataCache')
      clearReportCache()
    } catch {}

    // Dọn dẹp localStorage & sessionStorage
    try {
      if (typeof window !== 'undefined') {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (
            k &&
            (k.startsWith('S_MASTER_REG_') ||
              k.startsWith('S_CALC_RESULTS_') ||
              k === 'GS_ACTIVE_DETAIL_REG_CODE')
          ) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))

        const sKeysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i)
          if (k && (k.startsWith('S_MASTER_REG_') || k.startsWith('S_CALC_RESULTS_'))) {
            sKeysToRemove.push(k)
          }
        }
        sKeysToRemove.forEach((k) => sessionStorage.removeItem(k))
      }
    } catch {}

    return res
  },

  vacuumDb: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { vacuumDbSQLite } = await import('./sqliteStorage')
      return await vacuumDbSQLite()
    }
    return { success: true }
  },

  clearMemoryCache: async () => {
    try {
      const { clearReportCache } = await import('../../../common/reportDataCache')
      clearReportCache()
      return { success: true }
    } catch (e) {
      return { success: false, error: e?.message }
    }
  },

  saveFactoryMachines: async (factoryKey, machines) => {
    // 1. Luôn lưu vào IndexedDB (để tra cứu trên Web và trong DevTools Application > IndexedDB)
    const { saveFactoryMachinesIDB } = await import('./indexedDbStorage')
    const idbRes = await saveFactoryMachinesIDB(factoryKey, machines)

    // 2. Nếu môi trường hỗ trợ SQLite (Electron Desktop), lưu thêm vào SQLite
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      try {
        const { saveFactoryMachinesSQLite } = await import('./sqliteStorage')
        await saveFactoryMachinesSQLite(factoryKey, machines)
      } catch (sqlErr) {
        console.warn('Lỗi lưu SQLite factory machines:', sqlErr)
      }
    }
    return idbRes
  },

  getFactoryMachines: async (factoryKey) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      try {
        const { getFactoryMachinesSQLite } = await import('./sqliteStorage')
        const rows = await getFactoryMachinesSQLite(factoryKey)
        if (Array.isArray(rows) && rows.length > 0) return rows
      } catch (sqlErr) {
        console.warn('Lỗi đọc SQLite factory machines, fallback sang IndexedDB:', sqlErr)
      }
    }
    const { getFactoryMachinesIDB } = await import('./indexedDbStorage')
    return await getFactoryMachinesIDB(factoryKey)
  },

  clearFactoryMachines: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { clearFactoryMachinesSQLite } = await import('./sqliteStorage')
      return await clearFactoryMachinesSQLite()
    }
    const { clearFactoryMachinesIDB } = await import('./indexedDbStorage')
    return await clearFactoryMachinesIDB()
  }
}

export default storageAdapter
