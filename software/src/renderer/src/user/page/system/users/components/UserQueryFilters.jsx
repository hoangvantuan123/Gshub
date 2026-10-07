/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function UserQueryFilters({
  searchValues = {},
  setSearchValues,
  roleOptions = [],
  handleSearchData,
  disabled = false
}) {
  const { t } = useTranslation()

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'Keyword',
        label: t('system.user.keyword', 'Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Mã người dùng, Họ tên, Email, SĐT...'
      },
      {
        key: 'Department',
        label: t('system.user.department', 'Phòng ban / Bộ phận'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả phòng ban' },
          { value: 'Ban Giám Đốc', label: 'Ban Giám Đốc' },
          { value: 'Phòng Sản Xuất', label: 'Phòng Sản Xuất' },
          { value: 'Phòng Kế Hoạch', label: 'Phòng Kế Hoạch' },
          { value: 'Phòng Quản Lý Chất Lượng (QC)', label: 'Phòng Quản Lý Chất Lượng (QC)' },
          { value: 'Phòng Kỹ Thuật', label: 'Phòng Kỹ Thuật' },
          { value: 'Phòng IT & Hệ Thống', label: 'Phòng IT & Hệ Thống' },
          { value: 'Kho & Vận Hành', label: 'Kho & Vận Hành' }
        ]
      },
      {
        key: 'RoleId',
        label: t('system.user.role', 'Nhóm quyền / Vai trò'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhóm quyền' },
          ...roleOptions.map((r) => ({
            value: r.RoleId || r.Id,
            label: r.RoleName || r.Name || r.RoleId
          }))
        ]
      },
      {
        key: 'StatusAcc',
        label: t('system.user.status', 'Trạng thái tài khoản'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: '1', label: 'Đang hoạt động' },
          { value: '0', label: 'Đã bị khóa' }
        ]
      }
    ],
    [t, roleOptions]
  )

  const handleChange = (fieldKey, value) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }))
  }

  return (
    <div className="bg-white border-b border-slate-200 px-2 py-1.5">
      <DynamicQueryBar
        fields={allAvailableFields}
        allAvailableFields={allAvailableFields}
        values={searchValues}
        onChange={handleChange}
        onSearch={handleSearchData}
        disabled={disabled}
        columns={4}
        showSettings={false}
      />
    </div>
  )
}
