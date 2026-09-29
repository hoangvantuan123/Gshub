import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function ProductionStatisticsQuery({
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
        key: 'plantKey',
        label: t('report.factoryName', 'Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'hanoi_gs1', label: 'GS1 Hà Nội (Bao bì cao cấp)' },
          { value: 'quevo_gs5', label: 'GS5 Quế Võ 1B (Carton & Sóng)' }
        ]
      },
      {
        key: 'statDate',
        label: t('report.statDate', 'Ngày thống kê'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'operationNo',
        label: t('report.operationNo', 'Số lệnh thao tác'),
        type: 'text',
        placeholder: 'Nhập số lệnh thao tác...'
      },
      {
        key: 'itemCode',
        label: t('report.itemCode', 'Mã vật tư / SP'),
        type: 'text',
        placeholder: 'Nhập mã vật tư...'
      },
      {
        key: 'machineCode',
        label: t('report.machineCode', 'Mã máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả máy' },
          { value: 'OFFSET-01', label: 'OFFSET-01 (Heidelberg XL-106)' },
          { value: 'OFFSET-02', label: 'OFFSET-02 (KBA Rapida 106)' },
          { value: 'BOBST-01', label: 'BOBST-01 (Máy Bế Tự Động)' },
          { value: 'SONG-01', label: 'SONG-01 (Dây chuyền sóng 2.5m)' },
          { value: 'GLUE-01', label: 'GLUE-01 (Máy Dán Tự Động)' }
        ]
      },
      {
        key: 'teamName',
        label: t('report.teamName', 'Tổ sản xuất'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả tổ' },
          { value: 'Tổ In Offset', label: 'Tổ In Offset' },
          { value: 'Tổ Bế Tự Động', label: 'Tổ Bế Tự Động' },
          { value: 'Tổ Tạo Sóng', label: 'Tổ Tạo Sóng' },
          { value: 'Tổ Dán Hộp', label: 'Tổ Dán Hộp' },
          { value: 'Tổ Hoàn Thiện', label: 'Tổ Hoàn Thiện' }
        ]
      },
      {
        key: 'shift',
        label: t('report.shift', 'Ca sản xuất'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả ca' },
          { value: 'Ca 1', label: 'Ca 1' },
          { value: 'Ca 2', label: 'Ca 2' },
          { value: 'Ca 3', label: 'Ca 3' }
        ]
      },
      {
        key: 'customer',
        label: t('report.customer', 'Khách hàng'),
        type: 'text',
        placeholder: 'Nhập tên khách hàng...'
      },
      {
        key: 'status',
        label: t('report.status', 'Trạng thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'Hoàn thành', label: 'Hoàn thành' },
          { value: 'Đang sản xuất', label: 'Đang sản xuất' },
          { value: 'Tạm dừng', label: 'Tạm dừng' }
        ]
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'plantKey',
        label: t('report.factoryName', 'Nhà máy'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhà máy' },
          { value: 'hanoi_gs1', label: 'GS1 Hà Nội (Bao bì cao cấp)' },
          { value: 'quevo_gs5', label: 'GS5 Quế Võ 1B (Carton & Sóng)' }
        ],
        visible: !hiddenKeys.has('plantKey')
      },
      {
        key: 'statDate',
        label: t('report.statDate', 'Ngày thống kê'),
        type: 'date-range',
        colSpan: 2,
        visible: !hiddenKeys.has('statDate')
      },
      {
        key: 'operationNo',
        label: t('report.operationNo', 'Số lệnh thao tác'),
        type: 'text',
        placeholder: 'Nhập số lệnh...',
        visible: !hiddenKeys.has('operationNo')
      },
      {
        key: 'itemCode',
        label: t('report.itemCode', 'Mã vật tư / SP'),
        type: 'text',
        placeholder: 'Nhập mã vật tư...',
        visible: !hiddenKeys.has('itemCode')
      },
      {
        key: 'teamName',
        label: t('report.teamName', 'Tổ sản xuất'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả tổ' },
          { value: 'Tổ In Offset', label: 'Tổ In Offset' },
          { value: 'Tổ Bế Tự Động', label: 'Tổ Bế Tự Động' },
          { value: 'Tổ Tạo Sóng', label: 'Tổ Tạo Sóng' },
          { value: 'Tổ Dán Hộp', label: 'Tổ Dán Hộp' }
        ],
        visible: !hiddenKeys.has('teamName')
      }
    ]
  }, [t, hiddenKeys])

  const currentValues = useMemo(() => {
    return {
      plantKey: searchValues.plantKey || '',
      statDate: searchValues.statDate || [],
      operationNo: searchValues.operationNo || '',
      itemCode: searchValues.itemCode || '',
      machineCode: searchValues.machineCode || '',
      teamName: searchValues.teamName || '',
      shift: searchValues.shift || '',
      customer: searchValues.customer || '',
      status: searchValues.status || '',
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
      storageKey="query_prod_statistics"
    />
  )
}
