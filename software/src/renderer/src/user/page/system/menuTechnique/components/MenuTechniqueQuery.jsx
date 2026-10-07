/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function MenuTechniqueQuery({
  onSearch,
  handleSearchData,
  customFields,
  disabled = false,
  label = '',
  setLabel,
  keyMenu = '',
  setKeyMenu,
  type = '',
  setType,
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
        label: t('system.label', 'Tên Menu'),
        type: 'text',
        placeholder: 'Nhập tên Menu...'
      },
      {
        key: 'Key',
        label: t('system.key', 'Mã Key'),
        type: 'text',
        placeholder: 'Nhập mã key...'
      },
      {
        key: 'Type',
        label: t('system.type', 'Loại Menu'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'menu', label: 'menu (Main Menu)' },
          { value: 'submenu', label: 'submenu (Sub Menu)' },
          { value: 'menuitem', label: 'menuitem (Menu Item)' }
        ]
      },
      {
        key: 'MenuRootName',
        label: t('system.moduleLevel1', 'Module (Cấp 1)'),
        type: 'text',
        placeholder: 'Tìm theo Module Cấp 1...'
      },
      {
        key: 'MenuSubRootName',
        label: t('system.submenuLevel2', 'Submenu (Cấp 2)'),
        type: 'text',
        placeholder: 'Tìm theo Submenu Cấp 2...'
      },
      {
        key: 'Link',
        label: t('system.link', 'Đường dẫn (Link)'),
        type: 'text',
        placeholder: 'Tìm theo link...'
      },
      {
        key: 'OrderSeq',
        label: t('system.orderSeq', 'STT'),
        type: 'text',
        placeholder: 'Tìm theo STT...'
      },
      {
        key: 'DictSeq',
        label: t('system.dictSeq', 'Mã từ điển'),
        type: 'text',
        placeholder: 'Tìm theo mã từ điển...'
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
        label: t('system.label', 'Tên Menu'),
        type: 'text',
        placeholder: 'Nhập tên Menu...',
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
      },
      {
        key: 'Type',
        label: t('system.type', 'Loại Menu'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'menu', label: 'menu (Main Menu)' },
          { value: 'submenu', label: 'submenu (Sub Menu)' },
          { value: 'menuitem', label: 'menuitem (Menu Item)' }
        ],
        visible: !hiddenKeys.has('Type')
      }
    ]
  }, [hiddenKeys, t])

  const combinedFields = useMemo(() => {
    if (customFields) return customFields
    const dynFieldsWithRemove = (dynamicQueryFields || []).map((f) => {
      const fieldMeta = allAvailableFields.find((item) => item.key === f.key) || {}
      return {
        ...fieldMeta,
        ...f,
        type: f.type || fieldMeta.type || 'text',
        placeholder: f.placeholder || fieldMeta.placeholder || `Tìm ${f.label || f.key}...`,
        visible: !hiddenKeys.has(f.key),
        onRemove: onRemoveQueryField ? () => onRemoveQueryField(f.key) : undefined
      }
    })
    return [...defaultFields, ...dynFieldsWithRemove]
  }, [
    customFields,
    defaultFields,
    dynamicQueryFields,
    allAvailableFields,
    hiddenKeys,
    onRemoveQueryField
  ])

  const values = useMemo(() => {
    return {
      ...searchValues,
      Label: label,
      Key: keyMenu,
      Type: type
    }
  }, [searchValues, label, keyMenu, type])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.Label !== undefined && setLabel) setLabel(keyOrObj.Label)
      if (keyOrObj.Key !== undefined && setKeyMenu) setKeyMenu(keyOrObj.Key)
      if (keyOrObj.Type !== undefined && setType) setType(keyOrObj.Type)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'Label' && setLabel) setLabel(val)
      else if (key === 'Key' && setKeyMenu) setKeyMenu(val)
      else if (key === 'Type' && setType) setType(val)
      else if (setSearchValues) setSearchValues((prev) => ({ ...prev, [key]: val }))
    }
  }

  const handleToggleField = (key, isVisible) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (isVisible) next.delete(key)
      else next.add(key)
      return next
    })

    if (isVisible && onAddQueryField) {
      const fieldMeta = allAvailableFields.find((f) => f.key === key)
      const isDefault = key === 'Label' || key === 'Key' || key === 'Type'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (onResetQuery) onResetQuery()
  }

  const searchFn = onSearch || handleSearchData

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={values}
      onChange={handleChange}
      onSearch={searchFn}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
