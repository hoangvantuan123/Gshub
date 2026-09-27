import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'

export const STORAGE_KEY_VALS = 'q_vals_perm_scope'
export const STORAGE_KEY_FIELDS = 'q_fields_perm_scope'

export function usePermScopeFilter(setStatusMessage) {
  const { t } = useTranslation()

  // 1. Quản lý trạng thái bộ lọc từ LocalStorage
  const [scopeCode, setScopeCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.ScopeCode || saved.scopeCode || ''
    } catch {
      return ''
    }
  })

  const [scopeName, setScopeName] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.ScopeName || saved.scopeName || ''
    } catch {
      return ''
    }
  })

  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.ScopeCode
      delete clean.scopeCode
      delete clean.ScopeName
      delete clean.scopeName
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
            (f) =>
              f && f.key !== 'Status' && f.key !== 'IndexNo' && f.key !== 'Id' && f.key !== 'IdSeq'
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
            k !== 'ScopeCode' &&
            k !== 'scopeCode' &&
            k !== 'ScopeName' &&
            k !== 'scopeName' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (scopeCode && scopeCode.trim()) cleanVals.ScopeCode = scopeCode.trim()
        if (scopeName && scopeName.trim()) cleanVals.ScopeName = scopeName.trim()
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values perm_scope:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, scopeCode, scopeName])

  // 3. Lưu cache danh sách trường tìm kiếm động vào LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_FIELDS, JSON.stringify(dynamicQueryFields))
      } catch (e) {
        console.warn('Lỗi lưu cache query fields perm_scope:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [dynamicQueryFields])

  // 4. Thêm động cột lên thanh điều kiện truy vấn khi ấn Ctrl+F trên sheet
  const handleAddQueryField = useCallback((columnKey, colTitle, col) => {
    if (
      !columnKey ||
      columnKey === 'Status' ||
      columnKey === 'IndexNo' ||
      columnKey === 'Id' ||
      columnKey === 'IdSeq'
    )
      return
    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'scopecode' || normalizedKey === 'scopename') return

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
    setScopeCode('')
    setScopeName('')
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

  // 7. Tạo search parameters chuẩn hóa gửi lên API
  const buildSearchParams = useCallback(() => {
    const searchParams = {}
    if (scopeCode && scopeCode.trim()) {
      searchParams.ScopeCode = scopeCode.trim()
    }
    if (scopeName && scopeName.trim()) {
      searchParams.ScopeName = scopeName.trim()
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (k === 'ScopeCode' || k === 'scopeCode' || k === 'ScopeName' || k === 'scopeName') {
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
  }, [scopeCode, scopeName, searchValues])

  return {
    scopeCode,
    setScopeCode,
    scopeName,
    setScopeName,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
