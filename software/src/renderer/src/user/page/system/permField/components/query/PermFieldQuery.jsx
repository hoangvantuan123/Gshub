/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function PermFieldQuery({
  setResourceCode,
  resourceCode = '',
  setFieldCode,
  fieldCode = '',
  setFieldName,
  fieldName = '',
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
        key: 'ResourceCode',
        label: t('system.resourceCode', 'Mã Chức Năng'),
        type: 'text',
        placeholder: 'Nhập mã chức năng...'
      },
      {
        key: 'FieldCode',
        label: t('system.fieldCode', 'Mã Trường Dữ Liệu'),
        type: 'text',
        placeholder: 'Nhập mã trường...'
      },
      {
        key: 'FieldName',
        label: t('system.fieldName', 'Tên Trường Dữ Liệu'),
        type: 'text',
        placeholder: 'Nhập tên trường...'
      },
      {
        key: 'DictSeq',
        label: t('system.dictSeq', 'Mã Từ Điển'),
        type: 'text',
        placeholder: 'Tìm theo mã từ điển...'
      },
      {
        key: 'LangKey',
        label: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        type: 'text',
        placeholder: 'Tìm theo key ngôn ngữ...'
      },
      {
        key: 'IsMaskable',
        label: t('system.isMaskable', 'Cho Phép Ẩn (***)'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'true', label: 'Có' },
          { value: 'false', label: 'Không' }
        ]
      },
      {
        key: 'IsSensitive',
        label: t('system.isSensitive', 'Dữ Liệu Nhạy Cảm'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'true', label: 'Có' },
          { value: 'false', label: 'Không' }
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
        key: 'ResourceCode',
        label: t('system.resourceCode', 'Mã Chức Năng'),
        type: 'text',
        placeholder: 'Nhập mã chức năng...',
        maxLength: 200,
        visible: !hiddenKeys.has('ResourceCode')
      },
      {
        key: 'FieldCode',
        label: t('system.fieldCode', 'Mã Trường'),
        type: 'text',
        placeholder: 'Nhập mã trường...',
        maxLength: 200,
        visible: !hiddenKeys.has('FieldCode')
      },
      {
        key: 'FieldName',
        label: t('system.fieldName', 'Tên Trường'),
        type: 'text',
        placeholder: 'Nhập tên trường...',
        maxLength: 300,
        visible: !hiddenKeys.has('FieldName')
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
      ResourceCode: resourceCode,
      FieldCode: fieldCode,
      FieldName: fieldName
    }
  }, [searchValues, resourceCode, fieldCode, fieldName])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.ResourceCode !== undefined && setResourceCode)
        setResourceCode(keyOrObj.ResourceCode)
      if (keyOrObj.FieldCode !== undefined && setFieldCode) setFieldCode(keyOrObj.FieldCode)
      if (keyOrObj.FieldName !== undefined && setFieldName) setFieldName(keyOrObj.FieldName)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'ResourceCode' && setResourceCode) setResourceCode(val)
      else if (key === 'FieldCode' && setFieldCode) setFieldCode(val)
      else if (key === 'FieldName' && setFieldName) setFieldName(val)
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
      const isDefault = key === 'ResourceCode' || key === 'FieldCode' || key === 'FieldName'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (setResourceCode) setResourceCode('')
    if (setFieldCode) setFieldCode('')
    if (setFieldName) setFieldName('')
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
