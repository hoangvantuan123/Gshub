import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'

export const STORAGE_KEY_VALS = 'S_ERP_QUERY_VALS_PAGE_DICT_SYS'
export const STORAGE_KEY_FIELDS = 'S_ERP_QUERY_FIELDS_PAGE_DICT_SYS'

export function useDictSysFilter(setStatusMessage) {
  const { t } = useTranslation()

  const [languageSeq, setLanguageSeq] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.LanguageSeq || saved.languageSeq || saved.KeyItem1 || ''
    } catch {
      return ''
    }
  })

  const [word, setWord] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.Word || saved.word || saved.KeyItem2 || ''
    } catch {
      return ''
    }
  })

  const [wordSeq, setWordSeq] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.WordSeq || saved.wordSeq || saved.KeyItem3 || ''
    } catch {
      return ''
    }
  })

  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.LanguageSeq
      delete clean.languageSeq
      delete clean.Word
      delete clean.word
      delete clean.WordSeq
      delete clean.wordSeq
      delete clean.KeyItem1
      delete clean.KeyItem2
      delete clean.KeyItem3
      return clean
    } catch {
      return {}
    }
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_FIELDS) || '[]')
      return Array.isArray(stored)
        ? stored.filter((f) => f && f.key !== 'Status' && f.key !== 'IdxNo' && f.key !== 'IdSeq')
        : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cleanVals = {}
        Object.entries(searchValues || {}).forEach(([k, v]) => {
          if (
            k !== 'LanguageSeq' &&
            k !== 'Word' &&
            k !== 'WordSeq' &&
            k !== 'KeyItem1' &&
            k !== 'KeyItem2' &&
            k !== 'KeyItem3' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (languageSeq && String(languageSeq).trim())
          cleanVals.LanguageSeq = String(languageSeq).trim()
        if (word && word.trim()) cleanVals.Word = word.trim()
        if (wordSeq && String(wordSeq).trim()) cleanVals.WordSeq = String(wordSeq).trim()
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, languageSeq, word, wordSeq])

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

  const handleAddQueryField = useCallback((columnKey, colTitle, col) => {
    if (!columnKey || columnKey === 'Status' || columnKey === 'IdxNo' || columnKey === 'IdSeq')
      return
    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'languageseq' || normalizedKey === 'word' || normalizedKey === 'wordseq')
      return

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

  const handleRemoveQueryField = useCallback((key) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== key))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleResetQuery = useCallback(() => {
    setLanguageSeq('')
    setWord('')
    setWordSeq('')
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

  const buildSearchParams = useCallback(() => {
    const searchParams = {
      KeyItem1: languageSeq ? Number(languageSeq) : 0,
      KeyItem2: word ? word.trim() : '',
      KeyItem3: wordSeq ? String(wordSeq).trim() : ''
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (
        k === 'LanguageSeq' ||
        k === 'Word' ||
        k === 'WordSeq' ||
        k === 'KeyItem1' ||
        k === 'KeyItem2' ||
        k === 'KeyItem3'
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
  }, [languageSeq, word, wordSeq, searchValues])

  return {
    languageSeq,
    setLanguageSeq,
    word,
    setWord,
    wordSeq,
    setWordSeq,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
