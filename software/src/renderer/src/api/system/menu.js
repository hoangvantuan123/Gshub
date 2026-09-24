import { apiPost, apiGet } from '../../services/apiClient'

export const PostAddMenu = (result, options = {}) => apiPost('/menu/MenuA', { result }, options)
export const PostUMenu = (result, options = {}) => apiPost('/menu/MenuU', { result }, options)
export const PostDMenu = (result, options = {}) => apiPost('/menu/MenuD', { result }, options)
export const PostQMenu = (result, options = {}) => apiPost('/menu/MenuQ', { result }, options)

// Standard Aliases
export const DeleteMenus = PostDMenu
export const PostAMenu = PostAddMenu
export const PostMenuA = PostAddMenu
export const PostMenuU = PostUMenu
export const PostMenuD = PostDMenu
export const PostMenuQ = PostQMenu

export const PostMenu = (Label, Type, Key, Link, MenuRootId, MenuSubRootId, options = {}) =>
  apiPost(
    '/system-users/metasys-menu',
    { Label, Type, Key, Link, MenuRootId, MenuSubRootId },
    options
  )
export const PostRolesMenu = (menuIds, groupId, type, options = {}) =>
  apiPost('/system-users/metasys-roles-menus', { menuIds, groupId, type }, options)
export const getMenusNotInRole = (roleId, options = {}) =>
  apiGet('/system-users/menus-not-in-role', { roleId }, options)
export const SearchMenu = (searchValue, searchFields, signal) =>
  apiPost('/system-users/search-menus', { searchValue, searchFields }, { signal })
