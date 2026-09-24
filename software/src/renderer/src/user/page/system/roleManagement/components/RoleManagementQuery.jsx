/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'
import { PostQRoleGroup } from '../../../../../api/system'
import { createCodeHelpFetcher } from '../../../../utils/codeHelpUtils'

export default function RoleManagementQuery({
  groupId = '',
  setGroupId,
  groupName = '',
  setGroupName,
  comment = '',
  setComment,
  createdByName = '',
  setCreatedByName,
  handleSearch,
  disabled = false,
  customFields,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())
  const [dynamicValues, setDynamicValues] = useState({})

  // Code Help tra cứu Nhóm Quyền
  const codeHelpConfig = useMemo(() => {
    return {
      GroupName: {
        title: t('Tra cứu Nhóm Quyền Hệ Thống'),
        columns: [
          { id: 'Id', title: t('Mã Nhóm'), width: 90 },
          { id: 'Name', title: t('Tên Nhóm Quyền'), width: 250 },
          { id: 'Comment', title: t('Mô Tả / Ghi Chú'), width: 220 }
        ],
        fetchHelpData: createCodeHelpFetcher(PostQRoleGroup),
        onSelect: (selected) => {
          if (setGroupId) setGroupId(String(selected.Id || ''))
          if (setGroupName) setGroupName(selected.Name || '')
          if (setComment) setComment(selected.Comment || '')
          if (setCreatedByName) setCreatedByName(selected.CreatedByName || '')
          return {
            GroupId: String(selected.Id || ''),
            GroupName: selected.Name || '',
            Comment: selected.Comment || '',
            CreatedByName: selected.CreatedByName || ''
          }
        }
      }
    }
  }, [setComment, setCreatedByName, setGroupId, setGroupName, t])

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'GroupName',
        label: t('system.groupName', 'Tên Nhóm Quyền *'),
        type: 'text',
        hasCodeHelp: true,
        codeHelpConfig: codeHelpConfig.GroupName,
        placeholder: 'Nhập hoặc bấm F2 tra cứu...'
      },
      {
        key: 'GroupId',
        label: t('system.groupId', 'Mã Nhóm'),
        type: 'text',
        placeholder: 'ID Nhóm...'
      },
      {
        key: 'Comment',
        label: t('system.comment', 'Ghi Chú / Mô Tả'),
        type: 'text',
        placeholder: 'Ghi chú...'
      },
      {
        key: 'CreatedByName',
        label: t('system.createdByName', 'Người Đăng Ký'),
        type: 'text',
        placeholder: 'Người tạo...'
      },
      ...(dynamicQueryFields || []).map((f) => ({
        key: f.key,
        label: f.label || f.key,
        type: f.type || 'text',
        placeholder: f.placeholder
      }))
    ],
    [codeHelpConfig, dynamicQueryFields, t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'GroupName',
        label: t('system.groupName', 'Tên Nhóm Quyền'),
        type: 'text',
        required: true,
        hasCodeHelp: true,
        codeHelpConfig: codeHelpConfig.GroupName,
        placeholder: 'Nhập hoặc bấm F2 tra cứu...',
        maxLength: 300,
        visible: !hiddenKeys.has('GroupName')
      },
      {
        key: 'GroupId',
        label: t('system.groupId', 'Mã Nhóm'),
        type: 'text',
        placeholder: 'ID...',
        maxLength: 50,
        visible: !hiddenKeys.has('GroupId')
      },
      {
        key: 'Comment',
        label: t('system.comment', 'Ghi Chú / Mô Tả'),
        type: 'text',
        placeholder: 'Ghi chú...',
        maxLength: 300,
        visible: !hiddenKeys.has('Comment')
      },
      {
        key: 'CreatedByName',
        label: t('system.createdByName', 'Người Đăng Ký'),
        type: 'text',
        placeholder: 'Người tạo...',
        maxLength: 100,
        visible: !hiddenKeys.has('CreatedByName')
      }
    ]
  }, [codeHelpConfig, hiddenKeys, t])

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
      GroupId: groupId,
      GroupName: groupName,
      Comment: comment,
      CreatedByName: createdByName,
      ...dynamicValues
    }
  }, [groupId, groupName, comment, createdByName, dynamicValues])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.GroupId !== undefined && setGroupId) setGroupId(keyOrObj.GroupId)
      if (keyOrObj.GroupName !== undefined && setGroupName) setGroupName(keyOrObj.GroupName)
      if (keyOrObj.Comment !== undefined && setComment) setComment(keyOrObj.Comment)
      if (keyOrObj.CreatedByName !== undefined && setCreatedByName)
        setCreatedByName(keyOrObj.CreatedByName)
      setDynamicValues((prev) => ({ ...prev, ...keyOrObj }))
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'GroupId' && setGroupId) setGroupId(val)
      else if (key === 'GroupName' && setGroupName) setGroupName(val)
      else if (key === 'Comment' && setComment) setComment(val)
      else if (key === 'CreatedByName' && setCreatedByName) setCreatedByName(val)
      else {
        setDynamicValues((prev) => ({ ...prev, [key]: val }))
      }
    }
  }

  const handleToggleField = (key, checked, fieldMeta) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(key)
      else next.add(key)
      return next
    })

    if (checked && onAddQueryField) {
      const isDefault =
        key === 'GroupId' || key === 'GroupName' || key === 'Comment' || key === 'CreatedByName'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    setDynamicValues({})
    if (setGroupId) setGroupId('')
    if (setGroupName) setGroupName('')
    if (setComment) setComment('')
    if (setCreatedByName) setCreatedByName('')
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={values}
      onChange={handleChange}
      onSearch={handleSearch}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
