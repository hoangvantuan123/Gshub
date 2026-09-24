import { apiPost, apiGet } from '../../services/apiClient'

export const PostAddRootMenu = (result, options = {}) =>
  apiPost('/menu/RootMenuA', { result }, options)
export const PostRootMenuU = (result, options = {}) =>
  apiPost('/menu/RootMenuU', { result }, options)
export const PostRootMenuD = (result, options = {}) =>
  apiPost('/menu/RootMenuD', { result }, options)
export const PostRootMenuQ = (result, options = {}) =>
  apiPost('/menu/RootMenuQ', { result }, options)

// Standard Aliases
export const PostARootMenu = PostAddRootMenu
export const PostURootMenu = PostRootMenuU
export const PostDRootMenu = PostRootMenuD
export const PostQRootMenu = PostRootMenuQ

export const PostRootMenu = (Label, Key, Icon, Link, options = {}) =>
  apiPost('/system-users/metasys-root-menu', { Label, Key, Icon, Link }, options)
export const PostRolesRootMenu = (rootMenuIds, groupId, type, options = {}) =>
  apiPost('/system-users/metasys-roles-root-menus', { rootMenuIds, groupId, type }, options)

export const GetAllRootMenus = (options = {}) =>
  apiGet('/system-users/metasys-root-menu-all', {}, options)
export const getRootMenusNotInRole = (roleId, options = {}) =>
  apiGet('/system-users/root-menus-not-in-role', { roleId }, options)
export const SearchRootMenu = (searchValue, searchFields, signal) =>
  apiPost('/system-users/search-root-menus', { searchValue, searchFields }, { signal })
