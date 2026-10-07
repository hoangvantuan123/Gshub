/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

/**
 * UserQuery - Thanh tìm kiếm quản lý người dùng
 * Được xây dựng dựa trên DynamicQueryBar chuẩn ERP, hỗ trợ mở rộng dynamic query fields khi bấm Ctrl+F,
 * cấu hình ẩn/hiện điều kiện và lưu cache LocalStorage.
 */
export default function UserQuery({
  setUserName,
  userName = '',
  setUserId,
  userId = '',
  handleSearchData,
  disabled = false,
  onOpenCodeHelp,
  userStatus = '',
  setUserStatus,
  statusOptions,
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
        key: 'userName',
        label: 'Tên người dùng',
        type: 'text',
        placeholder: 'Nhập tên người dùng...'
      },
      {
        key: 'userId',
        label: 'Tài khoản',
        type: onOpenCodeHelp ? 'codehelp' : 'text',
        placeholder: 'Nhập tài khoản...',
        onCodeHelp: onOpenCodeHelp
      },
      { key: 'Email', label: 'Email', type: 'text', placeholder: 'Tìm theo Email...' },
      { key: 'EmpCode', label: 'Mã nhân viên', type: 'text', placeholder: 'Tìm theo mã NV...' },
      { key: 'EmpName', label: 'Nhân viên', type: 'text', placeholder: 'Tìm theo tên NV...' },
      {
        key: 'DeptName',
        label: 'Bộ phận làm việc',
        type: 'text',
        placeholder: 'Tìm theo bộ phận...'
      },
      { key: 'ManagerName', label: 'Quản lý', type: 'text', placeholder: 'Tìm theo quản lý...' },
      { key: 'Remark', label: 'Ghi chú', type: 'text', placeholder: 'Tìm theo ghi chú...' },
      { key: 'CreatedAt', label: 'Thời gian tạo', type: 'date-range', colSpan: 2 },
      { key: 'UpdatedAt', label: 'Thời gian cập nhật', type: 'date-range', colSpan: 2 },
      { key: 'LastLoginDate', label: 'Đăng nhập gần nhất', type: 'date-range', colSpan: 2 },
      {
        key: 'CreatedByName',
        label: 'Người tạo',
        type: 'text',
        placeholder: 'Tìm theo người tạo...'
      },
      {
        key: 'UpdatedByName',
        label: 'Người cập nhật',
        type: 'text',
        placeholder: 'Tìm theo người sửa...'
      }
    ],
    [onOpenCodeHelp]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'userName',
        label: 'Tên người dùng',
        type: 'text',
        placeholder: 'Nhập tên người dùng...',
        maxLength: 300,
        visible: !hiddenKeys.has('userName')
      },
      {
        key: 'userId',
        label: 'Tài khoản',
        type: onOpenCodeHelp ? 'codehelp' : 'text',
        placeholder: 'Nhập tài khoản...',
        onCodeHelp: onOpenCodeHelp,
        maxLength: 300,
        visible: !hiddenKeys.has('userId')
      }
    ]
  }, [onOpenCodeHelp, hiddenKeys])

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
      userName,
      userId,
      userStatus
    }
  }, [searchValues, userName, userId, userStatus])

  const handleChange = (key, val) => {
    if (key === 'userName') {
      if (setUserName) setUserName(val)
    } else if (key === 'userId') {
      if (setUserId) setUserId(val)
    } else if (key === 'userStatus') {
      if (setUserStatus) setUserStatus(val)
    } else {
      if (setSearchValues) {
        setSearchValues((prev) => ({ ...prev, [key]: val }))
      }
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
      const isDefault = key === 'userName' || key === 'userId' || key === 'userStatus'
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
      onCodeHelp={onOpenCodeHelp}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
