/* eslint-disable react/prop-types */
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export const STORAGE_KEY = 'S_ERP_QUERY_FIELDS_plan_detail'

export const DEFAULT_VISIBLE_KEYS = [
  'FactoryName',
  'RegCode',
  'ApplyDate',
  'OperationNo',
  'PicDp',
  'OpDate',
  'ItemCode',
  'ItemName'
]

const DEFAULT_KEYS_SET = new Set(DEFAULT_VISIBLE_KEYS)

export default function PlanDetailQueryFilters({
  columns = [],
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  visibleKeys: controlledVisibleKeys,
  onToggleField: controlledToggleField,
  onResetFields: controlledResetFields,
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery,
  handleSearchData,
  disabled = false
}) {
  const { t } = useTranslation()

  // Lưu trạng thái các trường được hiển thị (nội bộ nếu không được truyền từ parent)
  const [internalVisibleKeys, setInternalVisibleKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed)
        }
      }
    } catch {}
    return new Set(DEFAULT_VISIBLE_KEYS)
  })

  const visibleKeys = controlledVisibleKeys || internalVisibleKeys

  // Bật/tắt cột tìm kiếm động
  const handleToggleField = useCallback(
    (fieldKey, isChecked) => {
      if (controlledToggleField) {
        controlledToggleField(fieldKey, isChecked)
        return
      }
      setInternalVisibleKeys((prev) => {
        const next = new Set(prev)
        if (isChecked) {
          next.add(fieldKey)
        } else {
          next.delete(fieldKey)
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
        } catch {}
        return next
      })
    },
    [controlledToggleField]
  )

  // Đặt lại danh sách cột mặc định
  const handleResetFields = useCallback(() => {
    if (controlledResetFields) {
      controlledResetFields()
      return
    }
    const next = new Set(DEFAULT_VISIBLE_KEYS)
    setInternalVisibleKeys(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
    } catch {}
  }, [controlledResetFields])

  const handleFieldChange = useCallback(
    (key, value) => {
      setSearchValues((prev) => ({
        ...prev,
        [key]: value
      }))
    },
    [setSearchValues]
  )

  // Xóa bỏ một trường tìm kiếm không mặc định (Nút x) và xóa giá trị lọc của nó
  const handleRemoveField = useCallback(
    (fieldKey) => {
      handleToggleField(fieldKey, false)
      handleFieldChange(fieldKey, '')
    },
    [handleToggleField, handleFieldChange]
  )

  // Toàn bộ các trường tìm kiếm: TỰ ĐỘNG TẠO TỪ 100% CỘT TRÊN BẢNG KÈM CÁC TRƯỜNG ĐẶC BIỆT
  const allAvailableFields = useMemo(() => {
    const fields = []
    const forbidden = new Set([
      'workingtag',
      'status',
      'indexno',
      'idseq',
      '_displayindex',
      '_isgroupheader'
    ])

    // 1. Thêm các trường bộ lọc ngày và nhà máy lên đầu
    fields.push(
      {
        key: 'FactoryName',
        label: t('Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' }
        ]
      },
      {
        key: 'RegCode',
        label: t('Mã đợt đăng ký'),
        type: 'text',
        placeholder: 'Nhập mã đợt ĐK...'
      },
      {
        key: 'ApplyDate',
        label: t('Ngày áp dụng ĐK'),
        type: 'date'
      },
      {
        key: 'OperationNo',
        label: t('Số lệnh thao tác'),
        type: 'text',
        placeholder: 'Nhập số lệnh thao tác...'
      },
      {
        key: 'PicDp',
        label: t('PIC ĐP'),
        type: 'text',
        placeholder: 'Nhập PIC điều phối...'
      },
      {
        key: 'OpDate',
        label: t('Ngày thực hiện thao tác'),
        type: 'date'
      },
      {
        key: 'ItemCode',
        label: t('Mã hàng'),
        type: 'text',
        placeholder: 'Nhập mã hàng...'
      },
      {
        key: 'ItemName',
        label: t('Tên hàng'),
        type: 'text',
        placeholder: 'Nhập tên hàng...'
      }
    )

    // 2. Thêm TẤT CẢ các cột còn lại trên bảng sheet vào danh sách điều kiện tìm kiếm
    ;(columns || []).forEach((col) => {
      const k = col.id || col.key
      if (!k || forbidden.has(k.toLowerCase()) || fields.some((f) => f.key === k)) return

      const isDate =
        k.endsWith('Date') || (k.includes('Time') && !k.includes('ProdTime')) || col.kind === 'Date'
      let type = 'text'
      let options = undefined

      if (isDate) {
        type = 'date'
      }

      const colTitle = typeof col.title === 'string' ? col.title.replace(/\n/g, ' ') : k

      fields.push({
        key: k,
        label: colTitle ? t(colTitle) : k,
        type,
        options,
        placeholder: `Nhập ${colTitle}...`
      })
    })

    // 3. Thêm trường từ khóa Keyword
    if (!fields.some((f) => f.key === 'Keyword')) {
      fields.push({
        key: 'Keyword',
        label: t('Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Mã đơn, Phiếu KH, Tên SP, PIC...'
      })
    }

    return fields
  }, [columns, t])

  // Danh sách các fields hiển thị trên thanh QueryBar dựa trên visibleKeys
  // Nếu trường không thuộc danh sách mặc định (ví dụ được thêm qua Ctrl+F) thì gắn onRemove để hiển thị nút [x]
  const renderedFields = useMemo(() => {
    return allAvailableFields.map((f) => {
      const isDefault = DEFAULT_KEYS_SET.has(f.key)
      return {
        ...f,
        visible: visibleKeys.has(f.key),
        isDefault,
        onRemove: !isDefault ? () => handleRemoveField(f.key) : undefined
      }
    })
  }, [allAvailableFields, visibleKeys, handleRemoveField])

  const currentValues = useMemo(() => {
    const base = {}
    allAvailableFields.forEach((f) => {
      base[f.key] = searchValues[f.key] || ''
    })
    return {
      ...base,
      ...searchValues
    }
  }, [allAvailableFields, searchValues])

  return (
    <div className="w-full bg-white">
      <DynamicQueryBar
        fields={renderedFields}
        allAvailableFields={allAvailableFields}
        values={currentValues}
        onChange={handleFieldChange}
        onSearch={handleSearchData}
        onReset={onResetQuery}
        onToggleField={handleToggleField}
        onResetFields={handleResetFields}
        disabled={disabled}
        columns={4}
      />
    </div>
  )
}
