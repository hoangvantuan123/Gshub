/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

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
  const [hiddenKeys] = useState(new Set())

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
        placeholder: 'Nhập mã đăng ký (VD: KHSX_...)...'
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
          { value: 'published', label: 'Đã phát hành / Đã lưu' }
        ]
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'FactoryName',
        label: t('report.factoryName', 'Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' }
        ],
        visible: !hiddenKeys.has('FactoryName')
      },
      {
        key: 'ReportType',
        label: t('report.reportType', 'Loại báo cáo'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả loại báo cáo' },
          { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' },
          { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' }
        ],
        visible: !hiddenKeys.has('ReportType')
      },
      {
        key: 'RegCode',
        label: t('report.regCode', 'Mã đăng ký'),
        type: 'text',
        placeholder: 'Nhập mã đăng ký...',
        visible: !hiddenKeys.has('RegCode')
      },
      {
        key: 'ApplyDate',
        label: t('report.applyDate', 'Ngày báo cáo'),
        type: 'date',
        visible: !hiddenKeys.has('ApplyDate')
      }
    ]
  }, [t, hiddenKeys])

  const currentValues = useMemo(() => {
    return {
      FactoryName: searchValues.FactoryName || '',
      ReportType: searchValues.ReportType || '',
      RegCode: searchValues.RegCode || '',
      ApplyDate: searchValues.ApplyDate || '',
      Status: searchValues.Status || '',
      ...searchValues
    }
  }, [searchValues])

  const handleFieldChange = (key, value) => {
    setSearchValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <DynamicQueryBar
      fields={defaultFields}
      dynamicFields={dynamicQueryFields}
      allAvailableFields={allAvailableFields}
      values={currentValues}
      onChange={handleFieldChange}
      onSearch={handleSearchData}
      onReset={onResetQuery}
      onAddField={onAddQueryField}
      onRemoveField={onRemoveQueryField}
      disabled={disabled}
      storageKey="query_report_template_register"
    />
  )
}
