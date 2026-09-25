/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function WorkProcessQuery({
  searchValues = {},
  setSearchValues,
  handleSearch,
  disabled = false,
  customFields,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())

  // Tất cả các cột có thể tìm kiếm / lọc trong hệ thống
  const allAvailableFields = useMemo(
    () => [
      {
        key: 'StageOrderNo',
        label: t('Lệnh công đoạn'),
        type: 'text',
        placeholder: 'CD05-0926-0009...'
      },
      {
        key: 'BranchCode',
        label: t('Chi nhánh'),
        type: 'select',
        options: [
          { value: 'A01', label: 'A01 - Goldsun Hà Nội' },
          { value: 'A02', label: 'A02 - Goldsun Bắc Ninh' },
          { value: 'B01', label: 'B01 - Goldsun TP.HCM' }
        ]
      },
      {
        key: 'FiscalYear',
        label: t('Năm tài chính'),
        type: 'text',
        placeholder: '2026'
      },
      {
        key: 'ItemCode',
        label: t('Mặt hàng (Mã VT)'),
        type: 'text',
        placeholder: 'CAN-2BO-...'
      },
      {
        key: 'ItemName',
        label: t('Tên vật tư, hàng hóa'),
        type: 'text',
        placeholder: 'RX1-4058-...'
      },
      {
        key: 'Unit',
        label: t('Đơn vị tính'),
        type: 'text',
        placeholder: 'Hộp, Tờ, Cái...'
      },
      {
        key: 'QuantitySO',
        label: t('SL đơn hàng (SO)'),
        type: 'number',
        placeholder: 'Số lượng SO...'
      },
      {
        key: 'QuantityCDIssue',
        label: t('SL cấp phát CĐ'),
        type: 'number',
        placeholder: 'Số lượng cấp...'
      },
      {
        key: 'QuantityProduce',
        label: t('SL sản xuất'),
        type: 'number',
        placeholder: 'Số lượng sản xuất...'
      },
      {
        key: 'QuantityPass',
        label: t('SL đạt'),
        type: 'number',
        placeholder: 'Số lượng đạt...'
      },
      {
        key: 'CustomerName',
        label: t('Tên khách hàng'),
        type: 'text',
        placeholder: 'Tên khách hàng...'
      },
      {
        key: 'FactoryName',
        label: t('Xưởng sản xuất'),
        type: 'text',
        placeholder: 'Xưởng...'
      },
      {
        key: 'CreatedBy_Name',
        label: t('Người tạo / Lập'),
        type: 'text',
        placeholder: 'Tên người tạo/lập...'
      },
      {
        key: 'ModifiedBy_Name',
        label: t('Người cập nhật'),
        type: 'text',
        placeholder: 'Tên người cập nhật...'
      },
      {
        key: 'ModifiedDate',
        label: t('Ngày cập nhật'),
        type: 'text',
        placeholder: 'YYYY-MM-DD...'
      },
      {
        key: 'Description',
        label: t('Diễn giải'),
        type: 'text',
        placeholder: 'Diễn giải / Ghi chú...'
      },
      {
        key: 'DocDate',
        label: t('Ngày lập lệnh'),
        type: 'text',
        placeholder: 'YYYY-MM-DD...'
      },
      {
        key: 'DocNo',
        label: t('Mã Lệnh Tổng'),
        type: 'text',
        placeholder: 'Lệnh tổng...'
      },
      {
        key: 'OperationCode',
        label: t('Mã TT (Thao tác)'),
        type: 'text',
        placeholder: 'BE, BOCLE, KIEM, DONGGOI...'
      },
      ...(dynamicQueryFields || []).map((f) => ({
        key: f.key,
        label: f.label || f.key,
        type: f.type || 'text',
        placeholder: f.placeholder
      }))
    ],
    [dynamicQueryFields, t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'StageOrderNo',
        label: t('Lệnh công đoạn'),
        type: 'text',
        placeholder: 'CD05-0926-0009',
        maxLength: 100,
        visible: !hiddenKeys.has('StageOrderNo')
      },
      {
        key: 'BranchCode',
        label: t('Chi nhánh'),
        type: 'select',
        options: [
          { value: 'A01', label: 'A01 - Hà Nội' },
          { value: 'A02', label: 'A02 - Bắc Ninh' },
          { value: 'B01', label: 'B01 - TP.HCM' }
        ],
        visible: !hiddenKeys.has('BranchCode')
      },
      {
        key: 'FiscalYear',
        label: t('Năm tài chính'),
        type: 'text',
        placeholder: '2026',
        maxLength: 10,
        visible: !hiddenKeys.has('FiscalYear')
      },
      {
        key: 'ItemCode',
        label: t('Mặt hàng'),
        type: 'text',
        placeholder: 'Mã mặt hàng...',
        maxLength: 150,
        visible: !hiddenKeys.has('ItemCode')
      },
      {
        key: 'ItemName',
        label: t('Tên VT / Hàng hóa'),
        type: 'text',
        placeholder: 'Tên VT/Hàng hóa...',
        maxLength: 200,
        visible: !hiddenKeys.has('ItemName')
      },
      {
        key: 'OperationCode',
        label: t('Mã TT'),
        type: 'text',
        placeholder: 'BE, BOCLE, KIEM...',
        maxLength: 80,
        visible: !hiddenKeys.has('OperationCode')
      }
    ]
  }, [hiddenKeys, t])

  const combinedFields = useMemo(() => {
    if (customFields) return customFields
    const dynFieldsWithRemove = (dynamicQueryFields || []).map((f) => ({
      ...f,
      placeholder: f.placeholder || `Tìm ${f.label || f.key}...`,
      visible: !hiddenKeys.has(f.key),
      onRemove: onRemoveQueryField ? () => onRemoveQueryField(f.key) : undefined
    }))
    return [...defaultFields, ...dynFieldsWithRemove]
  }, [customFields, defaultFields, dynamicQueryFields, hiddenKeys, onRemoveQueryField])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (setSearchValues) {
        setSearchValues((prev) => ({ ...prev, ...keyOrObj }))
      }
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (setSearchValues) {
        setSearchValues((prev) => ({ ...prev, [key]: val }))
      }
    }
  }

  const handleToggleField = (key, checked, fieldMeta) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(key)
      else next.add(key)
      return next
    })

    if (checked && onAddQueryField) {
      const isDefault =
        key === 'StageOrderNo' ||
        key === 'BranchCode' ||
        key === 'FiscalYear' ||
        key === 'ItemCode' ||
        key === 'ItemName' ||
        key === 'OperationCode'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={searchValues}
      onChange={handleChange}
      onSearch={handleSearch}
      disabled={disabled}
      columns={6}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
      tableName="production_work_process"
    />
  )
}
