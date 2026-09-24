import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/vi'
import 'dayjs/locale/en'
import 'dayjs/locale/ko'
import 'dayjs/locale/zh-cn'

// Kích hoạt plugins & locale tiếng Việt mặc định cho dayjs
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('vi')

export const STORAGE_KEY_DATE_SETTINGS = 'APP_DATE_FORMAT_SETTINGS'
export const DATE_FORMAT_CHANGE_EVENT = 'app_date_format_change'

export const DEFAULT_DATE_SETTINGS = {
  dateFormat: 'DD/MM/YYYY',
  dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
  monthFormat: 'MM/YYYY',
  timeFormat: 'HH:mm:ss',
  apiDateFormat: 'YYYY-MM-DD',
  apiDateTimeFormat: 'YYYY-MM-DDTHH:mm:ss'
}

// Bộ nhớ đệm siêu tốc tránh parse/format lặp lại trên hàng ngàn dòng của bảng và thanh tìm kiếm
const formatCache = new Map()
const MAX_CACHE_SIZE = 3000

function getCachedFormatted(key, computeFn) {
  if (formatCache.has(key)) {
    return formatCache.get(key)
  }
  const result = computeFn()
  if (formatCache.size >= MAX_CACHE_SIZE) {
    // Xóa bớt 500 mục cũ nhất khi đầy cache
    const keysToDelete = Array.from(formatCache.keys()).slice(0, 500)
    keysToDelete.forEach((k) => formatCache.delete(k))
  }
  formatCache.set(key, result)
  return result
}

let cachedDateSettings = null

/**
 * Lấy cấu hình định dạng ngày tháng từ LocalStorage (Có Cache RAM chống đọc I/O lặp lại)
 */
export function getDateSettings() {
  if (cachedDateSettings) return cachedDateSettings
  try {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DATE_SETTINGS) : null
    if (saved) {
      cachedDateSettings = { ...DEFAULT_DATE_SETTINGS, ...JSON.parse(saved) }
      return cachedDateSettings
    }
  } catch (e) {
    console.warn('Lỗi đọc cấu hình date settings:', e)
  }
  cachedDateSettings = { ...DEFAULT_DATE_SETTINGS }
  return cachedDateSettings
}

/**
 * Cập nhật cấu hình định dạng ngày tháng và phát sự kiện đồng bộ toàn ứng dụng
 * @param {Object} newSettings - Object chứa các cài đặt mới cần ghi đè
 */
export function updateDateSettings(newSettings = {}) {
  try {
    formatCache.clear() // Xóa cache khi cấu hình thay đổi
    const current = getDateSettings()
    const updated = { ...current, ...newSettings }
    cachedDateSettings = updated
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DATE_SETTINGS, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent(DATE_FORMAT_CHANGE_EVENT, { detail: updated }))
    }
    return updated
  } catch (e) {
    console.error('Lỗi lưu cấu hình date settings:', e)
    return getDateSettings()
  }
}

/**
 * Parse thông minh mọi loại chuỗi / giá trị ngày tháng sang đối tượng dayjs
 * Hỗ trợ:
 * - ISO string: 2026-05-03T15:47:58.823+07:00, 2026-09-13T08:00:00Z
 * - Chuỗi chuẩn: 2026-09-13, 2026-09-13 15:47:58
 * - Chuỗi Việt Nam: 13/09/2026, 13/09/2026 15:47:58, 13-09-2026
 * - Chuỗi Tháng/Năm: 09/2026, 9/2026, 2026-09, 2026/09
 * - Chuỗi số liền: 20260913 (8 số), 202609 (6 số), 20260913154758 (14 số)
 * - Timestamp number, Date object, dayjs object
 *
 * @param {any} input - Dữ liệu đầu vào
 * @returns {dayjs.Dayjs | null} Đối tượng dayjs hoặc null nếu không hợp lệ
 */
export function parseUniversalDate(input) {
  if (input === null || input === undefined || input === '') return null
  if (dayjs.isDayjs(input)) return input.isValid() ? input : null
  if (input instanceof Date) {
    const d = dayjs(input)
    return d.isValid() ? d : null
  }

  // 1. Nếu là số timestamp (milliseconds hoặc seconds)
  if (typeof input === 'number') {
    const d = input < 1e11 ? dayjs.unix(input) : dayjs(input)
    return d.isValid() ? d : null
  }

  const str = String(input).trim()
  if (!str) return null

  // 2. Chuỗi dạng 8 chữ số liền: YYYYMMDD (ví dụ: 20260913)
  if (/^\d{8}$/.test(str)) {
    const d = dayjs(str, 'YYYYMMDD', true)
    if (d.isValid()) return d
  }

  // 3. Chuỗi dạng 6 chữ số liền: YYYYMM (ví dụ: 202609)
  if (/^\d{6}$/.test(str)) {
    const d = dayjs(str, 'YYYYMM', true)
    if (d.isValid()) return d
  }

  // 4. Chuỗi dạng 14 chữ số liền: YYYYMMDDHHmmss (ví dụ: 20260913154758)
  if (/^\d{14}$/.test(str)) {
    const d = dayjs(str, 'YYYYMMDDHHmmss', true)
    if (d.isValid()) return d
  }

  // 5. Chuỗi dạng Tháng/Năm: MM/YYYY hoặc M/YYYY (ví dụ: 09/2026, 9/2026)
  if (/^\d{1,2}\/\d{4}$/.test(str)) {
    const d = dayjs(str, 'MM/YYYY')
    if (d.isValid()) return d
  }

  // 6. Chuỗi dạng Ngày/Tháng/Năm (VD: 13/09/2026 hoặc 13/09/2026 15:47:58)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const formats = [
      'DD/MM/YYYY HH:mm:ss',
      'DD/MM/YYYY HH:mm',
      'DD/MM/YYYY',
      'D/M/YYYY HH:mm:ss',
      'D/M/YYYY'
    ]
    for (const f of formats) {
      const d = dayjs(str, f, true)
      if (d.isValid()) return d
    }
  }

  // 7. Chuỗi dạng D-M-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) {
    const formats = ['DD-MM-YYYY HH:mm:ss', 'DD-MM-YYYY', 'D-M-YYYY']
    for (const f of formats) {
      const d = dayjs(str, f, true)
      if (d.isValid()) return d
    }
  }

  // 8. Các dạng ISO / Chuẩn quốc tế (2026-05-03T15:47:58.823+07:00, 2026-09-13, 2026-09-13 15:47:58)
  const direct = dayjs(str)
  if (direct.isValid()) return direct

  return null
}

/**
 * Định dạng ngày (Date Only)
 * @param {any} val - Dữ liệu ngày đầu vào
 * @param {string} [customFormat] - Định dạng ghi đè (nếu không truyền sẽ dùng cấu hình hệ thống)
 * @param {string} [fallback=''] - Giá trị trả về nếu không hợp lệ
 */
export function formatDate(val, customFormat, fallback = '') {
  if (val === null || val === undefined || val === '') return fallback
  const formatPattern = customFormat || getDateSettings().dateFormat || 'DD/MM/YYYY'
  const cacheKey = `d_${val}_${formatPattern}`

  return getCachedFormatted(cacheKey, () => {
    const parsed = parseUniversalDate(val)
    return parsed ? parsed.format(formatPattern) : fallback
  })
}

/**
 * Định dạng ngày + giờ (DateTime)
 * @param {any} val - Dữ liệu ngày giờ đầu vào
 * @param {string} [customFormat] - Định dạng ghi đè
 * @param {string} [fallback=''] - Giá trị trả về nếu không hợp lệ
 */
export function formatDateTime(val, customFormat, fallback = '') {
  if (val === null || val === undefined || val === '') return fallback
  const formatPattern = customFormat || getDateSettings().dateTimeFormat || 'DD/MM/YYYY HH:mm:ss'
  const cacheKey = `dt_${val}_${formatPattern}`

  return getCachedFormatted(cacheKey, () => {
    const parsed = parseUniversalDate(val)
    return parsed ? parsed.format(formatPattern) : fallback
  })
}

/**
 * Định dạng tháng năm (Month Only)
 * @param {any} val - Dữ liệu tháng đầu vào
 * @param {string} [customFormat] - Định dạng ghi đè
 * @param {string} [fallback=''] - Giá trị trả về nếu không hợp lệ
 */
export function formatMonth(val, customFormat, fallback = '') {
  if (val === null || val === undefined || val === '') return fallback
  const formatPattern = customFormat || getDateSettings().monthFormat || 'MM/YYYY'
  const cacheKey = `m_${val}_${formatPattern}`

  return getCachedFormatted(cacheKey, () => {
    const parsed = parseUniversalDate(val)
    return parsed ? parsed.format(formatPattern) : fallback
  })
}

/**
 * Định dạng giờ (Time Only)
 * @param {any} val - Dữ liệu giờ đầu vào
 * @param {string} [customFormat] - Định dạng ghi đè
 * @param {string} [fallback=''] - Giá trị trả về nếu không hợp lệ
 */
export function formatTime(val, customFormat, fallback = '') {
  if (val === null || val === undefined || val === '') return fallback
  const formatPattern = customFormat || getDateSettings().timeFormat || 'HH:mm:ss'
  const cacheKey = `t_${val}_${formatPattern}`

  return getCachedFormatted(cacheKey, () => {
    const parsed = parseUniversalDate(val)
    return parsed ? parsed.format(formatPattern) : fallback
  })
}

/**
 * Chuyển đổi giá trị sang chuỗi chuẩn ngày gửi lên Backend API (Mặc định YYYY-MM-DD)
 * @param {any} val
 * @param {string} [apiFormat]
 */
export function toApiDate(val, apiFormat) {
  const parsed = parseUniversalDate(val)
  if (!parsed) return ''
  return parsed.format(apiFormat || getDateSettings().apiDateFormat || 'YYYY-MM-DD')
}

/**
 * Chuyển đổi giá trị sang chuỗi chuẩn ngày giờ gửi lên Backend API (ISO String)
 * @param {any} val
 */
export function toApiDateTime(val) {
  const parsed = parseUniversalDate(val)
  if (!parsed) return ''
  return parsed.toISOString()
}

/**
 * Chuyển đổi mảng DateRange `[Từ ngày, Đến ngày]` sang mảng chuỗi chuẩn gửi API `['YYYY-MM-DD', 'YYYY-MM-DD']`
 * @param {any[]} range - Mảng [from, to]
 * @param {string} [apiFormat]
 * @returns {[string, string]} Mảng 2 phần tử chuỗi chuẩn API
 */
export function toApiDateRange(range, apiFormat) {
  if (!Array.isArray(range)) return ['', '']
  const from = toApiDate(range[0], apiFormat)
  const to = toApiDate(range[1], apiFormat)
  return [from, to]
}

export { dayjs }
