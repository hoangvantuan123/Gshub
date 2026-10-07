/* eslint-disable react/prop-types */
import { Button } from '../../../../../components/ui/button'
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  KeyRound,
  RotateCw,
  Lock,
  Unlock,
  FileSpreadsheet
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function UserActions({
  handleSearchData,
  handleOpenAddModal,
  handleOpenEditModal,
  handleOpenResetPassModal,
  handleToggleStatus,
  handleDeleteUser,
  handleExportExcel,
  handleRefresh,
  selectedUser,
  isLoading = false,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canCreate = permissions.canCreate !== undefined ? Boolean(permissions.canCreate) : true
  const canEdit = permissions.canEdit !== undefined ? Boolean(permissions.canEdit) : true
  const canDelete = permissions.canDelete !== undefined ? Boolean(permissions.canDelete) : true

  const isSelected = Boolean(selectedUser)
  const isSelectedActive = selectedUser?.StatusAcc === 1 || selectedUser?.StatusAcc === true

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
            title="Truy vấn danh sách người dùng (Ctrl+Q)"
          >
            <Search size={13} className="text-blue-500" />
            {t('TÌM KIẾM')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddUser"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddModal}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Mở form đăng ký tài khoản người dùng mới"
          >
            <Plus size={13} className="text-emerald-500" />
            {t('ĐĂNG KÝ TÀI KHOẢN (THÊM MỚI)')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="EditUser"
            variant="ghost"
            size="sm"
            onClick={handleOpenEditModal}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            title="Chỉnh sửa thông tin tài khoản đang chọn"
          >
            <Edit3 size={13} className="text-blue-500" />
            {t('CHỈNH SỬA')}
          </Button>
        )}

        <Button
          key="ResetPassword"
          variant="ghost"
          size="sm"
          onClick={handleOpenResetPassModal}
          disabled={!isSelected}
          className="uppercase text-[11px] font-semibold text-amber-700 hover:text-amber-800"
          title="Đặt lại mật khẩu cho tài khoản đang chọn"
        >
          <KeyRound size={13} className="text-amber-500" />
          {t('ĐẶT LẠI MẬT KHẨU')}
        </Button>

        {canEdit && (
          <Button
            key="ToggleStatus"
            variant="ghost"
            size="sm"
            onClick={handleToggleStatus}
            disabled={!isSelected}
            className={`uppercase text-[11px] font-semibold ${
              isSelectedActive
                ? 'text-amber-700 hover:text-amber-800'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
            title={isSelectedActive ? 'Khóa tài khoản đang chọn' : 'Mở khóa kích hoạt tài khoản'}
          >
            {isSelectedActive ? (
              <>
                <Lock size={13} className="text-amber-600" />
                {t('KHÓA TÀI KHOẢN')}
              </>
            ) : (
              <>
                <Unlock size={13} className="text-emerald-600" />
                {t('MỞ KHÓA TÀI KHOẢN')}
              </>
            )}
          </Button>
        )}

        {canDelete && (
          <Button
            key="Delete"
            variant="ghost"
            size="sm"
            onClick={handleDeleteUser}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa tài khoản đang chọn (Ctrl+Shift+D)"
          >
            <Trash2 size={13} className="text-rose-500" />
            {t('XÓA TÀI KHOẢN')}
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

      <div className="flex items-center gap-1.5">
        {handleExportExcel && (
          <Button
            key="ExportExcel"
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Xuất danh sách người dùng ra file Excel"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            {t('XUẤT EXCEL')}
          </Button>
        )}
      </div>
    </div>
  )
}
