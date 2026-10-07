/* eslint-disable react/prop-types */
import { Button } from '../../../../../components/ui/button'
import { Search, Plus, Edit3, Trash2, RotateCw, LayoutGrid, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MenuActions({
  handleSearchData,
  handleOpenAddRootModal,
  handleOpenAddMenuModal,
  handleOpenEditModal,
  handleToggleView,
  handleDeleteMenu,
  handleRefresh,
  selectedItem,
  isLoading = false,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canCreate = permissions.canCreate !== undefined ? Boolean(permissions.canCreate) : true
  const canEdit = permissions.canEdit !== undefined ? Boolean(permissions.canEdit) : true
  const canDelete = permissions.canDelete !== undefined ? Boolean(permissions.canDelete) : true

  const isSelected = Boolean(selectedItem)
  const isSelectedView = selectedItem?.View !== false

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
            title="Truy vấn danh mục menu (Ctrl+Q)"
          >
            <Search size={13} className="text-blue-500" />
            {t('TÌM KIẾM')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddRoot"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddRootModal}
            className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800"
            title="Thêm mới Root Menu (Module Cấp 1 trên Sidebar)"
          >
            <LayoutGrid size={13} className="text-indigo-500" />
            {t('THÊM ROOT MODULE')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddMenu"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddMenuModal}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Đăng ký Submenu hoặc Menu chức năng mới"
          >
            <Plus size={13} className="text-emerald-500" />
            {t('ĐĂNG KÝ MENU / SUBMENU')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="Edit"
            variant="ghost"
            size="sm"
            onClick={handleOpenEditModal}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            title="Chỉnh sửa menu đang chọn"
          >
            <Edit3 size={13} className="text-blue-500" />
            {t('CHỈNH SỬA')}
          </Button>
        )}

        {canEdit && (
          <Button
            key="ToggleView"
            variant="ghost"
            size="sm"
            onClick={handleToggleView}
            disabled={!isSelected}
            className={`uppercase text-[11px] font-semibold ${
              isSelectedView
                ? 'text-amber-700 hover:text-amber-800'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
            title={
              isSelectedView ? 'Ẩn menu khỏi thanh Sidebar' : 'Bật hiển thị menu trên thanh Sidebar'
            }
          >
            {isSelectedView ? (
              <>
                <EyeOff size={13} className="text-amber-600" />
                {t('ẨN MENU')}
              </>
            ) : (
              <>
                <Eye size={13} className="text-emerald-600" />
                {t('HIỂN THỊ MENU')}
              </>
            )}
          </Button>
        )}

        {canDelete && (
          <Button
            key="Delete"
            variant="ghost"
            size="sm"
            onClick={handleDeleteMenu}
            disabled={!isSelected}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa menu đang chọn"
          >
            <Trash2 size={13} className="text-rose-500" />
            {t('XÓA MENU')}
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
