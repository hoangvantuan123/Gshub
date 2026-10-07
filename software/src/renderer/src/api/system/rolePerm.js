import { apiPost } from '../../services/apiClient'

// ─── ROLE PERMISSION & ASSIGNMENT APIS ───
export const PostARole = (result, options = {}) => apiPost('/role/RoleA', { result }, options)
export const PostURole = (result, options = {}) => apiPost('/role/RoleU', { result }, options)
export const PostDRole = (result, options = {}) => apiPost('/role/RoleD', { result }, options)
export const PostQRole = (result, options = {}) => apiPost('/role/RoleQ', { result }, options)

// Gán tài khoản vào nhóm quyền (User-Role Mapping)
export const PostAUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleA', { result }, options)
export const PostDUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleD', { result }, options)
export const PostUUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleU', { result }, options)
export const PostQUserRole = (result, options = {}) =>
  apiPost('/role/UserRoleQ', { result }, options)

// Quyền truy cập Menu và RootMenu theo vai trò
export const PostQMenuRole = (result, options = {}) =>
  apiPost('/role/MenuRoleQ', { result }, options)
export const PostUMenuRole = (result, options = {}) =>
  apiPost('/role/MenuRoleU', { result }, options)
export const PostQRootMenuRole = (result, options = {}) =>
  apiPost('/role/RootMenuRoleQ', { result }, options)
export const PostURootMenuRole = (result, options = {}) =>
  apiPost('/role/RootMenuRoleU', { result }, options)


// Quyền Action / Nút Lệnh theo Menu & Vai trò
export const PostQActionRole = (result, options = {}) =>
  apiPost('/role/ActionRoleQ', { result }, options)
export const PostUActionRole = (result, options = {}) =>
  apiPost('/role/ActionRoleU', { result }, options)

// Ma trận quyền tài nguyên & cây menu
export const PostQPermResourceTree = (result = {}, options = {}) =>
  apiPost('/role/RoleQ', { result: { Sheet: 'perm_resource_tree', ...result } }, options)

