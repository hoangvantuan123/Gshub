import axios from 'axios'
import CryptoJS from 'crypto-js'
import { saveApiLog, getCurrentRoute } from '../IndexedDB/loadApiLogData'
import { isSessionExpiredError, triggerSessionExpired } from '../utils/sessionExpiredHelper'

const APP_SECRET_KEY = 'ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X'

// Gắn Interceptor toàn cục vào axios mặc định (bao gồm cả các component tự import axios trực tiếp)
axios.interceptors.request.use((config) => {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  const method = (config.method || 'GET').toUpperCase()

  // Lưu thông tin thời gian bắt đầu và route hiện tại để tính toán tốc độ và menu
  config.__startTime = Date.now()
  config.__currentRoute = getCurrentRoute()

  let path = config.url || ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const urlObj = new URL(path)
      path = urlObj.pathname
    } catch (e) {
      // Giữ nguyên path nếu URL không hợp lệ
      console.debug('Invalid URL parse:', e)
    }
  } else if (!path.startsWith('/')) {
    path = '/' + path
  }

  let bodyStr = ''
  if (config.data) {
    if (typeof config.data === 'string') {
      bodyStr = config.data
    } else {
      bodyStr = JSON.stringify(config.data)
    }
  }

  const payloadToSign = `${method}|${path}|${timestamp}|${nonce}|${bodyStr}`
  const signature = CryptoJS.HmacSHA256(payloadToSign, APP_SECRET_KEY).toString(CryptoJS.enc.Hex)

  config.headers = config.headers || {}
  config.headers['X-App-Signature'] = signature
  config.headers['X-App-Timestamp'] = timestamp
  config.headers['X-App-Nonce'] = nonce
  config.headers['X-Client-Platform'] = 'ELECTRON_SECURE_DESKTOP'

  return config
})

// Interceptor bắt kết quả trả về từ Axios và chỉ lưu vào IndexedDB khi có LỖI hoặc CẢNH BÁO
axios.interceptors.response.use(
  (response) => {
    const data = response?.data
    const config = response?.config || {}
    const durationMs = config.__startTime ? Date.now() - config.__startTime : 0
    const route = config.__currentRoute || getCurrentRoute()

    // Nếu Backend trả về HTTP 200 nhưng cờ success là false hoặc có thông báo lỗi nghiệp vụ
    if (data && typeof data === 'object' && (data.success === false || data.error)) {
      const beMessage =
        data.message ||
        data.msg ||
        (typeof data.error === 'string' ? data.error : data.error?.message) ||
        (typeof data.data === 'string' ? data.data : null) ||
        'Thao tác nghiệp vụ không thành công'

      saveApiLog({
        url: config.url || '',
        method: config.method || 'GET',
        route,
        durationMs,
        status: 'error',
        isSuccess: false,
        httpStatus: response.status || 200,
        errorCode: data.code || data.error_code || null,
        message: beMessage,
        responseData: data,
        logType: 'API_BUSINESS_ERROR'
      }).catch(() => {})
    }

    return response
  },
  (error) => {
    // Bỏ qua các request bị hủy bởi AbortController / debounce / switch route
    const isCanceled =
      error?.name === 'CanceledError' ||
      error?.code === 'ERR_CANCELED' ||
      error?.message === 'canceled' ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('canceled'))

    if (isCanceled) {
      return Promise.reject(error)
    }

    const config = error.config || {}
    const durationMs = config.__startTime ? Date.now() - config.__startTime : 0
    const route = config.__currentRoute || getCurrentRoute()
    const response = error.response

    // Trích xuất chi tiết nhất thông điệp lỗi trả về từ Server/Backend
    let errorMsg =
      response?.data?.message ||
      response?.data?.msg ||
      (typeof response?.data?.error === 'string'
        ? response.data.error
        : response?.data?.error?.message) ||
      (typeof response?.data?.data === 'string' ? response.data.data : null) ||
      (typeof response?.data === 'string' ? response.data : null) ||
      error.message ||
      'Yêu cầu API thất bại'

    // Tự động phát hiện phiên hết hạn / lỗi token ERP để hiển thị Modal cảnh báo
    if (
      isSessionExpiredError(errorMsg, response?.status) ||
      isSessionExpiredError(response?.data, response?.status)
    ) {
      triggerSessionExpired(errorMsg)
    }

    saveApiLog({
      url: config.url || '',
      method: config.method || 'GET',
      route,
      durationMs,
      status: 'error',
      isSuccess: false,
      httpStatus: response?.status || 500,
      errorCode: response?.data?.error_code || response?.data?.code || error.code || null,
      message: errorMsg,
      responseData: response?.data || null,
      logType: 'API_ERROR'
    }).catch(() => {})

    return Promise.reject(error)
  }
)

// Ghi đè phương thức window.fetch toàn cục để tự động ký số & lưu vết khi có lỗi
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch
  window.fetch = async function (input, init = {}) {
    const fetchStartTime = Date.now()
    const fetchRoute = getCurrentRoute()
    let url = typeof input === 'string' ? input : input?.url || ''

    // Bỏ qua ký số nếu là API bên thứ 3 (ví dụ 1.1.1.1 trace, cdn...)
    if (url.includes('1.1.1.1') || url.includes('cloudflare.com')) {
      return originalFetch(input, init)
    }

    const method = (init.method || 'GET').toUpperCase()

    let path = url
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url)
        path = urlObj.pathname
      } catch (err) {
        console.debug('Invalid fetch url:', err)
      }
    } else if (!path.startsWith('/')) {
      path = '/' + path
    }

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

    let bodyStr = ''
    if (init.body) {
      if (typeof init.body === 'string') {
        bodyStr = init.body
      } else {
        try {
          bodyStr = JSON.stringify(init.body)
        } catch (e) {
          console.debug('Could not stringify fetch body:', e)
        }
      }
    }

    const payloadToSign = `${method}|${path}|${timestamp}|${nonce}|${bodyStr}`
    const signature = CryptoJS.HmacSHA256(payloadToSign, APP_SECRET_KEY).toString(CryptoJS.enc.Hex)

    const headers = new Headers(init.headers || {})
    headers.set('X-App-Signature', signature)
    headers.set('X-App-Timestamp', timestamp)
    headers.set('X-App-Nonce', nonce)
    headers.set('X-Client-Platform', 'ELECTRON_SECURE_DESKTOP')

    init.headers = headers

    try {
      const response = await originalFetch(input, init)

      // Chỉ lưu log khi response bị lỗi (!ok hoặc status >= 400)
      if (!response.ok) {
        const durationMs = Date.now() - fetchStartTime
        let errorMsgPreview = `HTTP Error ${response.status}: ${response.statusText || 'Yêu cầu thất bại'}`
        try {
          const resClone = response.clone()
          const jsonBody = await resClone.json()
          if (jsonBody?.message || jsonBody?.msg || jsonBody?.error) {
            errorMsgPreview = jsonBody.message || jsonBody.msg || jsonBody.error
          }
        } catch (e) {
          console.debug('Fetch clone preview parse skipped:', e)
        }

        saveApiLog({
          url,
          method,
          route: fetchRoute,
          durationMs,
          status: 'error',
          isSuccess: false,
          httpStatus: response.status,
          message: errorMsgPreview,
          logType: 'FETCH_ERROR'
        }).catch(() => {})
      }

      return response
    } catch (fetchErr) {
      const durationMs = Date.now() - fetchStartTime
      saveApiLog({
        url,
        method,
        route: fetchRoute,
        durationMs,
        status: 'error',
        isSuccess: false,
        httpStatus: 0,
        message: fetchErr.message || 'Lỗi kết nối mạng (Fetch Error)',
        logType: 'FETCH_NETWORK_ERROR'
      }).catch(() => {})

      throw fetchErr
    }
  }

  // Hàm hỗ trợ ghi log cảnh báo / lỗi UI tùy chỉnh từ các màn hình
  window.recordCustomNotification = function ({
    message = '',
    type = 'error',
    menuName = '',
    action = '',
    details = null
  }) {
    if (type !== 'error' && type !== 'warning') {
      return Promise.resolve(null)
    }
    return saveApiLog({
      message,
      status: type === 'warning' ? 'warning' : 'error',
      isSuccess: false,
      menuName,
      action,
      responseData: details,
      logType: 'UI_NOTIFICATION'
    })
  }
}
