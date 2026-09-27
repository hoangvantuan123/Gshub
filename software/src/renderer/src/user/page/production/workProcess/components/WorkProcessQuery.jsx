/* eslint-disable react/prop-types */
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'
import { fetchWorkProcessFactories } from '../../../../../api/production/workProcessApi'

const DEFAULT_FACTORY_OPTIONS = [
  { value: '', label: '-- Tất cả nhà máy --' }
]

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
  const [factoryOptions, setFactoryOptions] = useState(DEFAULT_FACTORY_OPTIONS)

  // Tải danh sách nhà máy tự động từ Bravo ERP endpoint (7100966925033d94da5b1876d4f4582e)
  useEffect(() => {
    let isMounted = true
    fetchWorkProcessFactories()
      .then((rows) => {
        if (!isMounted || !Array.isArray(rows) || rows.length === 0) return
        const opts = [{ value: '', label: '-- Tất cả nhà máy --' }]
        const seen = new Set()
        rows.forEach((r) => {
          const name = r.FactoryName || r.factory_name || r.Name || r.name
          if (name && !seen.has(name)) {
            seen.add(name)
            opts.push({ value: name, label: name })
          }
        })
        setFactoryOptions(opts)
      })
      .catch((err) => {
        console.warn('Could not load factories dynamically:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

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
        key: 'FactoryName',
        label: t('Nhà máy'),
        type: 'select',
        options: factoryOptions
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
        label: t('SL đạt theo DO'),
        type: 'number',
        placeholder: 'Số lượng đạt theo DO...'
      },
      {
        key: 'WorkProcessCode',
        label: t('Mã quy trình CĐ'),
        type: 'text',
        placeholder: 'Mã quy trình...'
      },
      {
        key: 'ProductTypeName',
        label: t('Loại sản phẩm'),
        type: 'text',
        placeholder: 'Loại sản phẩm...'
      },
      {
        key: 'RatePass',
        label: t('Tỷ lệ đạt (%)'),
        type: 'number',
        placeholder: 'Tỷ lệ đạt %...'
      },
      {
        key: 'QuantityAdj',
        label: t('SL điều chỉnh'),
        type: 'number',
        placeholder: 'SL điều chỉnh...'
      },
      {
        key: 'QuantityAfterAdj_Pass',
        label: t('SL đạt sau ĐC (DO)'),
        type: 'number',
        placeholder: 'SL đạt sau ĐC (DO)...'
      },
      {
        key: 'QuantityOff',
        label: t('SL bù hao'),
        type: 'number',
        placeholder: 'SL bù hao...'
      },
      {
        key: 'QuantityAfterAdj',
        label: t('SL sau ĐC (Sản xuất)'),
        type: 'number',
        placeholder: 'SL sau ĐC sản xuất...'
      },
      {
        key: 'QuantityReceipt',
        label: t('SL nhập kho'),
        type: 'number',
        placeholder: 'SL nhập kho...'
      },
      {
        key: 'RateReceipt',
        label: t('Tỷ lệ nhập kho (%)'),
        type: 'number',
        placeholder: 'Tỷ lệ nhập kho %...'
      },
      {
        key: 'DeliveryDateDO',
        label: t('Hạn giao DO'),
        type: 'date',
        placeholder: 'YYYY-MM-DD...'
      },
      {
        key: 'ClosedDate',
        label: t('Ngày đóng lệnh'),
        type: 'date',
        placeholder: 'YYYY-MM-DD...'
      },
      {
        key: 'ApprovalStatus',
        label: t('Trạng thái duyệt'),
        type: 'select',
        options: [
          { value: '0', label: '0 - Lập phiếu' },
          { value: '1', label: '1 - Chờ duyệt' },
          { value: '2', label: '2 - Đã duyệt chờ hoàn thiện' },
          { value: '3', label: '3 - Đã duyệt chờ hoàn thiện' },
          { value: '4', label: '4 - Hoàn thiện' }
        ]
      },
      {
        key: 'IsComplete',
        label: t('Hoàn thành'),
        type: 'select',
        options: [
          { value: '1', label: '1 - Đã hoàn thành' },
          { value: '0', label: '0 - Chưa hoàn thành' }
        ]
      },
      {
        key: 'Closed',
        label: t('Đã đóng'),
        type: 'select',
        options: [
          { value: '1', label: '1 - Đã đóng' },
          { value: '0', label: '0 - Chưa đóng' }
        ]
      },
      {
        key: 'IsStop',
        label: t('Tạm dừng'),
        type: 'select',
        options: [
          { value: '1', label: '1 - Đang tạm dừng' },
          { value: '0', label: '0 - Bình thường' }
        ]
      },
      {
        key: 'AllowAdj',
        label: t('Cho phép điều chỉnh'),
        type: 'select',
        options: [
          { value: '1', label: '1 - Cho phép' },
          { value: '0', label: '0 - Không cho phép' }
        ]
      },
      {
        key: 'CreatedAt',
        label: t('Ngày tạo'),
        type: 'date',
        placeholder: 'YYYY-MM-DD...'
      },
      {
        key: 'CustomerName',
        label: t('Tên khách hàng'),
        type: 'text',
        placeholder: 'Tên khách hàng...'
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
        type: 'date',
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
        type: 'date',
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
    [dynamicQueryFields, factoryOptions, t]
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
        key: 'FactoryName',
        label: t('Nhà máy'),
        type: 'select',
        options: factoryOptions,
        visible: !hiddenKeys.has('FactoryName')
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
      }
    ]
  }, [hiddenKeys, factoryOptions, t])

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
        key === 'FactoryName' ||
        key === 'ItemCode' ||
        key === 'ItemName'
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
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
      tableName="production_work_process"
    />
  )
}
