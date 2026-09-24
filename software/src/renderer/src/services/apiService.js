import axios from 'axios'
import CryptoJS from 'crypto-js'
import { accessToken } from './tokenService'
import { HOST_API_SERVER_1 } from '.'
import { saveApiLog, getCurrentRoute } from '../IndexedDB/loadApiLogData'

// Khóa bí mật đồng bộ với API Gateway
const APP_SECRET_KEY = 'ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X'

const apiService = axios.create({
  baseURL: HOST_API_SERVER_1,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 45000 // 45 giây
})

/**
 * Interceptor tự động tạo chữ ký số HMAC-SHA256, Nonce, Timestamp cho mọi request
 * Ngăn chặn tuyệt đối việc copy URL gọi qua Postman, cURL, hoặc can thiệp F12
 */
apiService.interceptors.request.use((config) => {
  if (HOST_API_SERVER_1) {
    config.baseURL = HOST_API_SERVER_1
  }

  // Lưu thông tin thời gian bắt đầu và route hiện tại
  config.__startTime = Date.now()
  config.__currentRoute = getCurrentRoute()

  // 1. Gắn Bearer Token nếu có
  const token = typeof accessToken === 'function' ? accessToken() : accessToken
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  // 2. Tạo Timestamp (Unix seconds) và Nonce ngẫu nhiên
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  // 3. Chuẩn bị payload string: METHOD|PATH|TIMESTAMP|NONCE|BODY
  const method = (config.method || 'GET').toUpperCase()

  // Trích xuất path tương đối
  let path = config.url || ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const urlObj = new URL(path)
      path = urlObj.pathname
    } catch (err) {
      console.debug('Invalid path in apiService:', err)
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

  // 4. Tạo chữ ký HMAC-SHA256
  const signature = CryptoJS.HmacSHA256(payloadToSign, APP_SECRET_KEY).toString(CryptoJS.enc.Hex)

  // 5. Đính kèm các Header bảo mật bắt buộc
  config.headers['X-App-Signature'] = signature
  config.headers['X-App-Timestamp'] = timestamp
  config.headers['X-App-Nonce'] = nonce
  config.headers['X-Client-Platform'] = 'ELECTRON_SECURE_DESKTOP'

  return config
})

apiService.interceptors.response.use(
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
    // Bỏ qua các request bị hủy bởi AbortController / debounce / switch route (không phải lỗi thực tế)
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

    if (response) {
      const status = response.status
      const data = response.data

      // Bắt các lỗi bảo mật hoặc spam
      if (status === 403 && data?.error_code === 'UNAUTHORIZED_CLIENT') {
        console.error(
          'Cảnh báo bảo mật: Yêu cầu bị từ chối do không xác thực được client chính chủ!'
        )
      } else if (status === 429) {
        console.warn('Cảnh báo Spam API: ', data?.message)
      }
    }

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

export default apiService
