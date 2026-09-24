const currentHost = window.location.hostname
const currentPort = window.location.port

export let HOST_API_SERVER_1 = 'http://localhost:8386/api/v1'
export let HOST_API_SERVER_2 = 'http://localhost:8386/api/v2'
export let HOST_API_SERVER_3 = 'http://localhost:8386/api/v3'
export let HOST_API_SERVER_4 = 'http://localhost:8386/api/v4'
export let HOST_API_SERVER_5 = 'http://localhost:8089/api/v5'
export let HOST_API_SERVER_6 = 'http://localhost:8089/uploads'
export let HOST_API_SERVER_7 = 'http://localhost:8089/docx/print-logs'
export let HOST_API_SERVER_8 = 'http://localhost:8386/api/v5'
export let HOST_API_SERVER_9 = 'http://localhost:8386/api/v6'
export let HOST_API_SERVER_10 = 'http://localhost:8386/api/v7'
export let HOST_API_SERVER_11 = 'http://localhost:8386/api/v8'
export let HOST_API_SERVER_12 = 'http://localhost:8386/api/v9'
export let HOST_API_SERVER_13 = 'http://localhost:5159'
export let HOST_API_SERVER_14 = 'http://localhost:8386/api/v10'
export let HOST_API_SERVER_15 = 'http://localhost:5173/#/app/erp/p/asst-aems/maintain/mr-04'
export let HOST_API_SERVER_16 = 'http://localhost:8386/api/v11'
export let HOST_API_SERVER_17 = 'http://localhost:5159/secure-file-item-print'
export let HOST_API_SERVER_18 = 'http://localhost:5159/secure-file-wh-location-print'
export let HOST_API_SERVER_19 = 'http://localhost:5159/secure-file-itemlot-print'
export let HOST_API_SERVER_20 = 'http://localhost:8386/api/v12'

const baseUrl = `${currentHost}${currentPort ? ':' + currentPort : ''}`

export const getApiServerEndpoint = (envSelection) => {
  const env =
    envSelection ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) ||
    'official'
  return env === 'official'
    ? 'https://bravo.goldsunpackaging.vn:5052'
    : 'https://bravo.goldsunpackaging.vn:5051'
}

export const updateApiServers = (envSelection) => {
  const env =
    envSelection ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) ||
    'official'

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
    HOST_API_SERVER_1 = 'http://localhost:8386/api/v1'
    HOST_API_SERVER_2 = 'http://localhost:8386/api/v2'
    HOST_API_SERVER_3 = 'http://localhost:8386/api/v3'
    HOST_API_SERVER_4 = 'http://localhost:8386/api/v4'
    HOST_API_SERVER_5 = 'http://localhost:8089/api/v5'
    HOST_API_SERVER_6 = 'http://localhost:8089/uploads'
    HOST_API_SERVER_7 = 'http://localhost:8089/docx/print-logs'
    HOST_API_SERVER_8 = 'http://localhost:8386/api/v5'
    HOST_API_SERVER_9 = 'http://localhost:8386/api/v6'
    HOST_API_SERVER_10 = 'http://localhost:8386/api/v7'
    HOST_API_SERVER_11 = 'http://localhost:8386/api/v8'
    HOST_API_SERVER_12 = 'http://localhost:8386/api/v9'
    HOST_API_SERVER_13 = 'http://localhost:5159'
    HOST_API_SERVER_14 = 'http://localhost:8386/api/v10'
    HOST_API_SERVER_15 = 'http://localhost:5173/#/app/erp/p/asst-aems/maintain/mr-04'
    HOST_API_SERVER_16 = 'http://localhost:8386/api/v11'
    HOST_API_SERVER_17 = 'http://localhost:5159/secure-file-item-print'
    HOST_API_SERVER_18 = 'http://localhost:5159/secure-file-wh-location-print'
    HOST_API_SERVER_19 = 'http://localhost:5159/secure-file-itemlot-print'
    HOST_API_SERVER_20 = 'http://localhost:8386/api/v12'
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
  (typeof localStorage !== 'undefined' ? localStorage.getItem('envSelection') : null) || 'official'
updateApiServers(initialEnv)

if (typeof window !== 'undefined') {
  // Listen for storage events (fired across windows/tabs)
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key === 'envSelection') {
      const currentEnv = localStorage.getItem('envSelection') || 'official'
      updateApiServers(currentEnv)
    }
  })

  // Listen for custom environment change event
  window.addEventListener('env-changed', (e) => {
    const currentEnv = e.detail || localStorage.getItem('envSelection') || 'official'
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
