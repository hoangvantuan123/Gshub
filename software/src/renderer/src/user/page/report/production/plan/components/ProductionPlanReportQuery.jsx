import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function ProductionPlanReportQuery({
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
        key: 'OpDate',
        label: t('report.opDate', 'Ngày thực hiện'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'PicDp',
        label: t('report.picDp', 'PIC Điều phối'),
        type: 'text',
        placeholder: 'Nhập tên PIC điều phối...'
      },
      {
        key: 'OperationNo',
        label: t('report.operationNo', 'Số lệnh thao tác'),
        type: 'text',
        placeholder: 'Nhập số lệnh thao tác...'
      },
      {
        key: 'ItemCode',
        label: t('report.itemCode', 'Mã hàng'),
        type: 'text',
        placeholder: 'Nhập mã hàng...'
      },
      {
        key: 'RoutingDocNo',
        label: t('report.routingDocNo', 'Số lệnh công đoạn'),
        type: 'text',
        placeholder: 'Nhập số lệnh công đoạn...'
      },
      {
        key: 'MachineName',
        label: t('report.machineName', 'Máy sản xuất'),
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
        key: 'StatusDpSx',
        label: t('report.statusDpSx', 'Trạng thái ĐP - SX'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'Đang sản xuất', label: 'Đang sản xuất' },
          { value: 'Hoàn thành', label: 'Hoàn thành' },
          { value: 'Chậm tiến độ', label: 'Chậm tiến độ' },
          { value: 'Chưa bắt đầu', label: 'Chưa bắt đầu' }
        ]
      },
      {
        key: 'TimeStatus',
        label: t('report.timeStatus', 'Trạng thái thời gian'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'Đúng hạn', label: 'Đúng hạn' },
          { value: 'Vượt giờ định mức', label: 'Vượt giờ định mức' },
          { value: 'Tiết kiệm thời gian', label: 'Tiết kiệm thời gian' }
        ]
      },
      {
        key: 'CapaStatus',
        label: t('report.capaStatus', 'Trạng thái capa KHSX'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'Đạt capa', label: 'Đạt capa' },
          { value: 'Vượt capa', label: 'Vượt capa' },
          { value: 'Không đạt capa', label: 'Không đạt capa' }
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
        key: 'OpDate',
        label: t('report.opDate', 'Ngày thực hiện'),
        type: 'date-range',
        colSpan: 2,
        visible: !hiddenKeys.has('OpDate')
      },
      {
        key: 'PicDp',
        label: t('report.picDp', 'PIC Điều phối'),
        type: 'text',
        placeholder: 'Nhập PIC điều phối...',
        visible: !hiddenKeys.has('PicDp')
      },
      {
        key: 'OperationNo',
        label: t('report.operationNo', 'Số lệnh thao tác'),
        type: 'text',
        placeholder: 'Nhập số lệnh...',
        visible: !hiddenKeys.has('OperationNo')
      },
      {
        key: 'ItemCode',
        label: t('report.itemCode', 'Mã hàng'),
        type: 'text',
        placeholder: 'Nhập mã hàng...',
        visible: !hiddenKeys.has('ItemCode')
      },
      {
        key: 'StatusDpSx',
        label: t('report.statusDpSx', 'Trạng thái ĐP - SX'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'Đang sản xuất', label: 'Đang sản xuất' },
          { value: 'Hoàn thành', label: 'Hoàn thành' },
          { value: 'Chậm tiến độ', label: 'Chậm tiến độ' }
        ],
        visible: !hiddenKeys.has('StatusDpSx')
      }
    ]
  }, [t, hiddenKeys])

  const currentValues = useMemo(() => {
    return {
      plantKey: searchValues.plantKey || '',
      OpDate: searchValues.OpDate || [],
      PicDp: searchValues.PicDp || '',
      OperationNo: searchValues.OperationNo || '',
      ItemCode: searchValues.ItemCode || '',
      RoutingDocNo: searchValues.RoutingDocNo || '',
      MachineName: searchValues.MachineName || '',
      StatusDpSx: searchValues.StatusDpSx || '',
      TimeStatus: searchValues.TimeStatus || '',
      CapaStatus: searchValues.CapaStatus || '',
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
      storageKey="query_prod_plan_report"
    />
  )
}
