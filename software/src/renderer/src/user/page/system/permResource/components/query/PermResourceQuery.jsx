/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function PermResourceQuery({
  keyword = '',
  setKeyword,
  resourceCodeFilter = '',
  setResourceCodeFilter,
  rootMenuFilter = '',
  setRootMenuFilter,
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
        key: 'Keyword',
        label: t('system.keyword', 'Từ Khóa'),
        type: 'text',
        placeholder: 'Tìm theo mã hoặc tên menu/chức năng...'
      },
      {
        key: 'ResourceCode',
        label: t('system.resourceCode', 'Mã Chức Năng / MenuKey'),
        type: 'text',
        placeholder: 'Nhập mã chức năng...'
      },
      {
        key: 'RootMenuName',
        label: t('system.rootMenuName', 'Phân Hệ (Root Module)'),
        type: 'text',
        placeholder: 'Tìm theo tên phân hệ...'
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
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'Keyword',
        label: t('system.keyword', 'Từ Khóa'),
        type: 'text',
        placeholder: 'Tìm theo mã hoặc tên menu...',
        maxLength: 200,
        visible: !hiddenKeys.has('Keyword')
      },
      {
        key: 'ResourceCode',
        label: t('system.resourceCode', 'Mã Chức Năng'),
        type: 'text',
        placeholder: 'Nhập mã chức năng...',
        maxLength: 100,
        visible: !hiddenKeys.has('ResourceCode')
      },
      {
        key: 'RootMenuName',
        label: t('system.rootMenuName', 'Phân Hệ'),
        type: 'text',
        placeholder: 'Nhập tên phân hệ...',
        maxLength: 150,
        visible: !hiddenKeys.has('RootMenuName')
      }
    ]
  }, [t, hiddenKeys])

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
      Keyword: keyword,
      ResourceCode: resourceCodeFilter,
      RootMenuName: rootMenuFilter,
      ...searchValues
    }
  }, [keyword, resourceCodeFilter, rootMenuFilter, searchValues])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.Keyword !== undefined && setKeyword) setKeyword(keyOrObj.Keyword)
      if (keyOrObj.ResourceCode !== undefined && setResourceCodeFilter)
        setResourceCodeFilter(keyOrObj.ResourceCode)
      if (keyOrObj.RootMenuName !== undefined && setRootMenuFilter)
        setRootMenuFilter(keyOrObj.RootMenuName)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'Keyword' && setKeyword) setKeyword(val)
      else if (key === 'ResourceCode' && setResourceCodeFilter) setResourceCodeFilter(val)
      else if (key === 'RootMenuName' && setRootMenuFilter) setRootMenuFilter(val)
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
      const isDefault = key === 'Keyword' || key === 'ResourceCode' || key === 'RootMenuName'
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
