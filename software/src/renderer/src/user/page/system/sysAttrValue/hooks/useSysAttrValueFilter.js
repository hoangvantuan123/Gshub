import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'

export const STORAGE_KEY_VALS = 'q_vals_sys_attr_val'
export const STORAGE_KEY_FIELDS = 'q_fields_sys_attr_val'

export function useSysAttrValueFilter(setStatusMessage) {
  const { t } = useTranslation()

  // 1. Quản lý trạng thái bộ lọc từ LocalStorage
  const [groupCode, setGroupCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.GroupCode || saved.groupCode || ''
    } catch {
      return ''
    }
  })

  const [attrValueCode, setAttrValueCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.AttrValueCode || saved.attrValueCode || ''
    } catch {
      return ''
    }
  })

  const [attrValueName, setAttrValueName] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.AttrValueName || saved.attrValueName || ''
    } catch {
      return ''
    }
  })

  const [isActive, setIsActive] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.IsActive !== undefined ? String(saved.IsActive) : ''
    } catch {
      return ''
    }
  })

  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.GroupCode
      delete clean.groupCode
      delete clean.AttrValueCode
      delete clean.attrValueCode
      delete clean.AttrValueName
      delete clean.attrValueName
      delete clean.IsActive
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
            k !== 'GroupCode' &&
            k !== 'groupCode' &&
            k !== 'AttrValueCode' &&
            k !== 'attrValueCode' &&
            k !== 'AttrValueName' &&
            k !== 'attrValueName' &&
            k !== 'IsActive' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (groupCode && groupCode.trim()) cleanVals.GroupCode = groupCode.trim()
        if (attrValueCode && attrValueCode.trim()) cleanVals.AttrValueCode = attrValueCode.trim()
        if (attrValueName && attrValueName.trim()) cleanVals.AttrValueName = attrValueName.trim()
        if (isActive !== '') cleanVals.IsActive = isActive
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, groupCode, attrValueCode, attrValueName, isActive])

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
      columnKey === 'IndexNo' ||
      columnKey === 'Id' ||
      columnKey === 'IdSeq'
    )
      return
    const normalizedKey = columnKey.toLowerCase()
    if (
      normalizedKey === 'groupcode' ||
      normalizedKey === 'attrvaluecode' ||
      normalizedKey === 'attrvaluename' ||
      normalizedKey === 'isactive'
    )
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
    setGroupCode('')
    setAttrValueCode('')
    setAttrValueName('')
    setIsActive('')
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
    if (groupCode && groupCode.trim()) {
      searchParams.GroupCode = groupCode.trim()
    }
    if (attrValueCode && attrValueCode.trim()) {
      searchParams.AttrValueCode = attrValueCode.trim()
    }
    if (attrValueName && attrValueName.trim()) {
      searchParams.AttrValueName = attrValueName.trim()
    }
    if (isActive !== '') {
      searchParams.IsActive = isActive === 'true' || isActive === '1' || isActive === true
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (
        k === 'GroupCode' ||
        k === 'groupCode' ||
        k === 'AttrValueCode' ||
        k === 'attrValueCode' ||
        k === 'AttrValueName' ||
        k === 'attrValueName' ||
        k === 'IsActive'
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
  }, [groupCode, attrValueCode, attrValueName, isActive, searchValues])

  return {
    groupCode,
    setGroupCode,
    attrValueCode,
    setAttrValueCode,
    attrValueName,
    setAttrValueName,
    isActive,
    setIsActive,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
