import { apiPost } from '../../services/apiClient'

// ─── PERMISSION FIELDS APIS (1 A, 1 U, 1 D, 1 Q) ───
export const PostAPermFields = (result, options = {}) =>
  apiPost('/role/PermFieldsA', { result }, options)
export const PostUPermFields = (result, options = {}) =>
  apiPost('/role/PermFieldsU', { result }, options)
export const PostDPermFields = (result, options = {}) =>
  apiPost('/role/PermFieldsD', { result }, options)
export const PostQPermFields = (result = {}, options = {}) => {
  const metadata = {}
  if (result && typeof result === 'object') {
    Object.entries(result).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        metadata[k] = String(v)
      }
    })
  }
  return apiPost('/role/PermFieldsQ', { result, metadata }, options)
}
