/**
 * Quản lý lưu trữ SQLite cho module Tính KHSX & TKSX
 * Dùng khi ứng dụng chạy trên nền tảng Electron Desktop build
 */

import {
  saveArchitectureFileIDB,
  getArchitectureFileIDB,
  getAllArchitectureFilesIDB,
  getAllFileSummariesIDB,
  deleteArchitectureFileIDB
} from './indexedDbStorage'

export const isElectronSqliteAvailable = () => {
  return Boolean(
    window?.electron?.sqlite ||
    (window?.electron?.ipcRenderer && typeof window?.electron?.ipcRenderer?.invoke === 'function')
  )
}

/**
 * Lấy danh sách Metadata tóm tắt của 4 file (cực nhanh không đọc mảng data)
 */
export const getAllFileSummariesSQLite = async () => {
  try {
    if (isElectronSqliteAvailable()) {
      let rows = null
      if (window?.electron?.sqlite?.getAllFileSummaries) {
        rows = await window.electron.sqlite.getAllFileSummaries()
      } else if (window?.electron?.ipcRenderer) {
        rows = await window.electron.ipcRenderer.invoke('sqlite:get-all-file-summaries')
      }

      if (Array.isArray(rows)) {
        const result = {}
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (row?.fileType) {
            result[row.fileType] = row
          }
        }
        return result
      }
    }
  } catch (error) {
    console.warn('[SQLite Storage] Lỗi lấy tóm tắt files:', error)
  }

  return await getAllFileSummariesIDB()
}

/**
 * Lưu 1 file kiến trúc vào SQLite qua Electron IPC
 */
export const saveArchitectureFileSQLite = async (fileType, fileData) => {
  try {
    if (isElectronSqliteAvailable()) {
      const payload = {
        fileType,
        fileName: fileData.fileName || '',
        fileSize: fileData.fileSize || 0,
        rowCount: fileData.rowCount || fileData.data?.length || 0,
        columns: JSON.stringify(fileData.columns || []),
        data: JSON.stringify(fileData.data || []),
        uploadedAt: fileData.uploadedAt || new Date().toISOString()
      }

      if (window?.electron?.sqlite?.saveFile) {
        return await window.electron.sqlite.saveFile(payload)
      } else if (window?.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke('sqlite:save-calc-file', payload)
      }
    }
  } catch (error) {
    console.warn('[SQLite Storage] IPC không phản hồi, fallback sang IndexedDB:', error)
  }

  return await saveArchitectureFileIDB(fileType, fileData)
}

/**
 * Lấy 1 file kiến trúc từ SQLite
 */
export const getArchitectureFileSQLite = async (fileType) => {
  try {
    if (isElectronSqliteAvailable()) {
      let row = null
      if (window?.electron?.sqlite?.getFile) {
        row = await window.electron.sqlite.getFile(fileType)
      } else if (window?.electron?.ipcRenderer) {
        row = await window.electron.ipcRenderer.invoke('sqlite:get-calc-file', fileType)
      }

      if (row) {
        return {
          ...row,
          columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
          data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        }
      }
    }
  } catch (error) {
    console.warn('[SQLite Storage] Lỗi lấy file từ SQLite, fallback sang IndexedDB:', error)
  }

  return await getArchitectureFileIDB(fileType)
}

/**
 * Lấy toàn bộ các file kiến trúc từ SQLite (chỉ dùng khi người dùng bấm Tính toán KHSX & TKSX)
 */
export const getAllArchitectureFilesSQLite = async () => {
  try {
    if (isElectronSqliteAvailable()) {
      let rows = null
      if (window?.electron?.sqlite?.getAllFiles) {
        rows = await window.electron.sqlite.getAllFiles()
      } else if (window?.electron?.ipcRenderer) {
        rows = await window.electron.ipcRenderer.invoke('sqlite:get-all-calc-files')
      }

      if (Array.isArray(rows)) {
        const result = {}
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (row?.fileType) {
            result[row.fileType] = {
              ...row,
              columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
              data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
            }
          }
        }
        return result
      }
    }
  } catch (error) {
    console.warn('[SQLite Storage] Lỗi lấy toàn bộ files từ SQLite, fallback IndexedDB:', error)
  }

  return await getAllArchitectureFilesIDB()
}

/**
 * Xóa file trong SQLite
 */
export const deleteArchitectureFileSQLite = async (fileType) => {
  try {
    if (isElectronSqliteAvailable()) {
      if (window?.electron?.sqlite?.deleteFile) {
        return await window.electron.sqlite.deleteFile(fileType)
      } else if (window?.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke('sqlite:delete-calc-file', fileType)
      }
    }
  } catch (error) {
    console.warn('[SQLite Storage] Lỗi xóa file trong SQLite, fallback IndexedDB:', error)
  }

  return await deleteArchitectureFileIDB(fileType)
}

let isMasterIpcSupported = true

/**
 * Lưu Master Registration vào SQLite
 */
export const saveMasterRegistrationSQLite = async (record) => {
  if (isMasterIpcSupported && isElectronSqliteAvailable()) {
    try {
      if (window?.electron?.sqlite?.saveMasterReg) {
        return await window.electron.sqlite.saveMasterReg(record)
      } else if (window?.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke('sqlite:save-master-reg', record)
      }
    } catch (error) {
      if (String(error?.message).includes('No handler registered')) {
        isMasterIpcSupported = false
      }
    }
  }

  const { saveMasterRegistrationIDB } = await import('./indexedDbStorage')
  return await saveMasterRegistrationIDB(record)
}

/**
 * Lấy 1 Master Registration từ SQLite theo regCode
 */
export const getMasterRegistrationSQLite = async (regCode) => {
  if (!regCode) return null
  if (isMasterIpcSupported && isElectronSqliteAvailable()) {
    try {
      if (window?.electron?.sqlite?.getMasterReg) {
        return await window.electron.sqlite.getMasterReg(regCode)
      } else if (window?.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke('sqlite:get-master-reg', regCode)
      }
    } catch (error) {
      if (String(error?.message).includes('No handler registered')) {
        isMasterIpcSupported = false
      }
    }
  }

  const { getMasterRegistrationIDB } = await import('./indexedDbStorage')
  return await getMasterRegistrationIDB(regCode)
}

/**
 * Lấy danh sách toàn bộ Master Registration từ SQLite
 */
export const getAllMasterRegistrationsSQLite = async () => {
  if (isMasterIpcSupported && isElectronSqliteAvailable()) {
    try {
      let rows = null
      if (window?.electron?.sqlite?.getAllMasterRegs) {
        rows = await window.electron.sqlite.getAllMasterRegs()
      } else if (window?.electron?.ipcRenderer) {
        rows = await window.electron.ipcRenderer.invoke('sqlite:get-all-master-regs')
      }

      if (Array.isArray(rows)) {
        return rows
      }
    } catch (error) {
      if (String(error?.message).includes('No handler registered')) {
        isMasterIpcSupported = false
      }
    }
  }

  const { getAllMasterRegistrationsIDB } = await import('./indexedDbStorage')
  return await getAllMasterRegistrationsIDB()
}

/**
 * Xóa 1 Master Registration trong SQLite
 */
export const deleteMasterRegistrationSQLite = async (regCode) => {
  if (isMasterIpcSupported && isElectronSqliteAvailable()) {
    try {
      if (window?.electron?.sqlite?.deleteMasterReg) {
        return await window.electron.sqlite.deleteMasterReg(regCode)
      } else if (window?.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke('sqlite:delete-master-reg', regCode)
      }
    } catch (error) {
      if (String(error?.message).includes('No handler registered')) {
        isMasterIpcSupported = false
      }
    }
  }

  const { deleteMasterRegistrationIDB } = await import('./indexedDbStorage')
  return await deleteMasterRegistrationIDB(regCode)
}
