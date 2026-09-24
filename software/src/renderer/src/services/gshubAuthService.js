/**
 * GsHub / DataHub Auth & API Service
 * Handles communication with service-datahub backend (http://localhost:8080)
 * Compliant with LOGIN_VA_QUAN_LY_TOKEN.md
 */

const DEFAULT_BASE_URL = 'http://localhost:8080'
const STORAGE_KEY_AUTH_SESSION = 'datahub_auth_session'
const STORAGE_KEY_GSHUB_AUTH_SESSION = 'gshub_auth_session'
const STORAGE_KEY_LAST_CONFIG = 'datahub_last_config_key'

export const gshubAuthService = {
  getBaseUrl() {
    try {
      return (
        localStorage.getItem('gshub_api_url') ||
        localStorage.getItem('datahub_api_url') ||
        DEFAULT_BASE_URL
      )
    } catch {
      return DEFAULT_BASE_URL
    }
  },

  /**
   * Get cached session from localStorage
   */
  getSavedSession() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY_AUTH_SESSION) ||
        localStorage.getItem(STORAGE_KEY_GSHUB_AUTH_SESSION)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed
    } catch {
      return null
    }
  },

  /**
   * Save active session to localStorage
   */
  saveSession(sessionData) {
    try {
      const serialized = JSON.stringify(sessionData)
      localStorage.setItem(STORAGE_KEY_AUTH_SESSION, serialized)
      localStorage.setItem(STORAGE_KEY_GSHUB_AUTH_SESSION, serialized)
      if (sessionData?.config_key) {
        localStorage.setItem(STORAGE_KEY_LAST_CONFIG, sessionData.config_key)
        localStorage.setItem('gshub_last_config_key', sessionData.config_key)
      }
      if (sessionData?.access_token) {
        localStorage.setItem('access_token', sessionData.access_token)
        localStorage.setItem('token', sessionData.access_token)
        localStorage.setItem('a_a', sessionData.access_token)
      }
    } catch (e) {
      console.warn('Failed to save auth session to localStorage', e)
    }
  },

  /**
   * Validate session with backend system.
   * Checks the token/session against the backend API.
   * If backend does not return an active valid session, clears cache and returns null.
   */
  async validateSession() {
    try {
      const saved = this.getSavedSession()
      if (!saved?.config_key || !saved?.username) {
        this.clearSession()
        return null
      }

      const backendSession = await this.checkSession(saved.config_key, saved.username)
      if (backendSession && backendSession.access_token) {
        const merged = { ...saved, ...backendSession }
        this.saveSession(merged)
        return merged
      }

      // Backend confirmed no valid session exists or token is invalid
      this.clearSession()
      return null
    } catch (err) {
      console.warn('[gshubAuthService] Backend session check failed:', err)
      this.clearSession()
      return null
    }
  },

  /**
   * Clear session and all active access tokens from storage
   */
  clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_SESSION)
      localStorage.removeItem(STORAGE_KEY_GSHUB_AUTH_SESSION)
      localStorage.removeItem('access_token')
      localStorage.removeItem('token')
      localStorage.removeItem('a_a')
      sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION)
      sessionStorage.removeItem(STORAGE_KEY_GSHUB_AUTH_SESSION)
      sessionStorage.removeItem('access_token')
    } catch (e) {
      console.warn('Failed to clear auth session', e)
    }
  },

  /**
   * Logout: Clear all tokens and session immediately without calling API
   */
  logout() {
    this.clearSession()
  },

  /**
   * Get last used ConfigKey
   */
  getLastConfigKey() {
    return (
      localStorage.getItem(STORAGE_KEY_LAST_CONFIG) ||
      localStorage.getItem('gshub_last_config_key') ||
      'BravoDefault'
    )
  },

  /**
   * Fetch list of all ERP configurations from Backend DB
   */
  async getConfigs() {
    try {
      const baseUrl = this.getBaseUrl()
      const res = await fetch(`${baseUrl}/api/v1/configs`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        return json.data
      }
      return []
    } catch (err) {
      console.warn('[gshubAuthService] Failed to load configs from backend:', err)
      return []
    }
  },

  /**
   * Save / Create a new ERP configuration in DB
   */
  async saveConfig(configData) {
    const baseUrl = this.getBaseUrl()
    const res = await fetch(`${baseUrl}/api/v1/configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(configData)
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Lưu cấu hình thất bại')
    }
    return json.data
  },

  /**
   * Delete an ERP configuration
   */
  async deleteConfig(configKey) {
    const baseUrl = this.getBaseUrl()
    const res = await fetch(`${baseUrl}/api/v1/configs/${encodeURIComponent(configKey)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Xóa cấu hình thất bại')
    }
    return true
  },

  /**
   * Perform Login to ERP system via backend
   * @param {string} username
   * @param {string} password
   * @param {string} configKey
   */
  async login(username, password, configKey = 'BravoDefault') {
    const baseUrl = this.getBaseUrl()
    const payload = {
      username: (username || '').trim(),
      password: password || '',
      config_key: configKey || 'BravoDefault'
    }

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json || !json.success) {
      const errorMsg =
        json?.message ||
        json?.error ||
        (res.status === 401
          ? 'Tài khoản hoặc mật khẩu không chính xác'
          : `Lỗi kết nối máy chủ (${res.status})`)
      throw new Error(errorMsg)
    }

    const sessionData = json.data || json
    this.saveSession(sessionData)
    return sessionData
  },

  /**
   * Check active token session in backend
   */
  async checkSession(configKey, username) {
    try {
      const baseUrl = this.getBaseUrl()
      const res = await fetch(
        `${baseUrl}/api/v1/auth/session?config_key=${encodeURIComponent(configKey)}&username=${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' }
        }
      )
      const json = await res.json().catch(() => null)
      return json?.success ? json.data : null
    } catch {
      return null
    }
  },

  /**
   * Proxy forward API request to ERP
   */
  async proxyRequest(method, path, params = {}, body = null, configKey = '', username = '') {
    const session = this.getSavedSession()
    const activeConfig = configKey || session?.config_key || 'BravoDefault'
    const activeUser = username || session?.username || ''
    const baseUrl = this.getBaseUrl()

    const payload = {
      config_key: activeConfig,
      username: activeUser,
      method: (method || 'GET').toUpperCase(),
      path,
      params,
      body
    }

    const res = await fetch(`${baseUrl}/api/v1/datahub/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json || !json.success) {
      throw new Error(json?.message || json?.error || 'Gọi API ERP thất bại')
    }

    return json.data
  },

  /**
   * Check service health
   */
  async checkHealth() {
    try {
      const baseUrl = this.getBaseUrl()
      const res = await fetch(`${baseUrl}/health`, { method: 'GET' })
      const json = await res.json().catch(() => null)
      return json?.success ? json.data : null
    } catch {
      return null
    }
  }
}

export const datahubAuthService = gshubAuthService
export default gshubAuthService
