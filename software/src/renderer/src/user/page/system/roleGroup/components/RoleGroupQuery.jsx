/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function RoleGroupQuery({
  name = '',
  setName,
  id = '',
  setId,
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery,
  handleSearchData,
  disabled = false,
  customFields
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'Name',
        label: t('system.roleGroupName', 'Tên Nhóm Quyền'),
        type: 'text',
        placeholder: 'Tìm theo tên nhóm quyền...'
      },
      {
        key: 'Id',
        label: t('system.roleGroupId', 'Mã Nhóm Quyền'),
        type: 'text',
        placeholder: 'Tìm theo mã ID nhóm...'
      },
      {
        key: 'Comment',
        label: t('system.comment', 'Diễn giải / Ghi chú'),
        type: 'text',
        placeholder: 'Tìm theo diễn giải...'
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'Name',
        label: t('system.roleGroupName', 'Tên Nhóm Quyền'),
        type: 'text',
        placeholder: 'Tìm theo tên nhóm quyền...',
        maxLength: 300,
        visible: !hiddenKeys.has('Name')
      },
      {
        key: 'Id',
        label: t('system.roleGroupId', 'Mã Nhóm Quyền'),
        type: 'text',
        placeholder: 'Tìm theo mã ID nhóm...',
        maxLength: 100,
        visible: !hiddenKeys.has('Id')
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

  const queryValues = useMemo(() => {
    return {
      Name: name,
      Id: id,
      ...searchValues
    }
  }, [name, id, searchValues])

  const handleFieldChange = (key, value) => {
    if (key === 'Name') {
      if (setName) setName(value)
    } else if (key === 'Id') {
      if (setId) setId(value)
    } else {
      if (setSearchValues) {
        setSearchValues((prev) => ({
          ...prev,
          [key]: value
        }))
      }
    }
  }

  const handleToggleHide = (key) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleReset = () => {
    if (setName) setName('')
    if (setId) setId('')
    if (setSearchValues) setSearchValues({})
    setHiddenKeys(new Set())
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      values={queryValues}
      onChange={handleFieldChange}
      onSearch={handleSearchData}
      onReset={handleReset}
      disabled={disabled}
      allAvailableFields={allAvailableFields}
      onAddField={onAddQueryField}
      onToggleHideField={handleToggleHide}
      hiddenKeys={hiddenKeys}
      storageKey="q_role_grp"
    />
  )
}
