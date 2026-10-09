/**
 * Quản lý lưu trữ IndexedDB cho module Tính KHSX & TKSX
 * Dùng khi ứng dụng chạy trên nền tảng Web
 */
import { openDB } from 'idb'
import { STORAGE_KEYS } from '../constants/calcConstants'

let dbPromise = null

const REQUIRED_STORES = [
  { name: STORAGE_KEYS.STORE_FILES, keyPath: 'fileType' },
  { name: STORAGE_KEYS.STORE_FILE_CHUNKS, keyPath: 'id' },
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
    dbPromise
      .then((db) => {
        try {
          db.close()
        } catch {}
      })
      .catch(() => {})
    dbPromise = null
  }
}

const CHUNK_ROW_SIZE = 2500

/**
 * Lưu 1 file kiến trúc vào IndexedDB theo từng khúc (Chunking) để không đơ UI
 */
export const saveArchitectureFileIDB = async (fileType, fileData, onProgress = null) => {
  try {
    const db = await getCalcProductionDB()
    const rows = fileData.data || []
    const totalRows = rows.length
    const totalChunks = Math.max(1, Math.ceil(totalRows / CHUNK_ROW_SIZE))

    // 1. Lưu bản ghi metadata tổng quan của file
    const metaRecord = {
      fileType,
      fileName: fileData.fileName || '',
      fileSize: fileData.fileSize || 0,
      rowCount: fileData.rowCount || totalRows,
      columns: fileData.columns || [],
      data: [], // Để rỗng trong metadata, dữ liệu thực được chia nhỏ lưu ở STORE_FILE_CHUNKS
      uploadedAt: fileData.uploadedAt || new Date().toISOString()
    }
    await db.put(STORAGE_KEYS.STORE_FILES, metaRecord)

    // 2. Xóa các chunk cũ của fileType này trong IndexedDB
    try {
      const txClear = db.transaction(STORAGE_KEYS.STORE_FILE_CHUNKS, 'readwrite')
      const chunkStore = txClear.objectStore(STORAGE_KEYS.STORE_FILE_CHUNKS)
      let cursor = await chunkStore.openCursor()
      while (cursor) {
        if (cursor.value?.fileType === fileType) {
          await cursor.delete()
        }
        cursor = await cursor.continue()
      }
      await txClear.done
    } catch (clearErr) {
      console.warn('[IndexedDB] Dọn dẹp chunk cũ:', clearErr)
    }

    // 3. Ghi dữ liệu lần lượt theo từng khúc (Chunk)
    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const startIdx = chunkIdx * CHUNK_ROW_SIZE
      const endIdx = Math.min(startIdx + CHUNK_ROW_SIZE, totalRows)
      const chunkData = rows.slice(startIdx, endIdx)

      const chunkRecord = {
        id: `${fileType}_${chunkIdx}`,
        fileType,
        chunkIndex: chunkIdx,
        rowCount: chunkData.length,
        data: chunkData
      }

      const txChunk = db.transaction(STORAGE_KEYS.STORE_FILE_CHUNKS, 'readwrite')
      await txChunk.objectStore(STORAGE_KEYS.STORE_FILE_CHUNKS).put(chunkRecord)
      await txChunk.done

      // Báo tiến trình cho UI
      const processedRows = endIdx
      const savePercent = Math.min(100, Math.round(90 + (10 * (chunkIdx + 1)) / totalChunks))
      onProgress?.({
        step: 'SAVING_CHUNKS_IDB',
        percent: savePercent,
        processedRows,
        totalRows,
        chunkIndex: chunkIdx + 1,
        totalChunks,
        message: `Đang lưu khúc ${chunkIdx + 1}/${totalChunks} (${processedRows.toLocaleString('vi-VN')}/${totalRows.toLocaleString('vi-VN')} dòng) vào CSDL...`
      })

      // Nhả luồng sự kiện cho UI render mượt mà
      await new Promise((res) => setTimeout(res, 0))
    }

    return { success: true, record: metaRecord }
  } catch (error) {
    console.error(`[IndexedDB] Lỗi lưu file chunk ${fileType}:`, error)
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
 * Lấy dữ liệu 1 file kiến trúc chi tiết từ IndexedDB (ghép các khúc chunk lại)
 */
export const getArchitectureFileIDB = async (fileType) => {
  try {
    const db = await getCalcProductionDB()
    const meta = await db.get(STORAGE_KEYS.STORE_FILES, fileType)
    if (!meta) return null

    // Đọc tất cả các chunk thuộc fileType này
    const chunks = []
    try {
      const tx = db.transaction(STORAGE_KEYS.STORE_FILE_CHUNKS, 'readonly')
      const store = tx.objectStore(STORAGE_KEYS.STORE_FILE_CHUNKS)
      let cursor = await store.openCursor()
      while (cursor) {
        if (cursor.value?.fileType === fileType) {
          chunks.push(cursor.value)
        }
        cursor = await cursor.continue()
      }
    } catch (e) {
      console.warn('[IndexedDB] Đọc chunks:', e)
    }

    if (chunks.length > 0) {
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
      const combinedData = []
      for (const ch of chunks) {
        if (Array.isArray(ch.data)) {
          combinedData.push(...ch.data)
        }
      }
      return {
        ...meta,
        data: combinedData
      }
    }

    // Fallback nếu dữ liệu cũ còn nằm trực tiếp trong meta.data
    return meta
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

    for (const f of files) {
      if (f?.fileType) {
        result[f.fileType] = await getArchitectureFileIDB(f.fileType)
      }
    }
    return result
  } catch (error) {
    console.error('[IndexedDB] Lỗi lấy toàn bộ files:', error)
    return {}
  }
}

/**
 * Xóa 1 file hoặc toàn bộ files trong IndexedDB kèm các chunks
 */
export const deleteArchitectureFileIDB = async (fileType) => {
  try {
    const db = await getCalcProductionDB()
    if (fileType) {
      await db.delete(STORAGE_KEYS.STORE_FILES, fileType)
      try {
        const tx = db.transaction(STORAGE_KEYS.STORE_FILE_CHUNKS, 'readwrite')
        const store = tx.objectStore(STORAGE_KEYS.STORE_FILE_CHUNKS)
        let cursor = await store.openCursor()
        while (cursor) {
          if (cursor.value?.fileType === fileType) {
            await cursor.delete()
          }
          cursor = await cursor.continue()
        }
        await tx.done
      } catch {}
    } else {
      await db.clear(STORAGE_KEYS.STORE_FILES)
      try {
        await db.clear(STORAGE_KEYS.STORE_FILE_CHUNKS)
      } catch {}
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
    if (
      String(error?.message || '').includes('object stores was not found') ||
      error?.name === 'NotFoundError'
    ) {
      console.warn(
        '[IndexedDB] Object store not found on put. Resetting and forcing schema upgrade...'
      )
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
    if (
      String(error?.message || '').includes('object stores was not found') ||
      error?.name === 'NotFoundError'
    ) {
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
    if (
      String(error?.message || '').includes('object stores was not found') ||
      error?.name === 'NotFoundError'
    ) {
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
