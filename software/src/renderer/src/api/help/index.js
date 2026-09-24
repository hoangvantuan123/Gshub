import { apiPost, request } from '../../services/apiClient'
import { HOST_API_SERVER_9 } from '../../services'

export * from './dictVersionQ'
export * from './postLangDictH'
export * from './checkLanguageVersion'

// ── Help Query APIs ────────────────────────────────────────
export const getHelpMenu = (data = {}, options = {}) =>
  apiPost('/mssql/help-query/help-menu', data, options)

export const getHelpRoleRootMenu = (data = {}, options = {}) =>
  apiPost('/mssql/help-query/help-root-menu', data, options)

export const getHelpUsers = (data = {}, options = {}) =>
  apiPost('/mssql/help-query/help-users', data, options)

export const PostLangH = (result = {}, options = {}) => apiPost('/help/LangH', { result }, options)

export const PostMenuH = (result, options = {}) =>
  request({ method: 'POST', url: `${HOST_API_SERVER_9}/help/MenuH`, data: { result }, ...options })

export const PostRootMenuH = (result, options = {}) =>
  request({
    method: 'POST',
    url: `${HOST_API_SERVER_9}/help/RootMenuH`,
    data: { result },
    ...options
  })

export const PostSubMenuH = (result, options = {}) =>
  request({
    method: 'POST',
    url: `${HOST_API_SERVER_9}/help/SubMenuH`,
    data: { result },
    ...options
  })

export const PostCodeHelpQ = (result, options = {}) =>
  request({
    method: 'POST',
    url: `${HOST_API_SERVER_9}/help/CodeHelpQ`,
    data: { result },
    ...options
  })

export const PostSysAttrGroupH = (result, options = {}) =>
  request({
    method: 'POST',
    url: `${HOST_API_SERVER_9}/help/SysAttrGroupH`,
    data: { result },
    ...options
  })

export const PostPermActionsH = (result, options = {}) =>
  request({
    method: 'POST',
    url: `${HOST_API_SERVER_9}/help/PermActionsH`,
    data: { result },
    ...options
  })

export const PostUsersH = (result, options = {}) =>
  request({ method: 'POST', url: `${HOST_API_SERVER_9}/help/UsersH`, data: { result }, ...options })
