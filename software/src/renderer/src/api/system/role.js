import { apiPost, apiGet } from '../../services/apiClient'

// ─── UNIFIED ROLE APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostARole = (result, options = {}) => apiPost('/role/RoleA', { result }, options)
export const PostURole = (result, options = {}) => apiPost('/role/RoleU', { result }, options)
export const PostDRole = (result, options = {}) => apiPost('/role/RoleD', { result }, options)
export const PostQRole = (result, options = {}) => apiPost('/role/RoleQ', { result }, options)

export const PostARoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupA', { result }, options)
export const PostDRoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupD', { result }, options)
export const PostURoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupU', { result }, options)
export const PostQRoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupQ', { result }, options)

export const PostAUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleA', { result }, options)
export const PostDUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleD', { result }, options)
export const PostUUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleU', { result }, options)
export const PostQUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleQ', { result }, options)

export const PostQMenuRole = (result, options = {}) =>
  apiPost('/role/MenuRoleQ', { result }, options)
export const PostQRootMenuRole = (result, options = {}) =>
  apiPost('/role/RootMenuRoleQ', { result }, options)

export const PostRolesUser = (userIds, groupId, type, options = {}) =>
  apiPost('/mssql/system-users/metasys-roles-users', { userIds, groupId, type }, options)
export const PostRolesMenu = (menuIds, groupId, type, options = {}) =>
  apiPost('/system-users/metasys-roles-menus', { menuIds, groupId, type }, options)
export const getUsersNotInRole = (roleId, options = {}) =>
  apiGet('/mssql/system-users/users-not-in-role', { roleId }, options)
