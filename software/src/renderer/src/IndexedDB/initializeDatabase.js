import { openDB } from 'idb'
import { getMenuDB } from './loadMenuData'
import { getApiLogDB } from './loadApiLogData'

export const initializeDatabase = async () => {
  try {
    const db = await openDB('languageDatabase', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('languages')) {
          db.createObjectStore('languages', { keyPath: 'typeLanguage' })
        }
      }
    })

    // Khởi tạo trước database chứa cấu trúc menu trong IndexedDB
    await getMenuDB().catch((err) => console.warn('Menu database init warning:', err))

    // Khởi tạo database lưu vết thông báo & API Log trong IndexedDB
    await getApiLogDB().catch((err) => console.warn('API Log database init warning:', err))

    // Khởi tạo database lưu trữ 4 file kiến trúc KHSX & TKSX
    import('../user/page/report/production/calcProduction/storage/indexedDbStorage')
      .then((m) => m.getCalcProductionDB())
      .catch((err) => console.warn('CalcProduction DB init warning:', err))

    return db
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}
