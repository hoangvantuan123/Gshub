/**
 * GsHub - Server Environment & Connection Configuration
 * Target: Goldsun Packaging ERP (DEV & PROD)
 * Backend Gateway: service-datahub (:8080)
 */

export const STORAGE_KEY_ENV = 'envSelection'
export const STORAGE_KEY_SAVED_USERS = 'datahub_saved_user_logs'
export const STORAGE_KEY_REMEMBER_USER = 'datahub_remember_username'

export const getDefaultDataHubUrl = () => {
  try {
    if (typeof window !== 'undefined') {
      const customUrl =
        localStorage.getItem('gshub_api_url') || localStorage.getItem('datahub_api_url')
      if (customUrl) return customUrl

      const hostname = window.location.hostname
      // Khi chạy trên Web domain (vd: gshub.erpsheet.vn) không phải localhost
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return window.location.origin
      }
    }
  } catch (e) {
    console.warn('Error resolving default DataHub URL:', e)
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'http://localhost:8080'
  )
}

export const BACKEND_DATAHUB_URL = getDefaultDataHubUrl()

export const SERVER_ENVIRONMENTS = [
  {
    value: 'dev',
    label: 'Goldsun Dev (Testing / UAT)',
    shortLabel: 'Dev / UAT',
    endpoint: 'https://bravo.goldsunpackaging.vn:5051',
    configKey: 'BravoDefault',
    backendUrl: getDefaultDataHubUrl(),
    tag: 'Goldsun DEV'
  },
  {
    value: 'official',
    label: 'Goldsun PROD (Chính Thức / Production)',
    shortLabel: 'Production',
    endpoint: 'https://bravo.goldsunpackaging.vn:5052',
    configKey: 'Bravo_PROD',
    backendUrl: getDefaultDataHubUrl(),
    tag: 'Goldsun PROD'
  }
]

export function getCurrentEnv() {
  try {
    return localStorage.getItem(STORAGE_KEY_ENV) || 'dev'
  } catch {
    return 'dev'
  }
}

export function setCurrentEnv(envKey) {
  try {
    localStorage.setItem(STORAGE_KEY_ENV, envKey)
    localStorage.setItem('datahub_env_selection', envKey)
    window.dispatchEvent(new CustomEvent('env-changed', { detail: envKey }))
    window.dispatchEvent(new CustomEvent('datahub_env_changed', { detail: envKey }))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('TITLE_UPDATE'))
  } catch (e) {
    console.warn('Failed to set env', e)
  }
}

export function getEnvConfig(envKey = null) {
  const current = envKey || getCurrentEnv()
  const found = SERVER_ENVIRONMENTS.find((e) => e.value === current) || SERVER_ENVIRONMENTS[0]
  return {
    ...found,
    backendUrl: getDefaultDataHubUrl()
  }
}

export default {
  STORAGE_KEY_ENV,
  STORAGE_KEY_SAVED_USERS,
  STORAGE_KEY_REMEMBER_USER,
  getDefaultDataHubUrl,
  BACKEND_DATAHUB_URL,
  SERVER_ENVIRONMENTS,
  getCurrentEnv,
  setCurrentEnv,
  getEnvConfig
}
