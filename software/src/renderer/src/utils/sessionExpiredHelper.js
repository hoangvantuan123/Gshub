/**
 * Helper phát tín hiệu khóa màn hình và yêu cầu đăng nhập lại khi phiên làm việc ERP hết hạn
 */

let lastTriggerTime = 0

export function isSessionExpiredError(errorOrMessage, status) {
  if (status === 401) return true
  const str = String(
    (typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage?.message || errorOrMessage?.error || '')
  ).toLowerCase()

  return (
    str.includes('erp access token') ||
    str.includes('active session not found') ||
    str.includes('auto-login failed') ||
    str.includes('invalid_client') ||
    str.includes('token expired') ||
    str.includes('jwt expired') ||
    str.includes('phiên làm việc') ||
    str.includes('hết hạn phiên') ||
    str.includes('unauthorized') ||
    str.includes('401')
  )
}

export function triggerSessionExpired(customMessage) {
  if (typeof window === 'undefined') return

  const now = Date.now()
  // Debounce tránh spam sự kiện liên tiếp
  if (now - lastTriggerTime < 3000) return
  lastTriggerTime = now

  const defaultMsg = 'Phiên làm việc ERP hoặc mã xác thực đã hết hạn.'
  const message = customMessage || defaultMsg

  console.warn('[SessionExpired] Phát tín hiệu khóa màn hình hết hạn phiên:', message)

  window.dispatchEvent(
    new CustomEvent('auth:session-expired', {
      detail: { message }
    })
  )
}
