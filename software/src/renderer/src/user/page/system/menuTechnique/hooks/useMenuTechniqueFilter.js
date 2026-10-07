/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'

export const STORAGE_KEY_VALS = 'q_vals_menu_tech'
export const STORAGE_KEY_FIELDS = 'q_fields_menu_tech'

export function useMenuTechniqueFilter(setStatusMessage) {
  const { t } = useTranslation()

  // 1. Quản lý trạng thái bộ lọc từ LocalStorage
  const [label, setLabel] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.Label || saved.label || ''
    } catch {
      return ''
    }
  })

  const [keyMenu, setKeyMenu] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.Key || saved.keyMenu || ''
    } catch {
      return ''
    }
  })

  const [type, setType] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.Type || saved.type || ''
    } catch {
      return ''
    }
  })

  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.Label
      delete clean.label
      delete clean.Key
      delete clean.key
      delete clean.keyMenu
      delete clean.Type
      delete clean.type
      delete clean.KeyItem
      delete clean.KeyItem1
      delete clean.KeyMenuItem
      return clean
    } catch {
      return {}
    }
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_FIELDS) || '[]')
      return Array.isArray(stored)
        ? stored.filter((f) => f && f.key !== 'Status' && f.key !== 'IndexNo' && f.key !== 'Id')
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
            k !== 'Label' &&
            k !== 'label' &&
            k !== 'Key' &&
            k !== 'key' &&
            k !== 'keyMenu' &&
            k !== 'Type' &&
            k !== 'type' &&
            k !== 'KeyItem' &&
            k !== 'KeyItem1' &&
            k !== 'KeyMenuItem' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (label && label.trim()) cleanVals.Label = label.trim()
        if (keyMenu && keyMenu.trim()) cleanVals.Key = keyMenu.trim()
        if (type && type.trim()) cleanVals.Type = type.trim()
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, label, keyMenu, type])

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
    if (!columnKey || columnKey === 'Status' || columnKey === 'IndexNo' || columnKey === 'Id')
      return
    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'label' || normalizedKey === 'key' || normalizedKey === 'type') return

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
    setLabel('')
    setKeyMenu('')
    setType('')
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
    if (label && label.trim()) {
      searchParams.Label = label.trim()
    }
    if (keyMenu && keyMenu.trim()) {
      searchParams.Key = keyMenu.trim()
    }
    if (type && type.trim()) {
      searchParams.Type = type.trim()
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (
        k === 'Label' ||
        k === 'label' ||
        k === 'Key' ||
        k === 'key' ||
        k === 'keyMenu' ||
        k === 'Type' ||
        k === 'type' ||
        k === 'KeyItem' ||
        k === 'KeyItem1' ||
        k === 'KeyMenuItem'
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
  }, [label, keyMenu, type, searchValues])

  return {
    label,
    setLabel,
    keyMenu,
    setKeyMenu,
    type,
    setType,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
