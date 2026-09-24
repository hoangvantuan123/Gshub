import { apiPost } from '../../services/apiClient'

// ─── PERMISSION ACTIONS APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostAPermActions = (result, options = {}) =>
  apiPost('/role/PermActionsA', { result }, options)
export const PostUPermActions = (result, options = {}) =>
  apiPost('/role/PermActionsU', { result }, options)
export const PostDPermActions = (result, options = {}) =>
  apiPost('/role/PermActionsD', { result }, options)
export const PostQPermActions = (result = {}, options = {}) => {
  const metadata = {}
  if (result && typeof result === 'object') {
    Object.entries(result).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        metadata[k] = String(v)
      }
    })
  }
  return apiPost('/role/PermActionsQ', { result, metadata }, options)
}

// ─── PERMISSION ACTIONS CODEHELP API (H) ───
export const PostPermActionsH = (result, options = {}) =>
  apiPost('/help/PermActionsH', { result }, options)
