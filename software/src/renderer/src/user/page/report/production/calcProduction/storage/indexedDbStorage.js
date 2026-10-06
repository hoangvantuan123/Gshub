/**
 * Quản lý lưu trữ IndexedDB cho module Tính KHSX & TKSX
 * Dùng khi ứng dụng chạy trên nền tảng Web
 */
import { openDB } from 'idb'
import { STORAGE_KEYS } from '../constants/calcConstants'

let dbPromise = null

const REQUIRED_STORES = [
  { name: STORAGE_KEYS.STORE_FILES, keyPath: 'fileType' },
  { name: STORAGE_KEYS.STORE_CALC_RESULTS, keyPath: 'id' },
  { name: STORAGE_KEYS.STORE_METADATA, keyPath: 'key' },
  { name: STORAGE_KEYS.STORE_MASTER, keyPath: 'regCode' }
]

const ensureStoresInDb = (db) => {
  REQUIRED_STORES.forEach(({ name, keyPath }) => {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name, { keyPath })
    }
  })
}

export const getCalcProductionDB = async () => {
  if (dbPromise) {
    try {
      const db = await dbPromise
      const missing = REQUIRED_STORES.some(({ name }) => !db.objectStoreNames.contains(name))
      if (!missing) {
        return db
      }
      // Missing store detected in open connection -> force close and re-upgrade
      console.warn('[IndexedDB] Missing store detected in open connection. Upgrading...')
      db.close()
      dbPromise = null
    } catch {
      dbPromise = null
    }
  }

  const openWithVersion = (version) => {
    return openDB(STORAGE_KEYS.DB_NAME, version, {
      upgrade(db) {
        ensureStoresInDb(db)
      },
      blocked() {
        console.warn('[IndexedDB] Database upgrade blocked by another connection.')
      },
      blocking() {
        console.warn('[IndexedDB] Database connection blocking a version upgrade.')
      }
    })
  }

  dbPromise = (async () => {
    let db = await openWithVersion(STORAGE_KEYS.DB_VERSION)
    const missing = REQUIRED_STORES.some(({ name }) => !db.objectStoreNames.contains(name))
    if (missing) {
      console.warn('[IndexedDB] Database opened but missing stores. Forcing schema increment...')
      const newVersion = (db.version || STORAGE_KEYS.DB_VERSION) + 1
      db.close()
      db = await openWithVersion(newVersion)
    }
    return db
  })()

  return dbPromise
}

export const resetCalcProductionDB = () => {
  if (dbPromise) {
    dbPromise.then((db) => {
      try { db.close() } catch {}
    }).catch(() => {})
    dbPromise = null
  }
}

/**
 * Lưu 1 file kiến trúc vào IndexedDB
 */
export const saveArchitectureFileIDB = async (fileType, fileData) => {
  try {
    const db = await getCalcProductionDB()
    const record = {
      fileType,
      fileName: fileData.fileName || '',
      fileSize: fileData.fileSize || 0,
      rowCount: fileData.rowCount || (fileData.data?.length || 0),
      columns: fileData.columns || [],
      data: fileData.data || [],
      uploadedAt: fileData.uploadedAt || new Date().toISOString()
    }
    await db.put(STORAGE_KEYS.STORE_FILES, record)
    return { success: true, record }
  } catch (error) {
    console.error(`[IndexedDB] Lỗi lưu file ${fileType}:`, error)
    throw error
  }
}

/**
 * Lấy tóm tắt (Metadata) của toàn bộ 4 file kiến trúc (KHÔNG trả về mảng data nặng để load tức thì)
 */
export const getAllFileSummariesIDB = async () => {
  try {
    const db = await getCalcProductionDB()
    const tx = db.transaction(STORAGE_KEYS.STORE_FILES, 'readonly')
    const store = tx.objectStore(STORAGE_KEYS.STORE_FILES)
    const files = await store.getAll()
    const result = {}
    files.forEach((f) => {
      if (f?.fileType) {
        result[f.fileType] = {
          fileType: f.fileType,
          fileName: f.fileName || '',
          fileSize: f.fileSize || 0,
          rowCount: f.rowCount || 0,
          columns: f.columns || [],
          uploadedAt: f.uploadedAt || null
        }
      }
    })
    return result
  } catch (error) {
    console.error('[IndexedDB] Lỗi lấy tóm tắt files:', error)
    return {}
  }
}

/**
 * Lấy dữ liệu 1 file kiến trúc chi tiết từ IndexedDB
 */
export const getArchitectureFileIDB = async (fileType) => {
  try {
    const db = await getCalcProductionDB()
    return await db.get(STORAGE_KEYS.STORE_FILES, fileType)
  } catch (error) {
    console.error(`[IndexedDB] Lỗi lấy file ${fileType}:`, error)
    return null
  }
}

/**
 * Lấy tất cả các file kiến trúc (dùng khi tính toán)
 */
export const getAllArchitectureFilesIDB = async () => {
  try {
    const db = await getCalcProductionDB()
    const files = await db.getAll(STORAGE_KEYS.STORE_FILES)
    const result = {}
    files.forEach((f) => {
      if (f?.fileType) {
        result[f.fileType] = f
      }
    })
    return result
  } catch (error) {
    console.error('[IndexedDB] Lỗi lấy toàn bộ files:', error)
    return {}
  }
}

/**
 * Xóa 1 file hoặc toàn bộ files trong IndexedDB
 */
export const deleteArchitectureFileIDB = async (fileType) => {
  try {
    const db = await getCalcProductionDB()
    if (fileType) {
      await db.delete(STORAGE_KEYS.STORE_FILES, fileType)
    } else {
      await db.clear(STORAGE_KEYS.STORE_FILES)
    }
    return { success: true }
  } catch (error) {
    console.error(`[IndexedDB] Lỗi xóa file ${fileType || 'ALL'}:`, error)
    throw error
  }
}

/**
 * Lưu kết quả tính toán vào IndexedDB
 */
export const saveCalculationResultIDB = async (resultId, data) => {
  try {
    const db = await getCalcProductionDB()
    await db.put(STORAGE_KEYS.STORE_CALC_RESULTS, {
      id: resultId,
      ...data,
      calculatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('[IndexedDB] Lỗi lưu kết quả tính toán:', error)
    throw error
  }
}

/**
 * Lưu đăng ký Master vào IndexedDB
 */
export const saveMasterRegistrationIDB = async (record) => {
  try {
    const db = await getCalcProductionDB()
    await db.put(STORAGE_KEYS.STORE_MASTER, record)
    return { success: true }
  } catch (error) {
    if (String(error?.message || '').includes('object stores was not found') || error?.name === 'NotFoundError') {
      console.warn('[IndexedDB] Object store not found on put. Resetting and forcing schema upgrade...')
      resetCalcProductionDB()
      const db = await getCalcProductionDB()
      await db.put(STORAGE_KEYS.STORE_MASTER, record)
      return { success: true }
    }
    console.error('[IndexedDB] Lỗi lưu đăng ký Master:', error)
    throw error
  }
}

/**
 * Lấy 1 bản ghi Master theo mã đăng ký từ IndexedDB
 */
export const getMasterRegistrationIDB = async (regCode) => {
  if (!regCode) return null
  try {
    const db = await getCalcProductionDB()
    return await db.get(STORAGE_KEYS.STORE_MASTER, regCode)
  } catch (error) {
    if (String(error?.message || '').includes('object stores was not found') || error?.name === 'NotFoundError') {
      resetCalcProductionDB()
      const db = await getCalcProductionDB()
      return await db.get(STORAGE_KEYS.STORE_MASTER, regCode)
    }
    console.error(`[IndexedDB] Lỗi lấy master record ${regCode}:`, error)
    return null
  }
}

/**
 * Lấy danh sách toàn bộ đăng ký Master từ IndexedDB
 */
export const getAllMasterRegistrationsIDB = async () => {
  try {
    const db = await getCalcProductionDB()
    const list = await db.getAll(STORAGE_KEYS.STORE_MASTER)
    return list.sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
  } catch (error) {
    if (String(error?.message || '').includes('object stores was not found') || error?.name === 'NotFoundError') {
      resetCalcProductionDB()
      try {
        const db = await getCalcProductionDB()
        const list = await db.getAll(STORAGE_KEYS.STORE_MASTER)
        return list.sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
      } catch {}
    }
    console.error('[IndexedDB] Lỗi lấy danh sách đăng ký Master:', error)
    return []
  }
}

/**
 * Xóa 1 đăng ký Master từ IndexedDB
 */
export const deleteMasterRegistrationIDB = async (regCode) => {
  try {
    const db = await getCalcProductionDB()
    await db.delete(STORAGE_KEYS.STORE_MASTER, regCode)
    return { success: true }
  } catch (error) {
    console.error('[IndexedDB] Lỗi xóa đăng ký Master:', error)
    throw error
  }
}
