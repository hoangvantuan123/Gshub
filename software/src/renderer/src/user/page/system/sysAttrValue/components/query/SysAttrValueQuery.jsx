/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'
import { PostSysAttrGroupH } from '@renderer/api/help'

const fetchSysAttrGroupsHelp = async (keyword = '', page = 1, limit = 50, col = 'ALL') => {
  try {
    const res = await PostSysAttrGroupH({
      Keyword: keyword,
      KeyType: col !== 'ALL' ? col : '',
      KeyValue: keyword,
      Page: String(page),
      Limit: String(limit),
      search: keyword,
      page: String(page),
      limit: String(limit)
    })
    if (res && res.success) {
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (err) {
    console.error('Error fetching SysAttrGroupH:', err)
  }
  return []
}

export default function SysAttrValueQuery({
  setGroupCode,
  groupCode = '',
  setAttrValueCode,
  attrValueCode = '',
  setAttrValueName,
  attrValueName = '',
  setIsActive,
  isActive = '',
  handleSearchData,
  disabled = false,
  customFields,
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery,
  groupHelpData = [],
  groupHelpColumns = []
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())

  const fallbackHelpColumns = useMemo(() => {
    if (groupHelpColumns && groupHelpColumns.length > 0) return groupHelpColumns
    return [
      { id: 'GroupCode', title: t('system.groupCode', 'Mã Nhóm'), width: 180 },
      { id: 'GroupName', title: t('system.groupName', 'Tên Nhóm'), width: 280 },
      { id: 'CodeHelp', title: t('system.codeHelp', 'CodeHelp'), width: 100 },
      { id: 'Comment', title: t('system.comment', 'Ghi Chú'), width: 220 }
    ]
  }, [groupHelpColumns, t])

  const handleSelectGroup = (selected) => {
    if (!selected) return
    const groupCodeVal =
      selected.GroupCode || selected.groupCode || selected.Code || selected.Key || ''
    const groupNameVal =
      selected.GroupName || selected.groupName || selected.Name || selected.Label || ''
    const attrGroupSeqVal =
      selected.IdSeq || selected.idSeq || selected.AttrGroupSeq || selected.Id || ''

    if (groupCodeVal) {
      if (setGroupCode) setGroupCode(groupCodeVal)
      if (setSearchValues) {
        setSearchValues((prev) => ({
          ...prev,
          GroupCode: groupCodeVal,
          GroupName: groupNameVal,
          AttrGroupSeq: attrGroupSeqVal
        }))
      }
    }
  }

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'GroupCode',
        label: t('system.groupCode', 'Nhóm Thuộc Tính'),
        type: 'codehelp',
        placeholder: 'Chọn hoặc nhập mã nhóm...',
        helpData: groupHelpData,
        fetchHelpData: fetchSysAttrGroupsHelp,
        columns: fallbackHelpColumns,
        helpCols: fallbackHelpColumns,
        codeKey: 'GroupCode',
        nameKey: 'GroupName',
        helpTitle: t('system.lookupAttrGroup', 'Tra cứu Nhóm Thuộc Tính'),
        searchPlaceholder: t(
          'system.searchGroupPlaceholder',
          'Tìm theo mã hoặc tên nhóm thuộc tính...'
        ),
        onSelect: handleSelectGroup
      },
      {
        key: 'AttrValueCode',
        label: t('system.attrValueCode', 'Mã Giá Trị'),
        type: 'text',
        placeholder: 'Nhập mã giá trị (BRANCH, DEPT, DRAFT...)...'
      },
      {
        key: 'AttrValueName',
        label: t('system.attrValueName', 'Tên Giá Trị'),
        type: 'text',
        placeholder: 'Nhập tên giá trị...'
      },
      {
        key: 'IsActive',
        label: t('system.status', 'Trạng Thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'true', label: 'Đang hoạt động' },
          { value: 'false', label: 'Ngừng hoạt động' }
        ]
      },
      {
        key: 'LangKey',
        label: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        type: 'text',
        placeholder: 'Tìm theo key ngôn ngữ...'
      },
      {
        key: 'ExtraValue',
        label: t('system.extraValue', 'Giá Trị Mở Rộng (JSON/TEXT)'),
        type: 'text',
        placeholder: 'Tìm theo giá trị mở rộng...'
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
    [fallbackHelpColumns, groupHelpData, t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'GroupCode',
        label: t('system.groupCode', 'Nhóm Thuộc Tính'),
        type: 'codehelp',
        placeholder: 'Chọn hoặc nhập mã nhóm...',
        helpData: groupHelpData,
        fetchHelpData: fetchSysAttrGroupsHelp,
        columns: fallbackHelpColumns,
        helpCols: fallbackHelpColumns,
        codeKey: 'GroupCode',
        nameKey: 'GroupName',
        helpTitle: t('system.lookupAttrGroup', 'Tra cứu Nhóm Thuộc Tính'),
        searchPlaceholder: t(
          'system.searchGroupPlaceholder',
          'Tìm theo mã hoặc tên nhóm thuộc tính...'
        ),
        onSelect: handleSelectGroup,
        visible: !hiddenKeys.has('GroupCode')
      },
      {
        key: 'AttrValueCode',
        label: t('system.attrValueCode', 'Mã Giá Trị'),
        type: 'text',
        placeholder: 'Nhập mã giá trị...',
        maxLength: 100,
        visible: !hiddenKeys.has('AttrValueCode')
      },
      {
        key: 'AttrValueName',
        label: t('system.attrValueName', 'Tên Giá Trị'),
        type: 'text',
        placeholder: 'Nhập tên giá trị...',
        maxLength: 255,
        visible: !hiddenKeys.has('AttrValueName')
      },
      {
        key: 'IsActive',
        label: t('system.status', 'Trạng Thái'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'true', label: 'Đang hoạt động' },
          { value: 'false', label: 'Ngừng hoạt động' }
        ],
        visible: !hiddenKeys.has('IsActive')
      }
    ]
  }, [fallbackHelpColumns, groupHelpData, hiddenKeys, t])

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
      GroupCode: groupCode,
      AttrValueCode: attrValueCode,
      AttrValueName: attrValueName,
      IsActive: isActive
    }
  }, [searchValues, groupCode, attrValueCode, attrValueName, isActive])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.GroupCode !== undefined && setGroupCode) setGroupCode(keyOrObj.GroupCode)
      if (keyOrObj.AttrValueCode !== undefined && setAttrValueCode)
        setAttrValueCode(keyOrObj.AttrValueCode)
      if (keyOrObj.AttrValueName !== undefined && setAttrValueName)
        setAttrValueName(keyOrObj.AttrValueName)
      if (keyOrObj.IsActive !== undefined && setIsActive) setIsActive(keyOrObj.IsActive)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'GroupCode' && setGroupCode) setGroupCode(val)
      else if (key === 'AttrValueCode' && setAttrValueCode) setAttrValueCode(val)
      else if (key === 'AttrValueName' && setAttrValueName) setAttrValueName(val)
      else if (key === 'IsActive' && setIsActive) setIsActive(val)
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
      const isDefault =
        key === 'GroupCode' ||
        key === 'AttrValueCode' ||
        key === 'AttrValueName' ||
        key === 'IsActive'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (setGroupCode) setGroupCode('')
    if (setAttrValueCode) setAttrValueCode('')
    if (setAttrValueName) setAttrValueName('')
    if (setIsActive) setIsActive('')
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
