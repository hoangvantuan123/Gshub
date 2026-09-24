import { apiPost } from '../../services/apiClient'

// ─── PERMISSION SCOPES APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostAPermScopes = (result, options = {}) =>
  apiPost('/role/PermScopesA', { result }, options)
export const PostUPermScopes = (result, options = {}) =>
  apiPost('/role/PermScopesU', { result }, options)
export const PostDPermScopes = (result, options = {}) =>
  apiPost('/role/PermScopesD', { result }, options)
export const PostQPermScopes = (result = {}, options = {}) => {
  const metadata = {}
  if (result && typeof result === 'object') {
    Object.entries(result).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        metadata[k] = String(v)
      }
    })
  }
  return apiPost('/role/PermScopesQ', { result, metadata }, options)
}
