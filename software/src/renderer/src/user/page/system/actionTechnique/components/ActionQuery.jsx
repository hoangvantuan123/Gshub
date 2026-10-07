/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function ActionQuery({
  setActionName,
  actionName = '',
  setActionKey,
  actionKey = '',
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
        key: 'ActionName',
        label: t('system.actionName', 'Tên Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập tên hành động...'
      },
      {
        key: 'ActionKey',
        label: t('system.actionKey', 'Mã Hành Động (Key)'),
        type: 'text',
        placeholder: 'Nhập mã key...'
      },
      {
        key: 'Description',
        label: t('system.description', 'Mô Tả Chức Năng'),
        type: 'text',
        placeholder: 'Tìm theo mô tả...'
      },
      {
        key: 'Icon',
        label: t('system.icon', 'Biểu Tượng (Icon)'),
        type: 'text',
        placeholder: 'Tìm theo icon...'
      },
      {
        key: 'Active',
        label: t('system.active', 'Kích Hoạt'),
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
        key: 'ActionName',
        label: t('system.actionName', 'Tên Hành Động / Nút'),
        type: 'text',
        placeholder: 'Nhập tên hành động...',
        maxLength: 300,
        visible: !hiddenKeys.has('ActionName')
      },
      {
        key: 'ActionKey',
        label: t('system.actionKey', 'Mã Hành Động (Key)'),
        type: 'text',
        placeholder: 'Nhập mã key...',
        maxLength: 300,
        visible: !hiddenKeys.has('ActionKey')
      }
    ]
  }, [t, hiddenKeys])

  const combinedFields = useMemo(() => {
    const defaultKeys = new Set(defaultFields.map((f) => f.key))
    const extraFields = (dynamicQueryFields || [])
      .filter((f) => !defaultKeys.has(f.key) && !hiddenKeys.has(f.key))
      .map((f) => {
        const fieldMeta = allAvailableFields.find((af) => af.key === f.key)
        return {
          key: f.key,
          label: f.label || fieldMeta?.label || f.key,
          type: f.type || fieldMeta?.type || 'text',
          options: f.options || fieldMeta?.options,
          placeholder: f.placeholder || fieldMeta?.placeholder || `Nhập ${f.label || f.key}...`,
          colSpan: f.colSpan || fieldMeta?.colSpan || 1,
          removable: true,
          visible: true
        }
      })

    const visibleDefaultFields = defaultFields.filter((f) => f.visible !== false)
    return [...visibleDefaultFields, ...extraFields]
  }, [defaultFields, dynamicQueryFields, hiddenKeys, allAvailableFields])

  const values = useMemo(() => {
    return {
      ...searchValues,
      ActionName: actionName,
      ActionKey: actionKey
    }
  }, [searchValues, actionName, actionKey])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.ActionName !== undefined && setActionName) setActionName(keyOrObj.ActionName)
      if (keyOrObj.ActionKey !== undefined && setActionKey) setActionKey(keyOrObj.ActionKey)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'ActionName' && setActionName) setActionName(val)
      else if (key === 'ActionKey' && setActionKey) setActionKey(val)
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
      const isDefault = key === 'ActionName' || key === 'ActionKey'
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
