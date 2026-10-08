import { openDB } from 'idb'
import CryptoJS from 'crypto-js'
import decodeJWT from '../utils/decode-JWT'
import { mergeWithDefaultMenuConfig } from '../config/menuConfig'
import { buildPermissionsTree } from '../utils/buildPermissionsTree'

const DB_NAME = 'menuDatabase'
const DB_VERSION = 1
const STORE_NAME = 'menus'
const SECURE_STORAGE_SALT = 'GSHUB_MENU_SECURITY_AES_2026_@v1'

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
 * Mã hóa AES bảo mật dữ liệu Menu trước khi lưu vào IndexedDB
 */
export function encryptMenuPayload(data) {
  try {
    if (!data) return ''
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
    return CryptoJS.AES.encrypt(jsonStr, SECURE_STORAGE_SALT).toString()
  } catch (err) {
    console.warn('Lỗi mã hóa dữ liệu menu IndexedDB:', err)
    return ''
  }
}

/**
 * Giải mã AES bảo mật dữ liệu Menu khi đọc từ IndexedDB
 */
export function decryptMenuPayload(cipherText) {
  try {
    if (!cipherText || typeof cipherText !== 'string') return null
    const bytes = CryptoJS.AES.decrypt(cipherText, SECURE_STORAGE_SALT)
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
    if (!decryptedStr) return null
    return JSON.parse(decryptedStr)
  } catch (err) {
    console.warn('Lỗi giải mã dữ liệu menu IndexedDB:', err)
    return null
  }
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
 * Lưu cấu trúc Menu & Phân quyền kèm Version vào IndexedDB (được mã hóa bảo mật AES)
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

    const rawPayload = {
      settingItems: menuData.settingItems || [],
      rootMenuItems: menuData.rootMenuItems || [],
      menuItemList: menuData.menuItemList || [],
      transformedMenu: menuData.transformedMenu || [],
      permissionsTree: menuData.permissionsTree || [],
      roleTable: menuData.roleTable || [],
      userId: menuData.userId || localStorage.getItem('last_login_username') || ''
    }

    const encryptedData = encryptMenuPayload(rawPayload)

    const record = {
      id: 'active_menu',
      isEncrypted: true,
      encryptedData,
      versionHash,
      userId: rawPayload.userId,
      updatedAt: Date.now()
    }

    await db.put(STORE_NAME, record)
    return true
  } catch (error) {
    console.warn('Lỗi khi lưu dữ liệu Menu & Version vào IndexedDB:', error)
    return false
  }
}

/**
 * Giải mã và lưu trực tiếp chuỗi JWT roles_menu vào IndexedDB với mã hóa bảo mật
 * @param {string} rawRolesMenu - JWT chuỗi roles_menu
 * @param {Object} userInfo - Thông tin user
 */
export async function saveEncryptedMenuFromRolesMenu(rawRolesMenu, userInfo = {}) {
  try {
    if (!rawRolesMenu) return null
    let settingItems = []
    let rootMenuItems = []
    let menuItemList = []
    let roleTable = []

    const data = decodeJWT(rawRolesMenu)
    if (data && data.data) {
      settingItems = data?.data?.find((x) => x.menu)?.menu || data?.data[0]?.menu || []
      rootMenuItems = data?.data?.find((x) => x.rootMenu)?.rootMenu || data?.data[1]?.rootMenu || []
      menuItemList = data?.data?.find((x) => x.menuItem)?.menuItem || data?.data[2]?.menuItem || []
      roleTable = data?.data?.find((x) => x.roleTable)?.roleTable || data?.data[3]?.roleTable || []
    }

    const merged = mergeWithDefaultMenuConfig(settingItems, rootMenuItems, menuItemList)
    const permissionsTree = buildPermissionsTree(roleTable)

    const userId =
      userInfo?.UserId ||
      userInfo?.UserName ||
      userInfo?.EmpID ||
      localStorage.getItem('last_login_username') ||
      ''

    const menuPayload = {
      settingItems: merged.settingItems,
      rootMenuItems: merged.rootMenuItems,
      menuItemList: merged.menuItemList,
      transformedMenu: merged.transformedMenu,
      permissionsTree,
      roleTable,
      userId
    }

    await saveMenuData(menuPayload, rawRolesMenu)
    return menuPayload
  } catch (err) {
    console.warn('Lỗi saveEncryptedMenuFromRolesMenu:', err)
    return null
  }
}

/**
 * Lấy toàn bộ cấu trúc Menu & Phân quyền từ IndexedDB (tự động giải mã bảo mật AES)
 */
export async function getMenuData() {
  try {
    const db = await getMenuDB()
    const record = await db.get(STORE_NAME, 'active_menu')
    if (!record) return null

    // Nếu bản ghi được mã hóa AES
    if (record.isEncrypted && record.encryptedData) {
      const decrypted = decryptMenuPayload(record.encryptedData)
      if (decrypted) {
        return {
          versionHash: record.versionHash || '',
          userId: record.userId || '',
          updatedAt: record.updatedAt || 0,
          ...decrypted
        }
      }
    }

    // Fallback nếu bản ghi cũ chưa mã hóa
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

    let hasData = false
    if (record.isEncrypted && record.encryptedData) {
      hasData = true
    } else if (
      (record.settingItems && record.settingItems.length > 0) ||
      (record.transformedMenu && record.transformedMenu.length > 0)
    ) {
      hasData = true
    }

    return {
      versionHash: record.versionHash || '',
      userId: record.userId || '',
      updatedAt: record.updatedAt || 0,
      hasData
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
