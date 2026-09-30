/**
 * ERP Auth API
 * Đấu nối bảo mật trực tiếp qua API Gateway (Go) và Server-Core (gRPC)
 * Endpoints:
 *  - Login: POST /api/v2/acc/p2/login (HMAC-SHA256 Signed + X-Client-Platform)
 *  - Logout: POST /api/v2/acc/p2/logout (Revoke JWT Blacklist)
 */

import { apiPost } from '../../services/apiClient'

/**
 * Đăng nhập hệ thống ERP
 * @param {Object} params
 * @param {string} params.login - Tên đăng nhập / Mã nhân viên
 * @param {string} params.username - Alias cho login
 * @param {string} params.password - Mật khẩu người dùng
 * @param {string} [params.platformStatus] - 'desktop' hoặc 'web'
 */
export const LoginAuth = async (params = {}) => {
  const username = (params.username || params.login || '').trim()
  const password = params.password || ''

  if (!username) {
    return {
      success: false,
      message: 'Vui lòng nhập mã nhân viên / tài khoản',
      code: '4001'
    }
  }

  // Mã hóa Base64 password an toàn để gửi qua mạng theo chuẩn Server-Core
  const encodedPassword =
    typeof password === 'string' ? btoa(unescape(encodeURIComponent(password))) : password

  const isDesktop =
    typeof window !== 'undefined' &&
    (window.userAgent?.toLowerCase().includes('electron') || !!window?.electron)
  const platformStatus = params.platformStatus || (isDesktop ? 'desktop' : 'web')

  // Tạo hoặc lấy mã thiết bị cố định cho Web (Persistent Web Device ID)
  let webDeviceId = ''
  if (typeof window !== 'undefined') {
    try {
      webDeviceId = localStorage.getItem('gs_device_id') || ''
      if (!webDeviceId) {
        webDeviceId =
          'GS-WEB-' +
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9))
        localStorage.setItem('gs_device_id', webDeviceId)
      }
    } catch {
      webDeviceId = 'GS-WEB-DEFAULT'
    }
  }

  // Lấy mã định danh phần cứng cố định cho Desktop nếu đang chạy Electron
  let desktopDeviceInfo = 'Electron-Secure-Desktop'
  let desktopDeviceCode = ''
  if (isDesktop && window.electron) {
    try {
      if (typeof window.electron.getDeviceToken === 'function') {
        const token = await window.electron.getDeviceToken(username)
        if (token) desktopDeviceCode = token
      }
      if (typeof window.electron.getSystemInfo === 'function') {
        const sys = await window.electron.getSystemInfo()
        if (sys) {
          desktopDeviceInfo = `Desktop-${sys.hostname || ''}-${sys.platform || ''}-${sys.arch || ''}`
        }
      }
    } catch (e) {
      console.warn('Could not retrieve hardware device info:', e)
    }
  }

  const deviceInfoWeb =
    typeof navigator !== 'undefined' ? `${navigator.userAgent} [ID:${webDeviceId}]` : webDeviceId
  const deviceInfoSoft = isDesktop ? desktopDeviceInfo : 'Web-Browser'
  const deviceInfoApp = desktopDeviceCode || webDeviceId

  const env =
    params.envSelection ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) ||
    'dev'
  const configKey = params.config_key || (env === 'official' ? 'Bravo_PROD' : 'BravoDefault')

  const payload = {
    result: {
      login: username,
      password: encodedPassword,
      config_key: configKey,
      deviceInfoWeb,
      deviceInfoSoft,
      deviceInfoApp,
      platformStatus
    }
  }

  try {
    const res = await apiPost('/acc/p2/login', payload, { isPublic: true })

    if (res && res.success) {
      let payloadData = res.data
      if (typeof payloadData === 'string') {
        try {
          payloadData = JSON.parse(payloadData)
        } catch {
          payloadData = {}
        }
      }
      if (!payloadData || typeof payloadData !== 'object') {
        payloadData = {}
      }

      const token = payloadData.token || payloadData.access_token || ''
      const user = payloadData.user || {
        UserId: username,
        UserName: username,
        EmpID: username
      }
      const tokenRolesUserMenu = payloadData.tokenRolesUserMenu || payloadData.roles_menu || ''
      const typeLanguage = payloadData.typeLanguage

      return {
        success: true,
        data: payloadData,
        token,
        user,
        tokenRolesUserMenu,
        roles_menu: tokenRolesUserMenu,
        typeLanguage,
        message: res.message || '2000'
      }
    }

    return {
      success: false,
      message: res?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!',
      code: res?.code || res?.error?.code || null,
      error: res?.error || {
        message: res?.message,
        code: res?.code
      },
      raw: res?.raw || res
    }
  } catch (error) {
    const errMsg = error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!'
    return {
      success: false,
      message: errMsg,
      code: error?.code || null,
      error: {
        message: errMsg,
        code: error?.code
      }
    }
  }
}

/**
 * Đăng xuất và thu hồi Token trên Server (Blacklist)
 */
export const LogoutAuth = async (options = {}) => {
  try {
    const res = await apiPost('/acc/p2/logout', {}, { isPublic: false, ...options })
    return res
  } catch (error) {
    console.warn('LogoutAuth error:', error)
    return { success: false, message: error?.message }
  }
}

export default {
  LoginAuth,
  LogoutAuth
}
