/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function OrderSettlementQuery({
  stageOrderNo = '',
  setStageOrderNo,
  itemCode = '',
  setItemCode,
  itemName = '',
  setItemName,
  operationCode = '',
  setOperationCode,
  status = '',
  setStatus,
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
  const [dynamicValues, setDynamicValues] = useState({})

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'StageOrderNo',
        label: t('Lệnh công đoạn'),
        type: 'text',
        placeholder: 'CD05-0826-...'
      },
      {
        key: 'ItemCode',
        label: t('Mặt hàng'),
        type: 'text',
        placeholder: 'CAN-BSA-...'
      },
      {
        key: 'ItemName',
        label: t('Tên vật tư, hàng hóa'),
        type: 'text',
        placeholder: 'QX2-6351-...'
      },
      {
        key: 'OperationCode',
        label: t('Mã TT (Thao tác)'),
        type: 'text',
        placeholder: 'DAN-18, KIEM-10...'
      },
      {
        key: 'Status',
        label: t('Trạng thái quyết toán'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'Đã quyết toán', label: 'Đã quyết toán' },
          { value: 'Chưa quyết toán', label: 'Chưa quyết toán' }
        ]
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
        placeholder: 'CD05-0826-...',
        maxLength: 100,
        visible: !hiddenKeys.has('StageOrderNo')
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
        label: t('Tên vật tư, hàng hóa'),
        type: 'text',
        placeholder: 'Tên VT/Hàng hóa...',
        maxLength: 200,
        visible: !hiddenKeys.has('ItemName')
      },
      {
        key: 'OperationCode',
        label: t('Mã TT'),
        type: 'text',
        placeholder: 'DAN-18, BE-11...',
        maxLength: 80,
        visible: !hiddenKeys.has('OperationCode')
      },
      {
        key: 'Status',
        label: t('Trạng thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'Đã quyết toán', label: 'Đã quyết toán' },
          { value: 'Chưa quyết toán', label: 'Chưa quyết toán' }
        ],
        visible: !hiddenKeys.has('Status')
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

  const values = useMemo(() => {
    return {
      StageOrderNo: stageOrderNo,
      ItemCode: itemCode,
      ItemName: itemName,
      OperationCode: operationCode,
      Status: status,
      ...dynamicValues
    }
  }, [stageOrderNo, itemCode, itemName, operationCode, status, dynamicValues])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.StageOrderNo !== undefined && setStageOrderNo)
        setStageOrderNo(keyOrObj.StageOrderNo)
      if (keyOrObj.ItemCode !== undefined && setItemCode) setItemCode(keyOrObj.ItemCode)
      if (keyOrObj.ItemName !== undefined && setItemName) setItemName(keyOrObj.ItemName)
      if (keyOrObj.OperationCode !== undefined && setOperationCode)
        setOperationCode(keyOrObj.OperationCode)
      if (keyOrObj.Status !== undefined && setStatus) setStatus(keyOrObj.Status)
      setDynamicValues((prev) => ({ ...prev, ...keyOrObj }))
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'StageOrderNo' && setStageOrderNo) setStageOrderNo(val)
      else if (key === 'ItemCode' && setItemCode) setItemCode(val)
      else if (key === 'ItemName' && setItemName) setItemName(val)
      else if (key === 'OperationCode' && setOperationCode) setOperationCode(val)
      else if (key === 'Status' && setStatus) setStatus(val)
      else {
        setDynamicValues((prev) => ({ ...prev, [key]: val }))
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
    setDynamicValues({})
    if (setStageOrderNo) setStageOrderNo('')
    if (setItemCode) setItemCode('')
    if (setItemName) setItemName('')
    if (setOperationCode) setOperationCode('')
    if (setStatus) setStatus('')
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={values}
      onChange={handleChange}
      onSearch={handleSearch}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
