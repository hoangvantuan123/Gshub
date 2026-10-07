import { apiPost } from '../../services/apiClient'

export const PostLangDictH = (searchParams = {}, options = {}) =>
  apiPost('/help/LangDictH', searchParams, options)
