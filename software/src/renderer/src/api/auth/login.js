/**
 * GsHub Auth API
 * Compliant with LOGIN_VA_QUAN_LY_TOKEN.md
 * Endpoint: POST http://localhost:8080/api/v1/auth/login
 */

import { gshubAuthService } from '../../services/gshubAuthService'

/**
 * Login function calling backend service (:8080)
 * @param {Object} params
 * @param {string} params.login - Username / Mã nhân viên
 * @param {string} params.username - Alternative username property
 * @param {string} params.password - Raw plain password
 * @param {string} params.config_key - Config key (e.g. BravoDefault / Bravo_PROD)
 * @param {string} params.configKey - Alternative config key property
 * @param {string} params.platformStatus - 'desktop' or 'web'
 */
export const LoginAuth = async (params = {}) => {
  const username = (params.username || params.login || '').trim()
  const password = params.password || ''
  const configKey =
    params.config_key ||
    params.configKey ||
    (params.envSelection === 'official' ? 'Bravo_PROD' : 'BravoDefault')

  if (!username) {
    return {
      success: false,
      message: 'Vui lòng nhập mã nhân viên / tài khoản'
    }
  }

  try {
    const sessionData = await gshubAuthService.login(username, password, configKey)

    const token = sessionData?.access_token || ''
    const userObj = sessionData?.user || {
      UserName: username,
      UserId: username,
      EmpID: username,
      ConfigKey: configKey
    }

    return {
      success: true,
      data: sessionData,
      token,
      user: userObj,
      tokenRolesUserMenu: sessionData?.tokenRolesUserMenu || '',
      roles_menu: sessionData?.roles_menu || ''
    }
  } catch (error) {
    const errMsg = error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!'
    return {
      success: false,
      message: errMsg,
      error: {
        message: errMsg
      }
    }
  }
}

/**
 * Logout function
 */
export const LogoutAuth = async () => {
  try {
    gshubAuthService.logout()
    return { success: true }
  } catch (error) {
    console.warn('LogoutAuth error:', error)
    return { success: false, message: error?.message }
  }
}

export default {
  LoginAuth,
  LogoutAuth
}
