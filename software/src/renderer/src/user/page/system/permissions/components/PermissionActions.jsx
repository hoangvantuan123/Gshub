/* eslint-disable react/prop-types */
import { Button } from '../../../../../components/ui/button'
import { Search, Plus, Edit3, Trash2, RotateCw, UserPlus, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PermissionActions({
  handleSearchData,
  handleOpenAddRoleModal,
  handleOpenEditRoleModal,
  handleOpenAddUserModal,
  handleSavePermissions,
  handleDeleteRole,
  handleRefresh,
  selectedRole,
  isLoading = false,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canCreate = permissions.canCreate !== undefined ? Boolean(permissions.canCreate) : true
  const canEdit = permissions.canEdit !== undefined ? Boolean(permissions.canEdit) : true
  const canDelete = permissions.canDelete !== undefined ? Boolean(permissions.canDelete) : true

  const isSelected = Boolean(selectedRole)
  const isAdmin = selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'

  return (
    <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
      <div className="flex items-center gap-1.5">
        {canSearch && (
          <Button
            key="Search"
            variant="ghost"
            size="sm"
            onClick={handleSearchData}
            disabled={isLoading}
            className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            title="Truy vấn nhóm quyền & phân bổ người dùng (Ctrl+Q)"
          >
            <Search size={13} className="text-blue-500" />
            {t('TÌM KIẾM')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddRole"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddRoleModal}
            className="uppercase text-[11px] font-semibold text-purple-700 hover:text-purple-800"
            title="Tạo nhóm vai trò / phân quyền mới"
          >
            <Plus size={13} className="text-purple-500" />
            {t('TẠO NHÓM QUYỀN MỚI')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="EditRole"
            variant="ghost"
            size="sm"
            onClick={handleOpenEditRoleModal}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            title="Chỉnh sửa thông tin nhóm quyền đang chọn"
          >
            <Edit3 size={13} className="text-blue-500" />
            {t('SỬA NHÓM QUYỀN')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="AddUserToRole"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddUserModal}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800"
            title="Gán thêm người dùng vào nhóm quyền đang chọn"
          >
            <UserPlus size={13} className="text-indigo-500" />
            {t('GÁN THÀNH VIÊN')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="SavePermissions"
            variant="ghost"
            size="sm"
            onClick={handleSavePermissions}
            disabled={!isSelected || isLoading}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Lưu cấu hình phân quyền menu và thao tác (Ctrl+S)"
          >
            <Save size={13} className="text-emerald-600" />
            {t('LƯU PHÂN QUYỀN')}
          </Button>
        )}

        {canDelete && (
          <Button
            key="Delete"
            variant="ghost"
            size="sm"
            onClick={handleDeleteRole}
            disabled={!isSelected || isAdmin}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa nhóm quyền đang chọn"
          >
            <Trash2 size={13} className="text-rose-500" />
            {t('XÓA NHÓM')}
          </Button>
        )}

        <Button
          key="Refresh"
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Tải lại dữ liệu (F5)"
        >
          <RotateCw size={13} className={`text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          {t('TẢI LẠI')}
        </Button>
      </div>
    </div>
  )
}
