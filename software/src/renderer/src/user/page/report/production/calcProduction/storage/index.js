/**
 * Unified Storage Adapter
 * Tự động điều phối lưu trữ:
 * - Nếu chạy trên Web -> IndexedDB
 * - Nếu chạy trên Electron Desktop -> SQLite (hoặc IndexedDB fallback)
 */

import {
  saveArchitectureFileIDB,
  getArchitectureFileIDB,
  getAllArchitectureFilesIDB,
  getAllFileSummariesIDB,
  deleteArchitectureFileIDB,
  saveCalculationResultIDB
} from './indexedDbStorage'

import {
  saveArchitectureFileSQLite,
  getArchitectureFileSQLite,
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

  saveCalcResult: async (resultId, data) => {
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { saveCalcResultsSQLite } = await import('./sqliteStorage')
      return await saveCalcResultsSQLite(resultId, data)
    }
    const { saveCalculationResultIDB } = await import('./indexedDbStorage')
    return await saveCalculationResultIDB(resultId, data)
  },

  saveCalcResults: async (resultId, data) => {
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
    const mode = getStorageMode()
    if (mode === 'sqlite') {
      const { deleteMasterRegistrationSQLite } = await import('./sqliteStorage')
      return await deleteMasterRegistrationSQLite(regCode)
    }
    const { deleteMasterRegistrationIDB } = await import('./indexedDbStorage')
    return await deleteMasterRegistrationIDB(regCode)
  }
}

export default storageAdapter
