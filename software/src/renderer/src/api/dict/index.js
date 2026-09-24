import { apiPost } from '../../services/apiClient'

// ── Language APIs (/lang/Lang*) ──────────────────────────
export const PostALang = (result, options = {}) => apiPost('/lang/LangA', { result }, options)
export const PostULang = (result, options = {}) => apiPost('/lang/LangU', { result }, options)
export const PostDLang = (result, options = {}) => apiPost('/lang/LangD', { result }, options)
export const PostQLang = (result, options = {}) => apiPost('/lang/LangQ', { result }, options)

// ── Dictionary APIs (/lang/Dict*) ────────────────────────
export const PostADict = (result, options = {}) => apiPost('/lang/DictA', { result }, options)
export const PostUDict = (result, options = {}) => apiPost('/lang/DictU', { result }, options)
export const PostDDict = (result, options = {}) => apiPost('/lang/DictD', { result }, options)
export const PostQDict = (result, options = {}) => apiPost('/lang/DictQ', { result }, options)
