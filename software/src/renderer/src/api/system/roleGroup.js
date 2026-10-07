import { apiPost } from '../../services/apiClient'

// ─── ROLE GROUP APIS (A, U, D, Q) ───
export const PostARoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupA', { result }, options)

export const PostDRoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupD', { result }, options)

export const PostURoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupU', { result }, options)

export const PostQRoleGroup = (result, options = {}) =>
  apiPost('/role/RoleGroupQ', { result }, options)
