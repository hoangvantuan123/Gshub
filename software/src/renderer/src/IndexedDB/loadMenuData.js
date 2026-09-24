import { openDB } from 'idb'
import CryptoJS from 'crypto-js'

const DB_NAME = 'menuDatabase'
const DB_VERSION = 1
const STORE_NAME = 'menus'

/**
 * Mở hoặc khởi tạo Menu Database trong IndexedDB
 */
export async function getMenuDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Tính toán mã băm phiên bản (Version Hash) từ chuỗi hoặc dữ liệu menu
 */
export function generateMenuVersionHash(data) {
  if (!data) return ''
  if (typeof data === 'string') {
    return CryptoJS.MD5(data).toString()
  }
  try {
    return CryptoJS.MD5(JSON.stringify(data)).toString()
  } catch {
    return `v_${Date.now()}`
  }
}

/**
 * Lưu cấu trúc Menu & Phân quyền kèm Version vào IndexedDB
 * @param {Object} menuData - Cấu trúc dữ liệu menu đã giải mã và chuẩn hóa
 * @param {string} rawRolesMenu - Chuỗi roles_menu gốc (nếu có để tính versionHash chính xác)
 */
export async function saveMenuData(menuData, rawRolesMenu = '') {
  try {
    if (!menuData) return false
    const db = await getMenuDB()

    // Tính toán versionHash từ rawRolesMenu hoặc từ nội dung permissions
    const versionHash =
      menuData.versionHash ||
      (rawRolesMenu ? generateMenuVersionHash(rawRolesMenu) : generateMenuVersionHash(menuData))

    const record = {
      id: 'active_menu',
      versionHash,
      userId: menuData.userId || localStorage.getItem('last_login_username') || '',
      updatedAt: Date.now(),
      ...menuData
    }

    await db.put(STORE_NAME, record)
    return true
  } catch (error) {
    console.warn('Lỗi khi lưu dữ liệu Menu & Version vào IndexedDB:', error)
    return false
  }
}

/**
 * Lấy toàn bộ cấu trúc Menu & Phân quyền từ IndexedDB
 */
export async function getMenuData() {
  try {
    const db = await getMenuDB()
    const record = await db.get(STORE_NAME, 'active_menu')
    return record || null
  } catch (error) {
    console.warn('Lỗi khi đọc dữ liệu Menu từ IndexedDB:', error)
    return null
  }
}

/**
 * Lấy thông tin Metadata phiên bản phân quyền hiện tại trong IndexedDB
 */
export async function getMenuMetadata() {
  try {
    const db = await getMenuDB()
    const record = await db.get(STORE_NAME, 'active_menu')
    if (!record) return null

    return {
      versionHash: record.versionHash || '',
      userId: record.userId || '',
      updatedAt: record.updatedAt || 0,
      hasData: Boolean(
        (record.settingItems && record.settingItems.length > 0) ||
        (record.transformedMenu && record.transformedMenu.length > 0)
      )
    }
  } catch (error) {
    console.warn('Lỗi khi đọc Metadata Menu từ IndexedDB:', error)
    return null
  }
}

/**
 * Xóa dữ liệu Menu & Version trong IndexedDB khi đăng xuất (Logout) hoặc đổi tài khoản
 */
export async function clearMenuData() {
  try {
    const db = await getMenuDB()
    await db.delete(STORE_NAME, 'active_menu')
    return true
  } catch (error) {
    console.warn('Lỗi khi xóa dữ liệu Menu trong IndexedDB:', error)
    return false
  }
}
