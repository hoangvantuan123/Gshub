/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function RootMenuQuery({
  setLabel,
  label = '',
  setKeyMenu,
  keyMenu = '',
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
        key: 'Label',
        label: t('system.label', 'Tên Root Menu'),
        type: 'text',
        placeholder: 'Nhập tên Root Menu...'
      },
      {
        key: 'Key',
        label: t('system.key', 'Mã Key'),
        type: 'text',
        placeholder: 'Nhập mã key...'
      },
      {
        key: 'Link',
        label: t('system.link', 'Đường dẫn (Link)'),
        type: 'text',
        placeholder: 'Tìm theo link...'
      },
      {
        key: 'Icon',
        label: t('system.icon', 'Biểu tượng (Icon)'),
        type: 'text',
        placeholder: 'Tìm theo icon...'
      },
      {
        key: 'Utilities',
        label: t('system.utilities', 'Tiện ích'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: '1', label: 'Có' },
          { value: '0', label: 'Không' }
        ]
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
        label: t('system.updatedBy', 'Người cập nhật'),
        type: 'text',
        placeholder: 'Tìm theo người sửa...'
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'Label',
        label: t('system.label', 'Tên Root Menu'),
        type: 'text',
        placeholder: 'Nhập tên Root Menu...',
        maxLength: 300,
        visible: !hiddenKeys.has('Label')
      },
      {
        key: 'Key',
        label: t('system.key', 'Mã Key'),
        type: 'text',
        placeholder: 'Nhập mã key...',
        maxLength: 300,
        visible: !hiddenKeys.has('Key')
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
      Label: label,
      Key: keyMenu
    }
  }, [searchValues, label, keyMenu])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.Label !== undefined && setLabel) setLabel(keyOrObj.Label)
      if (keyOrObj.Key !== undefined && setKeyMenu) setKeyMenu(keyOrObj.Key)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'Label' && setLabel) setLabel(val)
      else if (key === 'Key' && setKeyMenu) setKeyMenu(val)
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
      const isDefault = key === 'Label' || key === 'Key'
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
