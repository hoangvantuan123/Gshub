import apiService from './apiService'
import { accessToken } from './tokenService'
import { HOST_API_SERVER_2 } from './index'

/**
 * Hàm parse an toàn dữ liệu từ backend (đặc thù gRPC thường trả về JSON stringified)
 * Không bao giờ làm crash ứng dụng nếu dữ liệu bị lỗi cú pháp.
 */
export const safeParseData = (data) => {
  if (data === null || data === undefined) return null
  if (typeof data !== 'string') return data
  const trimmed = data.trim()
  if (trimmed === 'null') return null
  if (trimmed === 'undefined') return undefined
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return data
    }
  }
  return data
}

export const request = async ({
  url,
  method = 'POST',
  data = null,
  params = null,
  baseUrl = HOST_API_SERVER_2,
  isPublic = false,
  signal = null,
  timeout = 45000,
  headers = {},
  responseType = 'json',
  autoParse = true
}) => {
  const reqHeaders = { ...headers }
  const httpMethod = (method || 'POST').toUpperCase()

  // 1. Quản lý Authentication Token động
  if (!isPublic) {
    const token = typeof accessToken === 'function' ? await accessToken() : accessToken
    if (token && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  // 2. Tự động nhận diện Content-Type nếu gửi FormData (upload file)
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  if (!reqHeaders['Content-Type'] && !isFormData) {
    reqHeaders['Content-Type'] = 'application/json'
  }

  // 3. Chuẩn hóa Full URL động và cấu hình Timeout linh hoạt
  let targetUrl = url || ''
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    const base = baseUrl || HOST_API_SERVER_2
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
    const cleanPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`
    targetUrl = `${cleanBase}${cleanPath}`
  }

  if (timeout && timeout > 0) {
    reqHeaders['X-Request-Timeout'] = Math.ceil(timeout / 1000).toString()
  }

  try {
    // 4. Gửi qua apiService (tự động kích hoạt interceptor HMAC-SHA256 và bảo mật đa tầng)
    const response = await apiService({
      method: httpMethod,
      url: targetUrl,
      data,
      params,
      headers: reqHeaders,
      signal,
      timeout,
      responseType
    })

    const requestId =
      response.headers?.['x-request-id'] ||
      response.headers?.['X-Request-ID'] ||
      response.data?.requestId ||
      ''

    // 5. Nếu yêu cầu file nhị phân (blob) thì trả về nguyên bản
    if (responseType === 'blob') {
      return {
        success: true,
        data: response.data,
        message: 'Tải tập tin thành công',
        statusCode: response.status,
        requestId,
        raw: response
      }
    }

    const resData = response.data || {}
    const isSuccess = resData.success !== false && response.status >= 200 && response.status < 300

    // 6. Xử lý payload gRPC trả về
    let parsedData = resData.data !== undefined ? resData.data : resData
    if (autoParse) {
      parsedData = safeParseData(parsedData)
    }

    let parsedPage = resData.page ? safeParseData(resData.page) : null

    return {
      success: isSuccess,
      data: parsedData,
      page: parsedPage,
      message: resData.message || (isSuccess ? 'Thành công' : 'Thao tác không thành công'),
      error: resData.error || null,
      code: resData.code || resData.error?.code || null,
      errors: resData.errors || null,
      statusCode: response.status,
      requestId,
      raw: resData
    }
  } catch (error) {
    // 7. Nhận diện request bị hủy bởi AbortController / timeout / cancel
    const isCanceled =
      error?.name === 'CanceledError' ||
      error?.code === 'ERR_CANCELED' ||
      error?.message === 'canceled' ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('canceled'))

    if (isCanceled) {
      return {
        success: false,
        isCanceled: true,
        data: null,
        message: 'canceled',
        error: null,
        code: 'ERR_CANCELED',
        errors: [],
        statusCode: 0,
        requestId: '',
        raw: null
      }
    }

    const status = error.response?.status || 0
    const errResponseData = error.response?.data || {}
    const requestId =
      error.response?.headers?.['x-request-id'] ||
      error.response?.headers?.['X-Request-ID'] ||
      errResponseData.requestId ||
      ''

    // Bắt và phân loại các lỗi bảo mật hệ thống
    if (status === 401) {
      console.warn('Lỗi xác thực (401): Phiên đăng nhập đã hết hạn hoặc không có token.', {
        requestId
      })
    } else if (status === 403) {
      console.warn(
        'Lỗi phân quyền (403): Không có quyền truy cập hoặc chữ ký bảo mật client không hợp lệ.',
        { requestId }
      )
    } else if (status === 429) {
      console.warn('Lỗi tần suất (429): Quá nhiều yêu cầu trong thời gian ngắn.', {
        requestId
      })
    }

    const errorMessage =
      errResponseData.message ||
      errResponseData.error ||
      error.message ||
      'Không thể kết nối đến máy chủ'

    return {
      success: false,
      isCanceled: false,
      data: null,
      message: errorMessage,
      error: errResponseData.error || null,
      code: errResponseData.code || errResponseData.error?.code || null,
      errors: errResponseData.errors || [errorMessage],
      statusCode: status,
      requestId,
      raw: errResponseData
    }
  }
}

export const apiPost = (endpoint, data = {}, options = {}) => {
  const opts = options instanceof AbortSignal ? { signal: options } : options
  return request({ url: endpoint, method: 'POST', data, ...opts })
}

export const apiGet = (endpoint, params = {}, options = {}) => {
  const opts = options instanceof AbortSignal ? { signal: options } : options
  return request({ url: endpoint, method: 'GET', params, ...opts })
}

export const apiUpload = (endpoint, formData, options = {}) =>
  request({
    url: endpoint,
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', ...(options.headers || {}) },
    ...options
  })

export const defineApi = (endpoint, defaultOptions = {}) => {
  return (payload = {}, customOptions = {}) =>
    apiPost(endpoint, payload, { ...defaultOptions, ...customOptions })
}

export default {
  request,
  apiPost,
  apiGet,
  apiUpload,
  defineApi,
  safeParseData
}
