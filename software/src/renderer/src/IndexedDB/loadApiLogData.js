import { openDB } from 'idb'
import { getMenuData } from './loadMenuData'
import { getLanguageData } from './loadLanguageData'
import { languages } from '../i18n/langs'

const DB_NAME = 'apiLogDatabase'
const DB_VERSION = 1
const STORE_NAME = 'api_logs'
const MAX_LOGS_CAPACITY = 5000 // Giữ tối đa 5000 log gần nhất để tối ưu dung lượng IndexedDB

// Bộ đệm từ điển ngôn ngữ đăng ký từ IndexedDB (languageDatabase)
const dbLanguageDictCache = new Map()

/**
 * Nạp từ điển ngôn ngữ đăng ký trong hệ thống (từ IndexedDB)
 */
export async function loadSystemLanguageDictFromDB() {
  try {
    let currentLang = 'vi'
    try {
      const rawLang =
        localStorage.getItem('language_user') ||
        localStorage.getItem('lang') ||
        localStorage.getItem('language')
      if (rawLang) {
        if (rawLang === '2' || rawLang === '"2"' || rawLang === 'en') currentLang = 'en'
        else if (rawLang === '1' || rawLang === '"1"' || rawLang === 'zh') currentLang = 'zh'
        else currentLang = rawLang.replace(/"/g, '') || 'vi'
      }
    } catch (e) {}

    const normKey = String(currentLang).toLowerCase()
    const data = await getLanguageData(currentLang)

    if (Array.isArray(data) && data.length > 0) {
      const dict = new Map()
      for (const item of data) {
        if (item?.WordSeq && item?.Word) {
          dict.set(String(item.WordSeq), item.Word)
        }
        if (item?.WordCode && item?.Word) {
          dict.set(String(item.WordCode), item.Word)
        }
        if (item?.WordId && item?.Word) {
          dict.set(String(item.WordId), item.Word)
        }
      }
      dbLanguageDictCache.set(normKey, dict)
      return dict
    }
  } catch (err) {
    console.debug('Không thể nạp từ điển ngôn ngữ từ IndexedDB:', err)
  }
  return null
}

// Khởi tạo nạp từ điển IndexedDB tự động khi chạy
if (typeof window !== 'undefined') {
  loadSystemLanguageDictFromDB().catch(() => {})
  window.addEventListener('language-changed', () => {
    loadSystemLanguageDictFromDB().catch(() => {})
  })
}

/**
 * Tự động dịch các mã thông báo/mã lỗi số (ví dụ: 1001, 1002, 1003...) sang câu thông báo hoàn chỉnh
 * Ưu tiên lấy trực tiếp từ bản dịch đăng ký trong IndexedDB (languageDatabase), fallback về langs.js
 */
export function translateErrorCodeOrMessage(message, errorCode = null) {
  if (!message && !errorCode) return ''

  let currentLang = 'vi'
  try {
    const rawLang =
      localStorage.getItem('language_user') ||
      localStorage.getItem('lang') ||
      localStorage.getItem('language')
    if (rawLang) {
      if (rawLang === '2' || rawLang === '"2"' || rawLang === 'en') currentLang = 'en'
      else if (rawLang === '1' || rawLang === '"1"' || rawLang === 'zh') currentLang = 'zh'
      else currentLang = rawLang.replace(/"/g, '') || 'vi'
    }
  } catch (e) {}

  const normKey = String(currentLang).toLowerCase()
  const dbDict = dbLanguageDictCache.get(normKey)
  const fallbackDict = languages[currentLang] || languages.vi || {}

  const msgCandidate = message ? String(message).trim() : ''
  const codeCandidate = errorCode ? String(errorCode).trim() : ''

  // 1. Kiểm tra trong từ điển IndexedDB của hệ thống trước
  if (dbDict) {
    for (const key of [msgCandidate, codeCandidate]) {
      if (!key) continue
      if (dbDict.has(key)) return dbDict.get(key)
    }

    const match = msgCandidate.match(/\b(100[1-9]|10[1-9][0-9])\b/)
    if (match && match[1] && dbDict.has(match[1])) {
      return dbDict.get(match[1])
    }
  }

  // 2. Fallback sang từ điển tĩnh trong langs.js
  for (const key of [msgCandidate, codeCandidate]) {
    if (!key) continue
    if (fallbackDict[key]) return fallbackDict[key]
    if (languages.vi && languages.vi[key]) return languages.vi[key]
  }

  const matchFallback = msgCandidate.match(/\b(100[1-9]|10[1-9][0-9])\b/)
  if (matchFallback && matchFallback[1]) {
    const numCode = matchFallback[1]
    if (fallbackDict[numCode]) return fallbackDict[numCode]
    if (languages.vi && languages.vi[numCode]) return languages.vi[numCode]
  }

  return msgCandidate || codeCandidate || ''
}

/**
 * Khởi tạo Database lưu vết Thông báo & Lịch sử API trong IndexedDB
 */
export async function getApiLogDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('route', 'route', { unique: false })
        store.createIndex('menuName', 'menuName', { unique: false })
        store.createIndex('logType', 'logType', { unique: false })
        store.createIndex('source', 'source', { unique: false })
      }
    }
  })
}

// Bảng ánh xạ các Route hệ thống chuẩn sang Tên menu và Phân hệ cha
const SYSTEM_ROUTE_MAP = {
  'system-settings/structure/menus': {
    menuName: 'Đăng ký Menu',
    parentMenu: 'Cấu trúc hệ thống'
  },
  'system-settings/structure/modules': {
    menuName: 'Đăng ký Phân hệ',
    parentMenu: 'Cấu trúc hệ thống'
  },
  'system-settings/users/user-management': {
    menuName: 'Quản lý người dùng',
    parentMenu: 'Quản trị hệ thống'
  },
  'system-settings/role-groups': {
    menuName: 'Nhóm quyền hệ thống',
    parentMenu: 'Quản trị hệ thống'
  },
  'system-settings/roles/role-management': {
    menuName: 'Quản lý vai trò',
    parentMenu: 'Quản trị hệ thống'
  },
  'system-settings/roles/permission-assignment': {
    menuName: 'Phân quyền chức năng',
    parentMenu: 'Quản trị hệ thống'
  },
  'system-settings/dictionaries/languages': {
    menuName: 'Quản lý ngôn ngữ',
    parentMenu: 'Từ điển hệ thống'
  },
  'system-settings/dictionaries/terms': {
    menuName: 'Quản lý từ điển / Thuật ngữ',
    parentMenu: 'Từ điển hệ thống'
  },
  notifications: {
    menuName: 'Thông báo hệ thống',
    parentMenu: 'Hệ thống'
  },
  home: {
    menuName: 'Trang chủ',
    parentMenu: 'Hệ thống'
  }
}

// Cache bộ nhớ tạm để giải mã nhanh
let menuRouteCache = null

/**
 * Lấy đường dẫn route hiện tại trong cả HashRouter và BrowserRouter
 */
export function getCurrentRoute() {
  if (typeof window === 'undefined') return ''
  if (window.location.hash) {
    return window.location.hash.replace(/^#/, '').split('?')[0]
  }
  return (window.location.pathname || '').split('?')[0]
}

/**
 * Chuẩn hóa chuỗi đường dẫn route để so khớp chính xác
 */
export function cleanRoutePath(path) {
  if (!path) return ''
  return String(path)
    .replace(/^#/, '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/erp\/u\//, '')
    .replace(/^\/erp\//, '')
    .replace(/^\/+|\/+$/g, '')
    .split('?')[0]
}

/**
 * Phân giải Route URL thành Tên Menu và Nhóm Phân hệ
 */
export async function resolveMenuFromRoute(routePath) {
  if (!routePath) {
    routePath = getCurrentRoute()
  }
  const rawPath = routePath || ''
  const cleanPath = cleanRoutePath(rawPath)

  // 1. Kiểm tra ánh xạ trực tiếp trong bảng Route chuẩn
  if (SYSTEM_ROUTE_MAP[cleanPath]) {
    return {
      ...SYSTEM_ROUTE_MAP[cleanPath],
      route: rawPath
    }
  }

  try {
    if (!menuRouteCache) {
      const menuRecord = await getMenuData()
      menuRouteCache = {}

      // Duyệt qua settingItems từ IndexedDB
      if (Array.isArray(menuRecord?.settingItems)) {
        menuRecord.settingItems.forEach((item) => {
          const itemKey = cleanRoutePath(item.Link || item.Key || item.MenuKey || '')
          if (itemKey) {
            menuRouteCache[itemKey] = {
              menuName: item.Label || item.MenuLabel || itemKey,
              parentMenu: item.ParentLabel || 'Hệ thống'
            }
          }
        })
      }

      // Duyệt qua transformedMenu từ IndexedDB
      if (Array.isArray(menuRecord?.transformedMenu)) {
        menuRecord.transformedMenu.forEach((group) => {
          const groupTitle = group.MenuLabel || group.MenuName || 'Hệ thống'
          if (Array.isArray(group.subMenu)) {
            group.subMenu.forEach((sub) => {
              const subKey = cleanRoutePath(
                sub.MenuKey || sub.MenuLink || sub.Path || sub.Url || ''
              )
              if (subKey) {
                menuRouteCache[subKey] = {
                  menuName: sub.MenuLabel || sub.MenuName || subKey,
                  parentMenu: groupTitle
                }
              }

              if (Array.isArray(sub.menuItems)) {
                sub.menuItems.forEach((mi) => {
                  const miKey = cleanRoutePath(mi.MenuKey || mi.MenuLink || '')
                  if (miKey) {
                    menuRouteCache[miKey] = {
                      menuName: mi.MenuLabel || mi.MenuName || miKey,
                      parentMenu: sub.MenuLabel || groupTitle
                    }
                  }
                })
              }
            })
          }
        })
      }
    }

    if (menuRouteCache && menuRouteCache[cleanPath]) {
      return {
        ...menuRouteCache[cleanPath],
        route: rawPath
      }
    }

    // Nếu không khớp trực tiếp, thử khớp tiền tố hoặc hậu tố
    if (menuRouteCache) {
      for (const [cachedPath, info] of Object.entries(menuRouteCache)) {
        if (cleanPath.endsWith(cachedPath) || cachedPath.endsWith(cleanPath)) {
          return {
            ...info,
            route: rawPath
          }
        }
      }
    }
  } catch (e) {
    console.warn('Lỗi phân giải menu từ route:', e)
  }

  // Tên fallback dựa trên pathname
  const segments = cleanPath.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] || 'Trang chủ'
  return {
    menuName: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1),
    parentMenu: segments.length > 1 ? segments[0].toUpperCase() : 'Hệ thống',
    route: rawPath
  }
}

/**
 * Lấy thông tin user hiện tại đang đăng nhập
 */
function getCurrentUserInfo() {
  try {
    const raw = localStorage.getItem('userInfo')
    if (raw) {
      const parsed = JSON.parse(raw)
      const uName = parsed.UserName || parsed.UserId || parsed.id || 'anonymous'
      return {
        userId: uName,
        userName: parsed.FullName || parsed.UserFullName || uName,
        userEmail: parsed.Email || '',
        userRole:
          parsed.RoleName ||
          parsed.Role ||
          (uName === 'admin' ? 'Quản trị viên (Admin)' : 'Người dùng hệ thống')
      }
    }
  } catch (err) {
    console.debug('Could not read user info for logging:', err)
  }
  return {
    userId: localStorage.getItem('last_login_username') || 'anonymous',
    userName: 'Chưa đăng nhập',
    userEmail: '',
    userRole: 'Khách'
  }
}

/**
 * Phân tích hành động nghiệp vụ từ HTTP Method và Endpoint URL
 */
function inferActionName(method, url) {
  const upperMethod = (method || 'GET').toUpperCase()
  const lowerUrl = (url || '').toLowerCase()

  if (lowerUrl.includes('login') || lowerUrl.includes('auth')) return 'Xác thực / Đăng nhập'
  if (lowerUrl.includes('logout')) return 'Đăng xuất'
  if (lowerUrl.includes('export')) return 'Xuất dữ liệu'
  if (lowerUrl.includes('import')) return 'Nhập dữ liệu'
  if (lowerUrl.includes('upload')) return 'Tải tệp lên'
  if (lowerUrl.includes('download')) return 'Tải tệp xuống'
  if (lowerUrl.includes('search') || lowerUrl.includes('find')) return 'Tìm kiếm tra cứu'
  if (lowerUrl.includes('permission') || lowerUrl.includes('role')) return 'Phân quyền hệ thống'

  switch (upperMethod) {
    case 'POST':
      return 'Tạo mới / Thực hiện tác vụ'
    case 'PUT':
    case 'PATCH':
      return 'Cập nhật dữ liệu'
    case 'DELETE':
      return 'Xóa dữ liệu'
    case 'GET':
      return 'Truy vấn danh sách / Chi tiết'
    default:
      return upperMethod
  }
}

/**
 * Đánh giá tốc độ phản hồi
 */
function evaluateSpeed(durationMs) {
  if (durationMs < 300) return { label: 'Rất nhanh', status: 'fast' }
  if (durationMs < 1000) return { label: 'Bình thường', status: 'normal' }
  if (durationMs < 3000) return { label: 'Chậm', status: 'slow' }
  return { label: 'Rất chậm', status: 'very_slow' }
}

// Danh sách các pattern URL tài nguyên tĩnh, telemetry, ping cần bỏ qua
const IGNORED_URL_PATTERNS = [
  /\.(js|jsx|ts|tsx|css|map|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)(\?.*)?$/i,
  /\/locales\/.*\.(json|js)/i,
  /\/i18n\/.*\.(json|js)/i,
  /@vite/i,
  /@fs/i,
  /node_modules/i,
  /hot-update/i,
  /socket\.io/i,
  /1\.1\.1\.1/i,
  /cloudflare\.com/i,
  /chrome-extension:/i,
  /\/ping$/i,
  /\/health$/i,
  /\/heartbeat$/i,
  /\/favicon\.ico/i
]

// Danh sách các thông điệp bị hủy hoặc không có giá trị thông báo
const IGNORED_MESSAGE_PATTERNS = [
  /canceled/i,
  /cancelled/i,
  /abort/i,
  /ERR_CANCELED/i,
  /^ok$/i,
  /^success$/i,
  /^true$/i,
  /^null$/i,
  /^undefined$/i,
  /^\[object Object\]$/i
]

/**
 * Kiểm tra xem bản ghi log có bị lọc bỏ hay không
 */
export function shouldFilterOutLog(logEntry) {
  if (!logEntry || typeof logEntry !== 'object') return true

  // 1. Chỉ lưu khi thực sự có trạng thái lỗi (error), cảnh báo (warning) hoặc HTTP status >= 400 hoặc 0
  const isErrorOrWarning =
    logEntry.status === 'error' ||
    logEntry.status === 'warning' ||
    !logEntry.isSuccess ||
    (logEntry.httpStatus && (logEntry.httpStatus >= 400 || logEntry.httpStatus === 0))

  if (!isErrorOrWarning) {
    return true
  }

  // 2. Bỏ qua các URL tĩnh, ping, CDN hoặc dev HMR
  const url = String(logEntry.url || '').trim()
  if (url && IGNORED_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return true
  }

  // 3. Trích xuất thông điệp để lọc bỏ các request bị cancel hoặc vô nghĩa
  let msg = logEntry.message
  if (!msg && logEntry.responseData) {
    if (typeof logEntry.responseData === 'string') {
      msg = logEntry.responseData
    } else if (typeof logEntry.responseData === 'object') {
      msg =
        logEntry.responseData.message ||
        logEntry.responseData.msg ||
        logEntry.responseData.error ||
        logEntry.responseData.error_description
    }
  }

  const msgStr = String(msg || '').trim()
  if (!msgStr && (!logEntry.httpStatus || logEntry.httpStatus < 400)) {
    return true
  }

  if (msgStr && IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(msgStr))) {
    return true
  }

  return false
}

// Bộ đệm chống trùng lặp log trong 3 giây (tránh lưu 2-3 lần khi nhiều interceptor cùng bắt lỗi)
const recentLogsDedupeMap = new Map()

/**
 * Lưu bản ghi thông báo Cảnh báo / Lỗi API vào IndexedDB
 * (Áp dụng bộ lọc chuẩn hóa nghiêm ngặt, chỉ lưu lỗi thực sự, loại bỏ spam và trùng lặp)
 * @param {Object} logEntry - Chi tiết thông tin phản hồi lỗi hoặc cảnh báo
 */
export async function saveApiLog(logEntry) {
  try {
    // 1. Kiểm tra qua bộ lọc tiêu chuẩn
    if (shouldFilterOutLog(logEntry)) {
      return null
    }

    if (dbLanguageDictCache.size === 0) {
      await loadSystemLanguageDictFromDB()
    }

    const db = await getApiLogDB()
    const user = getCurrentUserInfo()
    const activeRoute = logEntry.route || getCurrentRoute()
    const routeInfo = await resolveMenuFromRoute(activeRoute)
    const actionName =
      logEntry.action ||
      (logEntry.url ? inferActionName(logEntry.method, logEntry.url) : 'Thao tác hệ thống')

    // 2. Trích xuất thông điệp chi tiết & Việt hóa ngữ cảnh rõ ràng
    let messageText = logEntry.message || ''
    if (!messageText && logEntry.responseData) {
      if (typeof logEntry.responseData === 'string') {
        messageText = logEntry.responseData
      } else if (typeof logEntry.responseData === 'object') {
        messageText =
          logEntry.responseData.message ||
          logEntry.responseData.msg ||
          logEntry.responseData.error ||
          logEntry.responseData.error_description
      }
    }

    const isConnRefused =
      typeof messageText === 'string' &&
      (messageText.includes('actively refused') ||
        messageText.includes('Error while dialing: dial tcp') ||
        messageText.includes('connectex') ||
        messageText.includes('ECONNREFUSED') ||
        messageText.includes('connection error:'))

    const isNetworkError =
      !messageText ||
      isConnRefused ||
      messageText === 'Network Error' ||
      messageText.toLowerCase().includes('network error') ||
      messageText.toLowerCase().includes('failed to fetch') ||
      logEntry.errorCode === 'ERR_NETWORK' ||
      logEntry.errorCode === 'ECONNREFUSED'

    if (isConnRefused) {
      const portMatch = messageText.match(/127\.0\.0\.1:([0-9]{4,5})|:([0-9]{4,5})/)
      const portStr = portMatch ? ` (Cổng ${portMatch[1] || portMatch[2]})` : ''
      messageText = `Không thể kết nối đến dịch vụ hệ thống${portStr} khi thực hiện ${actionName} - Dịch vụ chưa được khởi chạy hoặc bị từ chối kết nối.`
    } else if (isNetworkError) {
      const targetName = routeInfo.menuName ? `"${routeInfo.menuName}"` : 'hệ thống'
      messageText = `Không thể kết nối máy chủ khi thực hiện ${actionName} (${targetName})`
    } else {
      const candidateCode =
        logEntry.errorCode ||
        logEntry.responseData?.error_code ||
        logEntry.responseData?.code ||
        null
      const translated = translateErrorCodeOrMessage(messageText, candidateCode)
      if (translated) {
        messageText = translated
      } else if (!messageText) {
        messageText = logEntry.httpStatus
          ? `Máy chủ phản hồi mã ${logEntry.httpStatus}`
          : 'Yêu cầu phát sinh cảnh báo / lỗi từ hệ thống'
      }
    }

    // 3. Chống trùng lặp thông minh (Lỗi kết nối / mạng chặn 30s kể cả khi F5 reload trang, lỗi khác 3s)
    const dedupeWindow = isNetworkError || isConnRefused ? 30000 : 3000
    const dedupeKey = `${logEntry.url || logEntry.route || ''}_${logEntry.status || 'error'}_${logEntry.httpStatus || 0}_${isNetworkError ? 'NET_ERR' : String(messageText).trim().substring(0, 80)}`
    const nowTimestamp = Date.now()

    // 3.1 Kiểm tra bộ đệm RAM
    if (recentLogsDedupeMap.has(dedupeKey)) {
      const lastTime = recentLogsDedupeMap.get(dedupeKey)
      if (nowTimestamp - lastTime < dedupeWindow) {
        return null
      }
    }
    recentLogsDedupeMap.set(dedupeKey, nowTimestamp)

    // 3.2 Kiểm tra sessionStorage để chống spam khi người dùng F5 / reload lại trang
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessionKey = `sys_dedupe_${dedupeKey}`
        const lastSessionTime = Number(sessionStorage.getItem(sessionKey)) || 0
        if (nowTimestamp - lastSessionTime < dedupeWindow) {
          return null
        }
        sessionStorage.setItem(sessionKey, String(nowTimestamp))
      }
    } catch (e) {}

    // Tự động dọn dẹp bộ đệm sau 30s
    if (recentLogsDedupeMap.size > 100) {
      for (const [k, v] of recentLogsDedupeMap.entries()) {
        if (nowTimestamp - v > 30000) {
          recentLogsDedupeMap.delete(k)
        }
      }
    }

    const durationMs = logEntry.durationMs !== undefined ? Number(logEntry.durationMs) : 0
    const speed = evaluateSpeed(durationMs)
    const now = new Date()

    const isFromApi = Boolean(
      logEntry.url ||
      (logEntry.httpStatus && logEntry.httpStatus > 0) ||
      logEntry.logType?.startsWith('API_') ||
      logEntry.logType?.startsWith('FETCH_')
    )
    const source = isFromApi ? 'SERVER_API' : 'CLIENT_UI'
    const sourceLabel = isFromApi ? 'Máy chủ' : 'Nhập liệu giao diện'

    let logType = logEntry.logType || (isFromApi ? 'API_ERROR' : 'UI_VALIDATION_ERROR')
    if (isNetworkError && isFromApi) {
      logType = 'FETCH_NETWORK_ERROR'
    }

    let logTypeName = 'Lỗi hệ thống'
    if (logType === 'API_BUSINESS_ERROR') logTypeName = 'Lỗi xử lý dữ liệu'
    else if (logType === 'API_ERROR') logTypeName = 'Lỗi phản hồi máy chủ'
    else if (logType === 'FETCH_NETWORK_ERROR') logTypeName = 'Mất kết nối máy chủ'
    else if (logType === 'UI_VALIDATION_ERROR') logTypeName = 'Lỗi kiểm tra nhập liệu'
    else if (logType === 'UI_NOTIFICATION') logTypeName = 'Thông báo'
    else if (logType === 'WARNING') logTypeName = 'Cảnh báo hệ thống'

    const targetRoute = activeRoute || routeInfo.route || ''
    const targetEndpoint = logEntry.url ? new URL(logEntry.url, 'http://localhost').pathname : ''

    const record = {
      timestamp: Date.now(),
      createdAt: now.toISOString(),
      formattedTime: now.toLocaleString('vi-VN'),

      // Phân nhóm nguồn gốc
      source,
      sourceLabel,
      logType,
      logTypeName,
      categoryLabel: logTypeName,

      // Thông tin người thực hiện
      userId: logEntry.userId || user.userId,
      userName: logEntry.userName || user.userName,
      userRole: logEntry.userRole || user.userRole,

      // Thông tin Menu & Phân hệ
      route: targetRoute,
      menuName: logEntry.menuName || routeInfo.menuName,
      parentMenu: logEntry.parentMenu || routeInfo.parentMenu,

      // Thông tin Chức năng / Hành động
      action:
        logEntry.action ||
        (isFromApi
          ? inferActionName(logEntry.method, logEntry.url)
          : 'Kiểm tra tính hợp lệ dữ liệu'),
      method: isFromApi ? (logEntry.method || 'GET').toUpperCase() : 'UI_EVENT',
      endpoint: targetEndpoint,

      // Trạng thái & Mã phản hồi
      status: logEntry.status || 'error',
      isSuccess: false,
      httpStatus: isFromApi ? logEntry.httpStatus || 500 : 0,
      errorCode: logEntry.errorCode || logEntry.responseData?.error_code || null,

      // Tốc độ phản hồi (ms)
      durationMs,
      speedLabel: isFromApi ? speed.label : 'Tức thì',
      speedStatus: isFromApi ? speed.status : 'fast',

      // Thông báo chi tiết
      message: messageText,
      isRead: Boolean(logEntry.isRead || false),
      responseData:
        logEntry.responseData && typeof logEntry.responseData === 'object'
          ? logEntry.responseData
          : null,
      platform: 'ELECTRON_SECURE_DESKTOP'
    }

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // 3.3 Kiểm tra bản ghi mới nhất trong DB: Nếu cùng loại lỗi trong vòng 30s -> cập nhật timestamp thay vì tạo mới
    try {
      const timeIndex = store.index('timestamp')
      const recentCursor = await timeIndex.openCursor(null, 'prev')
      if (recentCursor && recentCursor.value) {
        const lastRec = recentCursor.value
        const isSameTarget = lastRec.route === targetRoute && lastRec.endpoint === targetEndpoint
        const isSameMsg = lastRec.message === messageText
        const isWithinWindow = nowTimestamp - lastRec.timestamp < dedupeWindow

        if (isSameTarget && (isSameMsg || isNetworkError) && isWithinWindow) {
          lastRec.timestamp = nowTimestamp
          lastRec.formattedTime = now.toLocaleString('vi-VN')
          lastRec.createdAt = now.toISOString()
          await recentCursor.update(lastRec)
          await tx.done
          return lastRec
        }
      }
    } catch (e) {
      console.debug('Cursor dedupe check skipped:', e)
    }

    const id = await store.add(record)
    record.id = id

    // Tự động dọn dẹp nếu vượt quá MAX_LOGS_CAPACITY
    const count = await store.count()
    if (count > MAX_LOGS_CAPACITY + 100) {
      let cursor = await store.openCursor()
      let deleted = 0
      const itemsToDelete = count - MAX_LOGS_CAPACITY
      while (cursor && deleted < itemsToDelete) {
        await cursor.delete()
        deleted++
        cursor = await cursor.continue()
      }
    }

    await tx.done

    // Kích hoạt custom event thông báo toàn app
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('API_LOG_SAVED', {
          detail: record
        })
      )
    }

    return record
  } catch (error) {
    console.warn('Lỗi ghi vết lỗi/cảnh báo API vào IndexedDB:', error)
    return null
  }
}

/**
 * Lấy danh sách lịch sử log thông báo API từ IndexedDB kèm bộ lọc & phân trang
 */
export async function getApiLogs({
  limit = 50,
  page = 1,
  status = null,
  source = null,
  logType = null,
  menuName = null,
  search = null,
  userId = null,
  route = null
} = {}) {
  try {
    const db = await getApiLogDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const allRecords = await store.getAll()

    // Sắp xếp mới nhất lên đầu
    let results = allRecords.sort((a, b) => b.timestamp - a.timestamp)

    // Lọc theo Route (nếu có)
    if (route && route !== 'all') {
      const targetCleanRoute = cleanRoutePath(route)
      if (targetCleanRoute) {
        results = results.filter((r) => {
          const logCleanRoute = cleanRoutePath(r.route)
          if (!logCleanRoute) return false
          return (
            logCleanRoute === targetCleanRoute ||
            logCleanRoute.endsWith(targetCleanRoute) ||
            targetCleanRoute.endsWith(logCleanRoute)
          )
        })
      }
    }

    // Lọc theo Nguồn gốc (SERVER_API / CLIENT_UI)
    if (source && source !== 'all') {
      results = results.filter((r) => r.source === source)
    }

    // Lọc theo Kiểu log (logType)
    if (logType && logType !== 'all') {
      results = results.filter((r) => r.logType === logType)
    }

    // Lọc theo trạng thái (error / warning)
    if (status && status !== 'all') {
      results = results.filter((r) => r.status === status)
    }

    // Lọc theo Menu
    if (menuName && menuName !== 'all') {
      results = results.filter((r) => r.menuName === menuName || r.parentMenu === menuName)
    }

    // Lọc theo User
    if (userId) {
      results = results.filter((r) => r.userId === userId)
    }

    // Tìm kiếm theo từ khóa thông báo, URL, menu, phân hệ, hành động
    if (search) {
      const q = search.toLowerCase().trim()
      results = results.filter(
        (r) =>
          r.message?.toLowerCase().includes(q) ||
          r.menuName?.toLowerCase().includes(q) ||
          r.parentMenu?.toLowerCase().includes(q) ||
          r.endpoint?.toLowerCase().includes(q) ||
          r.route?.toLowerCase().includes(q) ||
          r.action?.toLowerCase().includes(q) ||
          r.logTypeName?.toLowerCase().includes(q) ||
          String(r.httpStatus).includes(q)
      )
    }

    const total = results.length
    const startIndex = (page - 1) * limit
    const paginated = results.slice(startIndex, startIndex + limit)

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: paginated
    }
  } catch (error) {
    console.warn('Lỗi đọc danh sách log từ IndexedDB:', error)
    return { total: 0, page: 1, limit, totalPages: 0, data: [] }
  }
}

/**
 * Thống kê tổng quan trạng thái thông báo và lỗi từ IndexedDB (có thể lọc theo route)
 */
export async function getApiLogStats({ route = null } = {}) {
  try {
    const db = await getApiLogDB()
    let records = await db.getAll(STORE_NAME)

    // Lọc theo route nếu được chỉ định
    if (route && route !== 'all') {
      const targetCleanRoute = cleanRoutePath(route)
      if (targetCleanRoute) {
        records = records.filter((r) => {
          const logCleanRoute = cleanRoutePath(r.route)
          if (!logCleanRoute) return false
          return (
            logCleanRoute === targetCleanRoute ||
            logCleanRoute.endsWith(targetCleanRoute) ||
            targetCleanRoute.endsWith(logCleanRoute)
          )
        })
      }
    }

    const total = records.length
    let unreadCount = 0
    let serverApiErrorCount = 0
    let clientUiErrorCount = 0
    let warningCount = 0

    records.forEach((r) => {
      if (!r.isRead) unreadCount++
      if (r.source === 'SERVER_API') serverApiErrorCount++
      else if (r.source === 'CLIENT_UI') clientUiErrorCount++
      if (r.status === 'warning') warningCount++
    })

    return {
      total,
      unreadCount,
      serverApiErrorCount,
      clientUiErrorCount,
      warningCount
    }
  } catch (error) {
    console.warn('Lỗi thống kê API log IndexedDB:', error)
    return {
      total: 0,
      unreadCount: 0,
      serverApiErrorCount: 0,
      clientUiErrorCount: 0,
      warningCount: 0
    }
  }
}

/**
 * Xóa sạch toàn bộ log thông báo trong IndexedDB
 */
export async function clearApiLogs() {
  try {
    const db = await getApiLogDB()
    await db.clear(STORE_NAME)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('API_LOG_DELETED', { detail: { all: true } }))
    }
    return true
  } catch (error) {
    console.warn('Lỗi khi xóa API log IndexedDB:', error)
    return false
  }
}

/**
 * Xóa các bản ghi log theo danh sách ID được tích chọn
 * @param {Array<number>} ids - Danh sách ID cần xóa
 */
export async function deleteApiLogsByIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return true
  try {
    const db = await getApiLogDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const id of ids) {
      if (id !== undefined && id !== null) {
        await store.delete(id)
        const numId = Number(id)
        if (!isNaN(numId)) {
          await store.delete(numId)
        }
        await store.delete(String(id))
      }
    }
    await tx.done
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('API_LOG_DELETED', { detail: { ids } }))
    }
    return true
  } catch (error) {
    console.warn('Lỗi khi xóa log theo IDs:', error)
    return false
  }
}

/**
 * Xóa toàn bộ bản ghi log thuộc về một route cụ thể
 * @param {string} route - Đường dẫn route cần xóa
 */
export async function deleteApiLogsByRoute(route) {
  if (!route) return true
  try {
    const targetCleanRoute = cleanRoutePath(route)
    if (!targetCleanRoute) return true
    const db = await getApiLogDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    let cursor = await store.openCursor()
    while (cursor) {
      const logCleanRoute = cleanRoutePath(cursor.value.route)
      if (
        logCleanRoute === targetCleanRoute ||
        logCleanRoute.endsWith(targetCleanRoute) ||
        targetCleanRoute.endsWith(logCleanRoute)
      ) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }
    await tx.done
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('API_LOG_DELETED', { detail: { route } }))
    }
    return true
  } catch (error) {
    console.warn('Lỗi khi xóa log theo route:', error)
    return false
  }
}

/**
 * Cập nhật trạng thái Đã đọc / Chưa đọc của một log theo ID
 * @param {number|string} id - ID của bản ghi log
 * @param {boolean} isRead - Trạng thái đã đọc (true) hay chưa đọc (false)
 */
export async function updateApiLogReadStatus(id, isRead = true) {
  if (id === undefined || id === null) return null
  try {
    const numId = Number(id)
    const targetId = isNaN(numId) ? id : numId
    const db = await getApiLogDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    let record = await store.get(targetId)
    if (!record && typeof id === 'string') {
      record = await store.get(id)
    }
    if (record) {
      record.isRead = Boolean(isRead)
      await store.put(record)
    }
    await tx.done
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('API_LOG_READ_CHANGED', {
          detail: { id: targetId, isRead: Boolean(isRead) }
        })
      )
    }
    return record
  } catch (error) {
    console.warn('Lỗi cập nhật trạng thái đọc của log:', error)
    return null
  }
}

/**
 * Đánh dấu toàn bộ bản ghi log (thuộc route hoặc tất cả) là đã đọc
 * @param {string} route - Đường dẫn route cần đánh dấu (hoặc null nếu tất cả)
 */
export async function markAllApiLogsRead(route = null) {
  try {
    const targetCleanRoute = route && route !== 'all' ? cleanRoutePath(route) : null
    const db = await getApiLogDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    let cursor = await store.openCursor()
    while (cursor) {
      const logCleanRoute = cleanRoutePath(cursor.value.route)
      if (
        !targetCleanRoute ||
        logCleanRoute === targetCleanRoute ||
        logCleanRoute.endsWith(targetCleanRoute) ||
        targetCleanRoute.endsWith(logCleanRoute)
      ) {
        const updated = { ...cursor.value, isRead: true }
        await cursor.update(updated)
      }
      cursor = await cursor.continue()
    }
    await tx.done
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('API_LOG_READ_CHANGED', {
          detail: { route, all: true }
        })
      )
    }
    return true
  } catch (error) {
    console.warn('Lỗi đánh dấu tất cả đã đọc:', error)
    return false
  }
}
