import { openDB } from 'idb'

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
    const map = { 6: 'vi', 2: 'en', 1: 'zh', 11: 'vi' }
    return map[key] || 'vi'
  }
  const str = String(key || 'vi').toLowerCase()
  if (str === 'vn') return 'vi'
  return str
}

const memoryCache = new Map()

export const setMemoryCache = (key, data, meta = null) => {
  const norm = normalizeKey(key)
  memoryCache.set(norm, {
    data: Array.isArray(data) ? data : [],
    meta: meta || { versionHash: '', updatedAt: Date.now() }
  })
}

export const clearMemoryCache = () => {
  memoryCache.clear()
}

export const handleDbCorruptionOrLogout = () => {
  console.warn('Language database issue detected, resetting cached language DB...')
  clearMemoryCache()
  try {
    indexedDB.deleteDatabase(DB_NAME)
  } catch (e) {
    console.error('Error resetting language database:', e)
  }
}

export const getLanguageData = async (typeLanguage = 'vn') => {
  const key = normalizeKey(typeLanguage)
  if (memoryCache.has(key)) {
    return memoryCache.get(key).data || []
  }

  try {
    const rawKey = String(typeLanguage || 'vn').toLowerCase()
    const db = await getDB()
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
      return []
    }
    const record =
      (await db.get(STORE_NAME, key)) ||
      (await db.get(STORE_NAME, rawKey)) ||
      (key === 'vi' ? await db.get(STORE_NAME, 'vn') : null) ||
      (key === 'vn' ? await db.get(STORE_NAME, 'vi') : null)

    const data = record && Array.isArray(record.languageData) ? record.languageData : []
    const meta = record
      ? { versionHash: record.versionHash || '', updatedAt: record.updatedAt || 0 }
      : null
    setMemoryCache(key, data, meta)
    return data
  } catch (error) {
    console.warn('Could not load language data from IndexedDB (fallback to default):', error)
    return []
  }
}

export const getLanguageMetadata = async (typeLanguage = 'vn') => {
  const key = normalizeKey(typeLanguage)
  if (memoryCache.has(key) && memoryCache.get(key).meta) {
    return memoryCache.get(key).meta
  }

  try {
    const rawKey = String(typeLanguage || 'vn').toLowerCase()
    const db = await getDB()
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
      return null
    }
    const record =
      (await db.get(STORE_NAME, key)) ||
      (await db.get(STORE_NAME, rawKey)) ||
      (key === 'vi' ? await db.get(STORE_NAME, 'vn') : null) ||
      (key === 'vn' ? await db.get(STORE_NAME, 'vi') : null)

    if (record) {
      const meta = { versionHash: record.versionHash || '', updatedAt: record.updatedAt || 0 }
      const data = Array.isArray(record.languageData) ? record.languageData : []
      setMemoryCache(key, data, meta)
      return meta
    }
    return null
  } catch (error) {
    return null
  }
}

export const hasLanguageData = async (typeLanguage = 'vn') => {
  const data = await getLanguageData(typeLanguage)
  return Array.isArray(data) && data.length > 0
}
