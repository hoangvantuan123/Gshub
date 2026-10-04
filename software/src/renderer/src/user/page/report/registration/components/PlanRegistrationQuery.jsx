/* eslint-disable react/prop-types */
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

const STORAGE_KEY = 'S_ERP_QUERY_FIELDS_plan_registration'

const DEFAULT_VISIBLE_KEYS = ['FactoryName', 'ReportType', 'RegCode', 'ApplyDate']

export default function PlanRegistrationQuery({
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery,
  handleSearchData,
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

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'FactoryName',
        label: t('report.factoryName', 'Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' }
        ]
      },
      {
        key: 'ReportType',
        label: t('report.reportType', 'Loại báo cáo'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả loại báo cáo' },
          { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' },
          { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' }
        ]
      },
      {
        key: 'RegCode',
        label: t('report.regCode', 'Mã đăng ký'),
        type: 'text',
        placeholder: 'Nhập mã đăng ký...'
      },
      {
        key: 'ApplyDate',
        label: t('report.applyDate', 'Ngày báo cáo'),
        type: 'date'
      },
      {
        key: 'Status',
        label: t('report.status', 'Trạng thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'published', label: 'Đã phát hành / Đã lưu' },
          { value: 'draft', label: 'Bản nháp' }
        ]
      },
      {
        key: 'CreatedBy',
        label: t('report.createdBy', 'Người đăng ký'),
        type: 'text',
        placeholder: 'Tên / mã người đăng ký...'
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

  // Danh sách fields hiển thị
  const renderedFields = useMemo(() => {
    return allAvailableFields.map((f) => ({
      ...f,
      visible: visibleKeys.has(f.key)
    }))
  }, [allAvailableFields, visibleKeys])

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

  const handleFieldChange = (key, value) => {
    setSearchValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

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
