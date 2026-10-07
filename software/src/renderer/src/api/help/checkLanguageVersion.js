import { getLanguageMetadata, hasLanguageData } from '../../IndexedDB/loadLanguageData'
import { saveLanguageData } from '../../IndexedDB/saveLanguageData'
import { PostLangDictH } from './postLangDictH'
import { DictVersionQ } from './dictVersionQ'

let inFlightSyncPromise = null
const CHECK_COOLDOWN_MS = 30 * 60 * 1000

export const checkAndSyncLanguage = async (langKey = 'vn', forceCheck = false) => {
  const isSeq = typeof langKey === 'number'
  const langCode = isSeq ? String(langKey) : String(langKey || 'vn').toLowerCase()

  if (inFlightSyncPromise) {
    return inFlightSyncPromise
  }

  inFlightSyncPromise = (async () => {
    try {
      const exists = await hasLanguageData(langCode)
      const localMeta = await getLanguageMetadata(langCode)
      const lastCheckKey = `lang_last_check_${langCode}`
      const lastCheck = Number(localStorage.getItem(lastCheckKey)) || 0
      const now = Date.now()

      // Nếu đã có dữ liệu và chưa hết cooldown (và không bắt buộc check), không cần gọi server
      if (exists && localMeta?.versionHash && !forceCheck && now - lastCheck < CHECK_COOLDOWN_MS) {
        return false
      }

      // Chỉ gửi request nhỏ gọn kiểm tra version hash trên server
      const versionRes = await DictVersionQ(langCode)
      localStorage.setItem(lastCheckKey, now.toString())

      const serverVersion = versionRes.success
        ? versionRes.data?.versionHash || versionRes.versionHash || ''
        : ''

      // NẾU PHIÊN BẢN TRÊN SERVER TRÙNG VỚI INDEXEDDB VÀ ĐÃ CÓ DATA -> DỪNG NGAY, KHÔNG TẢI TỪ ĐIỂN
      if (exists && serverVersion && localMeta?.versionHash === serverVersion) {
        return false
      }

      // CHỈ KHI CÓ PHIÊN BẢN MỚI HOẶC CHƯA CÓ DATA MỚI GỌI TẢI TOÀN BỘ TỪ ĐIỂN
      const searchParams = isSeq
        ? { KeyItem1: langKey, KeyItem2: langCode }
        : { KeyItem2: langCode }
      const dictRes = await PostLangDictH(searchParams)

      if (dictRes && dictRes.success && Array.isArray(dictRes.data)) {
        await saveLanguageData({
          typeLanguage: langCode,
          languageData: dictRes.data,
          versionHash: serverVersion || `v_${langCode}_${now}`
        })
        return true
      }

      return false
    } catch (error) {
      console.warn('Language sync error:', error)
      return false
    } finally {
      inFlightSyncPromise = null
    }
  })()

  return inFlightSyncPromise
}
