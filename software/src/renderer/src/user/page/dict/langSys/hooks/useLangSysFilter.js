import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'

export const STORAGE_KEY_VALS = 'S_ERP_QUERY_VALS_PAGE_LANG_SYS'
export const STORAGE_KEY_FIELDS = 'S_ERP_QUERY_FIELDS_PAGE_LANG_SYS'

export function useLangSysFilter(setStatusMessage) {
  const { t } = useTranslation()

  // 1. Quản lý trạng thái bộ lọc từ LocalStorage
  const [languageName, setLanguageName] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.LanguageName || saved.languageName || saved.KeyItem1 || ''
    } catch {
      return ''
    }
  })

  const [languageCode, setLanguageCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.LanguageCode || saved.languageCode || ''
    } catch {
      return ''
    }
  })

  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.LanguageName
      delete clean.languageName
      delete clean.LanguageCode
      delete clean.languageCode
      delete clean.KeyItem1
      return clean
    } catch {
      return {}
    }
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_FIELDS) || '[]')
      return Array.isArray(stored)
        ? stored.filter(
            (f) => f && f.key !== 'Status' && f.key !== 'IdxNo' && f.key !== 'LanguageSeq'
          )
        : []
    } catch {
      return []
    }
  })

  // 2. Lưu cache giá trị tìm kiếm vào LocalStorage có debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cleanVals = {}
        Object.entries(searchValues || {}).forEach(([k, v]) => {
          if (
            k !== 'LanguageName' &&
            k !== 'languageName' &&
            k !== 'LanguageCode' &&
            k !== 'languageCode' &&
            k !== 'KeyItem1' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (languageName && languageName.trim()) cleanVals.LanguageName = languageName.trim()
        if (languageCode && languageCode.trim()) cleanVals.LanguageCode = languageCode.trim()
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, languageName, languageCode])

  // 3. Lưu cache danh sách trường tìm kiếm động vào LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_FIELDS, JSON.stringify(dynamicQueryFields))
      } catch (e) {
        console.warn('Lỗi lưu cache query fields:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [dynamicQueryFields])

  // 4. Thêm động cột lên thanh điều kiện truy vấn khi ấn Ctrl+F trên sheet
  const handleAddQueryField = useCallback((columnKey, colTitle, col) => {
    if (
      !columnKey ||
      columnKey === 'Status' ||
      columnKey === 'IdxNo' ||
      columnKey === 'LanguageSeq'
    )
      return
    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'languagename' || normalizedKey === 'languagecode') return

    const isDateField =
      col?.type === 'date-range' ||
      col?.type === 'date' ||
      /Date|CreatedAt|UpdatedAt|Time/i.test(columnKey)

    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key.toLowerCase() === normalizedKey)) return prev
      return [
        ...prev,
        {
          key: columnKey,
          label: colTitle || columnKey,
          type:
            col?.type || (isDateField ? 'date-range' : col?.kind === 'Boolean' ? 'select' : 'text'),
          colSpan: col?.colSpan || (isDateField ? 2 : 1),
          placeholder: `Tìm theo ${colTitle || columnKey}...`,
          options:
            col?.options ||
            (col?.kind === 'Boolean'
              ? [
                  { value: '', label: 'Tất cả' },
                  { value: '1', label: 'Có' },
                  { value: '0', label: 'Không' }
                ]
              : undefined),
          removable: true
        }
      ]
    })
  }, [])

  // 5. Xóa bớt cột điều kiện truy vấn động
  const handleRemoveQueryField = useCallback((key) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== key))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // 6. Đặt lại mặc định điều kiện truy vấn và xóa cache
  const handleResetQuery = useCallback(() => {
    setLanguageName('')
    setLanguageCode('')
    setSearchValues({})
    setDynamicQueryFields([])
    try {
      localStorage.removeItem(STORAGE_KEY_VALS)
      localStorage.removeItem(STORAGE_KEY_FIELDS)
    } catch (e) {
      console.warn('Lỗi khi xóa cache bộ lọc:', e)
    }
    if (setStatusMessage) {
      setStatusMessage({ type: 'info', text: t('Đã đặt lại điều kiện tìm kiếm về mặc định.') })
    }
  }, [t, setStatusMessage])

  // 7. Tạo search parameters chuẩn hóa gửi lên API LangQ
  const buildSearchParams = useCallback(() => {
    const searchParams = {}
    if (languageName && languageName.trim()) {
      searchParams.KeyItem1 = languageName.trim()
      searchParams.LanguageName = languageName.trim()
    } else if (languageCode && languageCode.trim()) {
      searchParams.KeyItem1 = languageCode.trim()
    } else {
      searchParams.KeyItem1 = ''
    }

    if (languageCode && languageCode.trim()) {
      searchParams.LanguageCode = languageCode.trim()
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (
        k === 'LanguageName' ||
        k === 'languageName' ||
        k === 'LanguageCode' ||
        k === 'languageCode' ||
        k === 'KeyItem1'
      ) {
        return
      }

      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) {
          const start = v[0] ? toApiDate(v[0]) : ''
          const end = v[1] ? toApiDate(v[1]) : ''
          if (start) searchParams[`${k}From`] = start
          if (end) searchParams[`${k}To`] = end
        } else if (dayjs.isDayjs(v) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(String(v))) {
          searchParams[k] = toApiDate(v)
        } else if (String(v).trim() !== '') {
          searchParams[k] = String(v).trim()
        }
      }
    })
    return searchParams
  }, [languageName, languageCode, searchValues])

  return {
    languageName,
    setLanguageName,
    languageCode,
    setLanguageCode,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
