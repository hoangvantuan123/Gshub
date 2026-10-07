/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function PermissionQueryFilters({
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
        label: t('system.permission.keyword', 'Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Mã nhóm, Tên vai trò, Tên thành viên...'
      },
      {
        key: 'RoleId',
        label: t('system.permission.role', 'Chọn Nhóm Quyền'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả nhóm quyền' },
          ...roleOptions.map((r) => ({
            value: r.RoleId || r.Id,
            label: `${r.RoleName || r.Name} (${r.RoleId || r.Id})`
          }))
        ]
      },
      {
        key: 'Department',
        label: t('system.permission.department', 'Phòng ban thành viên'),
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
        columns={3}
        showSettings={false}
      />
    </div>
  )
}
