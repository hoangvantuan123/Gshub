import { apiPost } from '../../services/apiClient'

export * from './dictVersionQ'
export * from './postLangDictH'
export * from './checkLanguageVersion'

// ── Help Query APIs ────────────────────────────────────────
export const getHelpMenu = (data = {}, options = {}) =>
  apiPost('/help/MenuH', { result: data }, options)

export const getHelpRoleRootMenu = (data = {}, options = {}) =>
  apiPost('/help/RootMenuH', { result: data }, options)

export const getHelpUsers = (data = {}, options = {}) =>
  apiPost('/help/UsersH', { result: data }, options)

export const PostLangH = (result = {}, options = {}) =>
  apiPost('/help/LangH', { result }, options)

export const PostMenuH = (result, options = {}) =>
  apiPost('/help/MenuH', { result }, options)

export const PostRootMenuH = (result, options = {}) =>
  apiPost('/help/RootMenuH', { result }, options)

export const PostSubMenuH = (result, options = {}) =>
  apiPost('/help/SubMenuH', { result }, options)

export const CodeHelpQ = (result, options = {}) =>
  apiPost('/help/CodeHelpQ', { result }, options)

// CodeHelpCmnQ: Đầu API CodeHelp dùng chung (Common CodeHelp Engine)
// Truyền CodeHelpName hoặc TableName ('PERM_FIELDS', 'PERM_ACTIONS', 'PERM_SCOPES', 'SUBMENU', 'USERS', ...)
export const CodeHelpCmnQ = (result, options = {}) =>
  apiPost('/help/CodeHelpCmnQ', { result }, options)

export const PostCodeHelpQ = CodeHelpQ
export const PostCodeHelpCmnQ = CodeHelpCmnQ

export const PostSysAttrGroupH = (result, options = {}) =>
  apiPost('/help/SysAttrGroupH', { result }, options)

export const PostPermActionsH = (result, options = {}) =>
  apiPost('/help/PermActionsH', { result }, options)

export const PostPermFieldsH = (result, options = {}) =>
  apiPost('/help/PermFieldsH', { result }, options)

export const PostPermScopesH = (result, options = {}) =>
  apiPost('/help/PermScopesH', { result }, options)

export const PostUsersH = (result, options = {}) =>
  apiPost('/help/UsersH', { result }, options)
