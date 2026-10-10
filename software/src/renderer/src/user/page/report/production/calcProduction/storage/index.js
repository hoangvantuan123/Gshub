/* eslint-disable no-unused-vars */
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

export const getStorageMode = () => {
  const isElectron = Boolean(window?.electron || window?.process?.type === 'renderer')
  if (isElectron && isElectronSqliteAvailable()) {
    return 'sqlite'
  }
  return 'indexeddb'
}

export const storageAdapter = {
  getMode: getStorageMode,

  saveFile: async (fileType, fileData, onProgress = null) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await saveArchitectureFileSQLite(fileType, fileData, onProgress)
    }
    return await saveArchitectureFileIDB(fileType, fileData, onProgress)
  },

  saveAllFilesData: async (regCode, filesData) => {
    if (!filesData) return
    for (const [fType, fData] of Object.entries(filesData)) {
      if (fData && (fData.data || Array.isArray(fData))) {
        await storageAdapter.saveFile(fType, fData)
      }
    }
  },

  getAllSummaries: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getAllFileSummariesSQLite()
    }
    return await getAllFileSummariesIDB()
  },

  getFile: async (fileType) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getArchitectureFileSQLite(fileType)
    }
    return await getArchitectureFileIDB(fileType)
  },

  getFilePage: async (fileType, page = 1, pageSize = 1500, searchFilters = {}) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getArchitectureFilePageSQLite(fileType, page, pageSize, searchFilters)
    }
    return await getArchitectureFilePageIDB(fileType, page, pageSize, searchFilters)
  },

  getAllFiles: async () => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await getAllArchitectureFilesSQLite()
    }
    return await getAllArchitectureFilesIDB()
  },

  deleteFile: async (fileType) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      return await deleteArchitectureFileSQLite(fileType)
    }
    return await deleteArchitectureFileIDB(fileType)
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

  saveTabSearchState: async (tabId, searchState) => {
    const { saveTabSearchStateIDB } = await import('./indexedDbStorage')
    return await saveTabSearchStateIDB(tabId, searchState)
  },

  getTabSearchState: async (tabId) => {
    const { getTabSearchStateIDB } = await import('./indexedDbStorage')
    return await getTabSearchStateIDB(tabId)
  }
}

export default storageAdapter
