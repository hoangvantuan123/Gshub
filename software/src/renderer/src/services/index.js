const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const currentPort = typeof window !== 'undefined' ? window.location.port : ''

const devBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8080'

export let HOST_API_SERVER_1 = `${devBaseUrl}/api/v1`
export let HOST_API_SERVER_2 = `${devBaseUrl}/api/v2`
export let HOST_API_SERVER_3 = `${devBaseUrl}/api/v3`
export let HOST_API_SERVER_4 = `${devBaseUrl}/api/v4`
export let HOST_API_SERVER_5 = 'http://localhost:8089/api/v5'
export let HOST_API_SERVER_6 = 'http://localhost:8089/uploads'
export let HOST_API_SERVER_7 = 'http://localhost:8089/docx/print-logs'
export let HOST_API_SERVER_8 = `${devBaseUrl}/api/v5`
export let HOST_API_SERVER_9 = `${devBaseUrl}/api/v6`
export let HOST_API_SERVER_10 = `${devBaseUrl}/api/v7`
export let HOST_API_SERVER_11 = `${devBaseUrl}/api/v8`
export let HOST_API_SERVER_12 = `${devBaseUrl}/api/v9`
export let HOST_API_SERVER_13 = 'http://localhost:5159'
export let HOST_API_SERVER_14 = `${devBaseUrl}/api/v10`
export let HOST_API_SERVER_15 = 'http://localhost:5173/#/app/erp/p/asst-aems/maintain/mr-04'
export let HOST_API_SERVER_16 = `${devBaseUrl}/api/v11`
export let HOST_API_SERVER_17 = 'http://localhost:5159/secure-file-item-print'
export let HOST_API_SERVER_18 = 'http://localhost:5159/secure-file-wh-location-print'
export let HOST_API_SERVER_19 = 'http://localhost:5159/secure-file-itemlot-print'
export let HOST_API_SERVER_20 = `${devBaseUrl}/api/v12`

const baseUrl = `${currentHost}${currentPort ? ':' + currentPort : ''}`

export const getApiServerEndpoint = (envSelection) => {
  const env =
    envSelection ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) ||
    'dev'
  return env === 'official'
    ? 'https://bravo.goldsunpackaging.vn:5052'
    : 'https://bravo.goldsunpackaging.vn:5051'
}

export const updateApiServers = (envSelection) => {
  const env =
    envSelection ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) ||
    'dev'

  if (env === 'official' || (env !== 'dev' && baseUrl === 'platx.erpsheet.vn')) {
    HOST_API_SERVER_1 = 'https://platx.erpsheet.vn/a1/api/v1'
    HOST_API_SERVER_2 = 'https://platx.erpsheet.vn/a1/api/v2'
    HOST_API_SERVER_3 = 'https://platx.erpsheet.vn/a1/api/v3'
    HOST_API_SERVER_4 = 'https://platx.erpsheet.vn/a1/api/v4'
    HOST_API_SERVER_5 = 'https://platx.erpsheet.vn/a2/api/api/v5'
    HOST_API_SERVER_6 = 'https://platx.erpsheet.vn/a2/uploads'
    HOST_API_SERVER_7 = 'https://platx.erpsheet.vn/a2/docx/print-logs'
    HOST_API_SERVER_8 = 'https://platx.erpsheet.vn/a1/api/v5'
    HOST_API_SERVER_9 = 'https://platx.erpsheet.vn/a1/api/v6'
    HOST_API_SERVER_10 = 'https://platx.erpsheet.vn/a1/api/v7'
    HOST_API_SERVER_11 = 'https://platx.erpsheet.vn/a1/api/v8'
    HOST_API_SERVER_12 = 'https://platx.erpsheet.vn/a1/api/v9'
    HOST_API_SERVER_13 = 'https://platx.erpsheet.vn/a3'
    HOST_API_SERVER_14 = 'https://platx.erpsheet.vn/a1/api/v10'
    HOST_API_SERVER_15 = 'https://platx.erpsheet.vn/#/app/erp/p/asst-aems/maintain/mr-04'
    HOST_API_SERVER_16 = 'https://platx.erpsheet.vn/a1/api/v11'
    HOST_API_SERVER_17 = 'https://platx.erpsheet.vn/a3/secure-file-item-print'
    HOST_API_SERVER_18 = 'https://platx.erpsheet.vn/a3/secure-file-wh-location-print'
    HOST_API_SERVER_19 = 'https://platx.erpsheet.vn/a3/secure-file-itemlot-print'
    HOST_API_SERVER_20 = 'https://platx.erpsheet.vn/a1/api/v12'
  } else {
    HOST_API_SERVER_1 = `${devBaseUrl}/api/v1`
    HOST_API_SERVER_2 = `${devBaseUrl}/api/v2`
    HOST_API_SERVER_3 = `${devBaseUrl}/api/v3`
    HOST_API_SERVER_4 = `${devBaseUrl}/api/v4`
    HOST_API_SERVER_5 = 'http://localhost:8089/api/v5'
    HOST_API_SERVER_6 = 'http://localhost:8089/uploads'
    HOST_API_SERVER_7 = 'http://localhost:8089/docx/print-logs'
    HOST_API_SERVER_8 = `${devBaseUrl}/api/v5`
    HOST_API_SERVER_9 = `${devBaseUrl}/api/v6`
    HOST_API_SERVER_10 = `${devBaseUrl}/api/v7`
    HOST_API_SERVER_11 = `${devBaseUrl}/api/v8`
    HOST_API_SERVER_12 = `${devBaseUrl}/api/v9`
    HOST_API_SERVER_13 = 'http://localhost:5159'
    HOST_API_SERVER_14 = `${devBaseUrl}/api/v10`
    HOST_API_SERVER_15 = 'http://localhost:5173/#/app/erp/p/asst-aems/maintain/mr-04'
    HOST_API_SERVER_16 = `${devBaseUrl}/api/v11`
    HOST_API_SERVER_17 = 'http://localhost:5159/secure-file-item-print'
    HOST_API_SERVER_18 = 'http://localhost:5159/secure-file-wh-location-print'
    HOST_API_SERVER_19 = 'http://localhost:5159/secure-file-itemlot-print'
    HOST_API_SERVER_20 = `${devBaseUrl}/api/v12`
  }

  // Update dynamic axios baseURL if apiService is initialized
  import('./apiService')
    .then((m) => {
      if (m?.default?.defaults) {
        m.default.defaults.baseURL = HOST_API_SERVER_1
      }
    })
    .catch(() => {})
}

const initialEnv =
  (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) || 'dev'
updateApiServers(initialEnv)

if (typeof window !== 'undefined') {
  // Listen for storage events (fired across windows/tabs)
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key === 'envSelection') {
      const currentEnv = localStorage.getItem('envSelection') || 'dev'
      updateApiServers(currentEnv)
    }
  })

  // Listen for custom environment change event
  window.addEventListener('env-changed', (e) => {
    const currentEnv = e.detail || localStorage.getItem('envSelection') || 'dev'
    updateApiServers(currentEnv)
  })

  // Listen for electron IPC environment change
  if (window.electron?.onEnvChanged) {
    window.electron.onEnvChanged((env) => {
      if (env) {
        localStorage.setItem('envSelection', env)
        updateApiServers(env)
        window.dispatchEvent(new CustomEvent('env-changed', { detail: env }))
        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new Event('TITLE_UPDATE'))
      }
    })
  }
}
