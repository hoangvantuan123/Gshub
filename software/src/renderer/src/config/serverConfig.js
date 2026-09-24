/**
 * GsHub - Server Environment & Connection Configuration
 * Target: Goldsun Packaging ERP (DEV & PROD)
 * Backend Gateway: service-datahub (:8080)
 */

export const STORAGE_KEY_ENV = 'envSelection'
export const STORAGE_KEY_SAVED_USERS = 'datahub_saved_user_logs'
export const STORAGE_KEY_REMEMBER_USER = 'datahub_remember_username'

export const BACKEND_DATAHUB_URL = 'http://localhost:8080'

export const SERVER_ENVIRONMENTS = [
  {
    value: 'dev',
    label: 'Goldsun Dev (Testing / UAT)',
    shortLabel: 'Dev / UAT',
    endpoint: 'https://bravo.goldsunpackaging.vn:5051',
    configKey: 'BravoDefault',
    backendUrl: 'http://localhost:8080',
    tag: 'Goldsun DEV'
  },
  {
    value: 'official',
    label: 'Goldsun PROD (Chính Thức / Production)',
    shortLabel: 'Production',
    endpoint: 'https://bravo.goldsunpackaging.vn:5052',
    configKey: 'Bravo_PROD',
    backendUrl: 'http://localhost:8080',
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
  return SERVER_ENVIRONMENTS.find((e) => e.value === current) || SERVER_ENVIRONMENTS[0]
}

export default {
  STORAGE_KEY_ENV,
  STORAGE_KEY_SAVED_USERS,
  STORAGE_KEY_REMEMBER_USER,
  BACKEND_DATAHUB_URL,
  SERVER_ENVIRONMENTS,
  getCurrentEnv,
  setCurrentEnv,
  getEnvConfig
}
