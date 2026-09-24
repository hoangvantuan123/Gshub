import { openDB } from 'idb'
import { setMemoryCache } from './loadLanguageData'

const DB_NAME = 'languageDatabase'
const DB_VERSION = 1
const STORE_NAME = 'languages'

const getDB = async () => {
  try {
    let db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'typeLanguage' })
        }
      }
    })

    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close()
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME)
        req.onsuccess = resolve
        req.onerror = resolve
        req.onblocked = resolve
      })
      db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'typeLanguage' })
          }
        }
      })
    }
    return db
  } catch (err) {
    try {
      indexedDB.deleteDatabase(DB_NAME)
    } catch (e) {}
    return await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'typeLanguage' })
        }
      }
    })
  }
}

const normalizeKey = (key) => {
  if (typeof key === 'number') {
    const map = { 6: 'vi', 2: 'en', 1: 'zh', 3: 'zh', 11: 'vi' }
    return map[key] || 'vi'
  }
  return String(key || 'vi').toLowerCase()
}

export const saveLanguageData = async (payload) => {
  try {
    const rawKey = String(payload.typeLanguage || 'vn').toLowerCase()
    const languageData = payload.languageData || []
    const versionHash = payload.versionHash || ''
    const updatedAt = Date.now()

    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Lưu theo key gốc từ server trả về (vd: 'vn')
    await store.put({
      typeLanguage: rawKey,
      languageData,
      versionHash,
      updatedAt
    })

    // Nếu là 'vn' hoặc 'vi', tự động ánh xạ chéo cả 2 key để các hàm lấy ra đều đọc được 100%
    if (rawKey === 'vn' || rawKey === 'vi') {
      const aliasKey = rawKey === 'vn' ? 'vi' : 'vn'
      await store.put({
        typeLanguage: aliasKey,
        languageData,
        versionHash,
        updatedAt
      })
    }

    await tx.done

    // Cập nhật ngay lập tức vào bộ nhớ RAM Cache để đọc tức thì
    setMemoryCache(rawKey, languageData, { versionHash, updatedAt })
    if (rawKey === 'vn' || rawKey === 'vi') {
      setMemoryCache(rawKey === 'vn' ? 'vi' : 'vn', languageData, { versionHash, updatedAt })
    }

    return true
  } catch (error) {
    console.error('saveLanguageData error:', error)
    return false
  }
}
