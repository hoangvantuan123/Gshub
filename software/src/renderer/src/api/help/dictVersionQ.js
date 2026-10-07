import { apiPost } from '../../services/apiClient'

export const DictVersionQ = (langCode, options = {}) => {
  const isSeq = typeof langCode === 'number'
  const payload = isSeq
    ? { KeyItem1: langCode, KeyItem2: String(langCode) }
    : { KeyItem2: String(langCode || 'vi').toLowerCase() }
  return apiPost('/help/DictVersionQ', payload, options)
}
