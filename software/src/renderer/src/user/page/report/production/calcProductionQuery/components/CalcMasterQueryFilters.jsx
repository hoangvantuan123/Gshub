/* eslint-disable react/prop-types */
import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '@renderer/user/components/query/core/DynamicQueryBar'

export const STORAGE_KEY = 'S_ERP_QUERY_FIELDS_calc_master_query'

export const DEFAULT_VISIBLE_KEYS = [
  'FactoryName',
  'RegCode',
  'ApplyDate',
  'Status',
  'RegisteredBy'
]

const DEFAULT_KEYS_SET = new Set(DEFAULT_VISIBLE_KEYS)

export default function CalcMasterQueryFilters({
  filters = {},
  onChangeFilter,
  onEnterQuery,
  onResetFilters,
  disabled = false
}) {
  const { t } = useTranslation()

  // Lưu trạng thái các trường được hiển thị
  const [visibleKeys, setVisibleKeys] = useState(() => {
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

  // Toàn bộ các tiêu chí tìm kiếm chuẩn ERP GsHub
  const allAvailableFields = useMemo(
    () => [
      {
        key: 'FactoryName',
        label: t('Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' },
          { value: 'GS5 Quế Võ 2', label: 'GS5 Quế Võ 2' }
        ]
      },
      {
        key: 'RegCode',
        label: t('Mã đăng ký'),
        type: 'text',
        placeholder: 'REG-CALC-...'
      },
      {
        key: 'ApplyDate',
        label: t('Ngày ĐK (KHSX)'),
        type: 'date'
      },
      {
        key: 'FromDate',
        label: t('Từ ngày'),
        type: 'date'
      },
      {
        key: 'ToDate',
        label: t('Đến ngày'),
        type: 'date'
      },
      {
        key: 'Status',
        label: t('Trạng thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'PUBLISHED', label: 'Đã công bố (PUBLISHED)' },
          { value: 'REGISTERED', label: 'Đã lưu (REGISTERED)' },
          { value: 'DRAFT', label: 'Bản nháp (DRAFT)' },
          { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' }
        ]
      },
      {
        key: 'Version',
        label: t('Phiên bản'),
        type: 'text',
        placeholder: '1.0, 1.1...'
      },
      {
        key: 'ProductionTeam',
        label: t('Tổ sản xuất'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả các tổ' },
          { value: 'Tổ 1', label: 'Tổ 1' },
          { value: 'Tổ 2', label: 'Tổ 2' },
          { value: 'Tổ 3', label: 'Tổ 3' },
          { value: 'Tổ 4', label: 'Tổ 4' }
        ]
      },
      {
        key: 'RegisteredBy',
        label: t('Người tạo'),
        type: 'text',
        placeholder: 'Tên / Mã người tạo...'
      },
      {
        key: 'Remark',
        label: t('Ghi chú'),
        type: 'text',
        placeholder: 'Tìm theo ghi chú...'
      },
      {
        key: 'Keyword',
        label: t('Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Mã phiếu, nhà máy, ghi chú, người tạo...'
      }
    ],
    [t]
  )

  // Bật/tắt cột tìm kiếm động
  const handleToggleField = useCallback((fieldKey, isChecked) => {
    setVisibleKeys((prev) => {
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
  }, [])

  // Đặt lại danh sách cột mặc định
  const handleResetFields = useCallback(() => {
    const next = new Set(DEFAULT_VISIBLE_KEYS)
    setVisibleKeys(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
    } catch {}
  }, [])

  // Xóa bỏ một trường tìm kiếm phụ (Nút x)
  const handleRemoveField = useCallback(
    (fieldKey) => {
      handleToggleField(fieldKey, false)
      onChangeFilter(fieldKey, '')
    },
    [handleToggleField, onChangeFilter]
  )

  // Danh sách fields hiển thị
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

  // Chuẩn hóa giá trị lọc
  const currentValues = useMemo(() => {
    const base = {}
    allAvailableFields.forEach((f) => {
      base[f.key] =
        filters[f.key] !== undefined
          ? filters[f.key]
          : filters[f.key.toLowerCase()] !== undefined
          ? filters[f.key.toLowerCase()]
          : filters[f.key === 'FactoryName' ? 'factory' : f.key === 'ProductionTeam' ? 'team' : f.key === 'FromDate' ? 'fromDate' : f.key === 'ToDate' ? 'toDate' : f.key === 'ApplyDate' ? 'applyDate' : f.key === 'RegCode' ? 'regCode' : f.key === 'Status' ? 'status' : f.key === 'Keyword' ? 'keyword' : f.key] || ''
    })
    return {
      ...base,
      ...filters
    }
  }, [allAvailableFields, filters])

  return (
    <div className="w-full bg-white">
      <DynamicQueryBar
        fields={renderedFields}
        allAvailableFields={allAvailableFields}
        values={currentValues}
        onChange={onChangeFilter}
        onSearch={onEnterQuery}
        onReset={onResetFilters}
        onToggleField={handleToggleField}
        onResetFields={handleResetFields}
        disabled={disabled}
        columns={4}
      />
    </div>
  )
}
