/* eslint-disable react/prop-types */
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'
import { fetchWorkProcessFactories } from '../../../../../api/production/workProcessApi'

const DEFAULT_FACTORY_OPTIONS = [{ value: '', label: '-- Tất cả nhà máy --' }]

export default function OrderSettlementQuery({
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

  // Tải danh sách nhà máy tự động từ Bravo ERP endpoint
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
        console.warn('Could not load factories dynamically in OrderSettlement:', err)
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
        placeholder: 'CD05-0926-...'
      },
      {
        key: 'DetailNo',
        label: t('Lệnh thao tác (Số CT)'),
        type: 'text',
        placeholder: 'TT2609-0001...'
      },
      {
        key: 'DateRange',
        label: t('Ngày sản xuất (Từ ~ Đến)'),
        type: 'date-range',
        colSpan: 1
      },
      {
        key: 'Stt_LTT',
        label: t('Mã STT Lệnh TT (@_Stt_LTT)'),
        type: 'text',
        placeholder: '11375387TT...'
      },
      {
        key: 'ItemId',
        label: t('Mặt hàng ID (@_ItemId)'),
        type: 'number',
        placeholder: 'ItemId...'
      },
      {
        key: 'DeptId',
        label: t('Bộ phận ID (@_DeptId)'),
        type: 'number',
        placeholder: 'DeptId...'
      },
      {
        key: 'FactoryId',
        label: t('Nhà máy CĐ ID (@_FactoryId)'),
        type: 'number',
        placeholder: 'FactoryId...'
      },
      {
        key: 'FactoryIdTT',
        label: t('Nhà máy TT ID (@_FactoryIdTT)'),
        type: 'number',
        placeholder: 'FactoryIdTT...'
      },
      {
        key: 'BranchCode',
        label: t('Chi nhánh (@_BranchCode)'),
        type: 'text',
        placeholder: 'A01...'
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
        placeholder: 'CAN-BSB-...'
      },
      {
        key: 'ItemName',
        label: t('Tên vật tư, hàng hóa'),
        type: 'text',
        placeholder: 'RX1-7651-...'
      },
      {
        key: 'OperationCode',
        label: t('Mã TT (Thao tác)'),
        type: 'text',
        placeholder: 'BOI, DAN-22, KIEM...'
      },
      {
        key: 'OperationName',
        label: t('Tên thao tác'),
        type: 'text',
        placeholder: 'Thao tác dán, bồi...'
      },
      {
        key: 'WorkStepTypeCode',
        label: t('Loại thao tác'),
        type: 'text',
        placeholder: 'Loại thao tác...'
      },
      {
        key: 'MachineName',
        label: t('Máy / Thiết bị'),
        type: 'text',
        placeholder: 'Máy dán, bồi...'
      },
      {
        key: 'Status',
        label: t('Trạng thái quyết toán'),
        type: 'select',
        options: [
          { value: '', label: '-- Tất cả trạng thái --' },
          { value: 'Đã quyết toán', label: 'Đã quyết toán' },
          { value: 'Chờ quyết toán', label: 'Chờ quyết toán / Chưa quyết toán' }
        ]
      },
      {
        key: 'Unit',
        label: t('Đơn vị tính'),
        type: 'text',
        placeholder: 'Pcs, Hộp, Tờ...'
      },
      {
        key: 'DoRequiredQty',
        label: t('SL cần đạt theo DO'),
        type: 'number',
        placeholder: 'Số lượng đạt theo DO...'
      },
      {
        key: 'ProductionRequiredQty',
        label: t('SL cần sản xuất'),
        type: 'number',
        placeholder: 'Số lượng cần sản xuất...'
      },
      {
        key: 'SettlementQty',
        label: t('SL quyết toán'),
        type: 'number',
        placeholder: 'Số lượng quyết toán...'
      },
      {
        key: 'Notes',
        label: t('Ghi chú / Diễn giải'),
        type: 'text',
        placeholder: 'Ghi chú...'
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
        placeholder: 'CD05-0926-...',
        maxLength: 100,
        visible: !hiddenKeys.has('StageOrderNo')
      },
      {
        key: 'DateRange',
        label: t('Ngày sản xuất'),
        type: 'date-range',
        colSpan: 1,
        visible: !hiddenKeys.has('DateRange')
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
      },
      {
        key: 'OperationCode',
        label: t('Mã TT'),
        type: 'text',
        placeholder: 'BOI, DAN-22...',
        maxLength: 80,
        visible: !hiddenKeys.has('OperationCode')
      },
      {
        key: 'Status',
        label: t('Trạng thái'),
        type: 'select',
        options: [
          { value: '', label: '-- Tất cả --' },
          { value: 'Đã quyết toán', label: 'Đã quyết toán' },
          { value: 'Chờ quyết toán', label: 'Chờ quyết toán' }
        ],
        visible: !hiddenKeys.has('Status')
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
        key === 'DateRange' ||
        key === 'FactoryName' ||
        key === 'ItemCode' ||
        key === 'ItemName' ||
        key === 'OperationCode' ||
        key === 'Status'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (setSearchValues) {
      setSearchValues({
        StageOrderNo: '',
        DetailNo: '',
        DateRange: ['', ''],
        FactoryName: '',
        ItemCode: '',
        ItemName: '',
        OperationCode: '',
        Status: '',
        BranchCode: 'A01',
        FiscalYear: String(new Date().getFullYear())
      })
    }
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
      tableName="production_order_settlement"
    />
  )
}
