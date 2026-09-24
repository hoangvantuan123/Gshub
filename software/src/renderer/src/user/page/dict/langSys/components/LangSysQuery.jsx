import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function LangSysQuery({
  setLanguageName,
  languageName = '',
  setLanguageCode,
  languageCode = '',
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
        key: 'LanguageName',
        label: t('system.languageName', 'Tên ngôn ngữ'),
        type: 'text',
        placeholder: 'Nhập tên ngôn ngữ...'
      },
      {
        key: 'LanguageCode',
        label: t('system.languageCode', 'Mã ngôn ngữ'),
        type: 'text',
        placeholder: 'Nhập mã ngôn ngữ...'
      },
      {
        key: 'Remark',
        label: t('system.remark', 'Ghi chú'),
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
        key: 'CreatedBy',
        label: t('system.createdBy', 'Người tạo'),
        type: 'text',
        placeholder: 'Tìm theo người tạo...'
      },
      {
        key: 'UpdatedBy',
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
        key: 'LanguageName',
        label: t('system.languageName', 'Tên ngôn ngữ'),
        type: 'text',
        placeholder: 'Nhập tên ngôn ngữ...',
        maxLength: 300,
        visible: !hiddenKeys.has('LanguageName')
      },
      {
        key: 'LanguageCode',
        label: t('system.languageCode', 'Mã ngôn ngữ'),
        type: 'text',
        placeholder: 'Nhập mã ngôn ngữ...',
        maxLength: 100,
        visible: !hiddenKeys.has('LanguageCode')
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
      LanguageName: languageName,
      LanguageCode: languageCode
    }
  }, [searchValues, languageName, languageCode])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.LanguageName !== undefined && setLanguageName)
        setLanguageName(keyOrObj.LanguageName)
      if (keyOrObj.LanguageCode !== undefined && setLanguageCode)
        setLanguageCode(keyOrObj.LanguageCode)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'LanguageName' && setLanguageName) setLanguageName(val)
      else if (key === 'LanguageCode' && setLanguageCode) setLanguageCode(val)
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
      const isDefault = key === 'LanguageName' || key === 'LanguageCode'
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
