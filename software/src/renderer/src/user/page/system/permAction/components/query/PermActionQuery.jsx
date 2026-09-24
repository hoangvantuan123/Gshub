/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function PermActionQuery({
  setActionCode,
  actionCode = '',
  setActionName,
  actionName = '',
  setIsDefaultAllow,
  isDefaultAllow = '',
  handleSearchData,
  disabled = false,
  customFields,
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'ActionCode',
        label: t('system.actionCode', 'Mã Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập mã hành động...'
      },
      {
        key: 'ActionName',
        label: t('system.actionName', 'Tên Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập tên hành động...'
      },
      {
        key: 'IsDefaultAllow',
        label: t('system.isDefaultAllow', 'Mặc Định Cho Phép'),
        type: 'select',
        placeholder: 'Mặc định cho phép...',
        options: [
          { value: '', label: 'Tất cả' },
          { value: '1', label: 'Có' },
          { value: '0', label: 'Không' }
        ]
      },
      {
        key: 'LangKey',
        label: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        type: 'text',
        placeholder: 'Tìm theo key ngôn ngữ...'
      },
      {
        key: 'Comment',
        label: t('system.comment', 'Ghi Chú'),
        type: 'text',
        placeholder: 'Tìm theo ghi chú...'
      },
      {
        key: 'CreatedAt',
        label: t('system.createdAt', 'Thời gian tạo'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'UpdatedAt',
        label: t('system.updatedAt', 'Thời gian cập nhật'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'CreatedByName',
        label: t('system.createdBy', 'Người tạo'),
        type: 'text',
        placeholder: 'Tìm theo người tạo...'
      },
      {
        key: 'UpdatedByName',
        label: t('system.updatedBy', 'Người sửa'),
        type: 'text',
        placeholder: 'Tìm theo người sửa...'
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'ActionCode',
        label: t('system.actionCode', 'Mã Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập mã hành động...',
        maxLength: 100,
        visible: !hiddenKeys.has('ActionCode')
      },
      {
        key: 'ActionName',
        label: t('system.actionName', 'Tên Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập tên hành động...',
        maxLength: 255,
        visible: !hiddenKeys.has('ActionName')
      },
      {
        key: 'IsDefaultAllow',
        label: t('system.isDefaultAllow', 'Mặc Định Cho Phép'),
        type: 'select',
        placeholder: 'Mặc định cho phép...',
        options: [
          { value: '', label: 'Tất cả' },
          { value: '1', label: 'Có' },
          { value: '0', label: 'Không' }
        ],
        visible: !hiddenKeys.has('IsDefaultAllow')
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
      ...searchValues,
      ActionCode: actionCode,
      ActionName: actionName,
      IsDefaultAllow: isDefaultAllow
    }
  }, [searchValues, actionCode, actionName, isDefaultAllow])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.ActionCode !== undefined && setActionCode) setActionCode(keyOrObj.ActionCode)
      if (keyOrObj.ActionName !== undefined && setActionName) setActionName(keyOrObj.ActionName)
      if (keyOrObj.IsDefaultAllow !== undefined && setIsDefaultAllow)
        setIsDefaultAllow(keyOrObj.IsDefaultAllow)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'ActionCode' && setActionCode) setActionCode(val)
      else if (key === 'ActionName' && setActionName) setActionName(val)
      else if (key === 'IsDefaultAllow' && setIsDefaultAllow) setIsDefaultAllow(val)
      else if (setSearchValues) setSearchValues((prev) => ({ ...prev, [key]: val }))
    }
  }

  const handleToggleField = (key, checked, fieldMeta) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

    if (checked && onAddQueryField) {
      const isDefault = key === 'ActionCode' || key === 'ActionName' || key === 'IsDefaultAllow'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (setActionCode) setActionCode('')
    if (setActionName) setActionName('')
    if (setIsDefaultAllow) setIsDefaultAllow('')
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={values}
      onChange={handleChange}
      onSearch={handleSearchData}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
