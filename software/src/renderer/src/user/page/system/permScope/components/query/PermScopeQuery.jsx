/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function PermScopeQuery({
  setScopeCode,
  scopeCode = '',
  setScopeName,
  scopeName = '',
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
        key: 'ScopeCode',
        label: t('system.scopeCode', 'Mã Quy Tắc Phạm Vi'),
        type: 'text',
        placeholder: 'Nhập mã quy tắc phạm vi...'
      },
      {
        key: 'ScopeName',
        label: t('system.scopeName', 'Tên Quy Tắc Phạm Vi'),
        type: 'text',
        placeholder: 'Nhập tên quy tắc phạm vi...'
      },
      {
        key: 'OperationCode',
        label: t('system.operationCode', 'Mã Thao Tác (Action)'),
        type: 'text',
        placeholder: 'Tìm theo mã thao tác...'
      },
      {
        key: 'OperationName',
        label: t('system.operationName', 'Tên Thao Tác Nghiệp Vụ'),
        type: 'text',
        placeholder: 'Tìm theo tên thao tác...'
      },
      {
        key: 'DefaultScopeLevel',
        label: t('system.defaultScopeLevel', 'Mã Cấp Phạm Vi'),
        type: 'text',
        placeholder: 'Tìm theo mã cấp phạm vi...'
      },
      {
        key: 'DefaultScopeLevelLabel',
        label: t('system.defaultScopeLevelLabel', 'Cấp Phạm Vi Dữ Liệu'),
        type: 'text',
        placeholder: 'Tìm theo cấp phạm vi...'
      },
      {
        key: 'RuleCondition',
        label: t('system.ruleCondition', 'Mã Điều Kiện Phiếu'),
        type: 'text',
        placeholder: 'Tìm theo mã điều kiện...'
      },
      {
        key: 'RuleConditionLabel',
        label: t('system.ruleConditionLabel', 'Điều Kiện Trạng Thái Phiếu'),
        type: 'text',
        placeholder: 'Tìm theo điều kiện phiếu...'
      },
      {
        key: 'LangKey',
        label: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        type: 'text',
        placeholder: 'Tìm theo key ngôn ngữ...'
      },
      {
        key: 'ConditionSql',
        label: t('system.conditionSql', 'Biểu thức WHERE SQL'),
        type: 'text',
        placeholder: 'Tìm theo biểu thức SQL...'
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
        key: 'ScopeCode',
        label: t('system.scopeCode', 'Mã Quy Tắc Phạm Vi'),
        type: 'text',
        placeholder: 'Nhập mã quy tắc phạm vi...',
        maxLength: 100,
        visible: !hiddenKeys.has('ScopeCode')
      },
      {
        key: 'ScopeName',
        label: t('system.scopeName', 'Tên Quy Tắc Phạm Vi'),
        type: 'text',
        placeholder: 'Nhập tên quy tắc phạm vi...',
        maxLength: 255,
        visible: !hiddenKeys.has('ScopeName')
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
      ScopeCode: scopeCode,
      ScopeName: scopeName
    }
  }, [searchValues, scopeCode, scopeName])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.ScopeCode !== undefined && setScopeCode) setScopeCode(keyOrObj.ScopeCode)
      if (keyOrObj.ScopeName !== undefined && setScopeName) setScopeName(keyOrObj.ScopeName)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'ScopeCode' && setScopeCode) setScopeCode(val)
      else if (key === 'ScopeName' && setScopeName) setScopeName(val)
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
      const isDefault = key === 'ScopeCode' || key === 'ScopeName'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (setScopeCode) setScopeCode('')
    if (setScopeName) setScopeName('')
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
