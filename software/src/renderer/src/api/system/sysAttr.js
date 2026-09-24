import { apiPost } from '../../services/apiClient'

// ─── SYSTEM ATTRIBUTE GROUPS APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostASysAttrGroups = (result, options = {}) =>
  apiPost('/system/SysAttrGroupsA', { result }, options)
export const PostUSysAttrGroups = (result, options = {}) =>
  apiPost('/system/SysAttrGroupsU', { result }, options)
export const PostDSysAttrGroups = (result, options = {}) =>
  apiPost('/system/SysAttrGroupsD', { result }, options)
export const PostQSysAttrGroups = (result, options = {}) =>
  apiPost('/system/SysAttrGroupsQ', { result }, options)

// ─── SYSTEM ATTRIBUTE ITEMS APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostASysAttrItems = (result, options = {}) =>
  apiPost('/system/SysAttrItemsA', { result }, options)
export const PostUSysAttrItems = (result, options = {}) =>
  apiPost('/system/SysAttrItemsU', { result }, options)
export const PostDSysAttrItems = (result, options = {}) =>
  apiPost('/system/SysAttrItemsD', { result }, options)
export const PostQSysAttrItems = (result, options = {}) =>
  apiPost('/system/SysAttrItemsQ', { result }, options)
