import { Button } from '../../../../../components/ui/button'
import { Search, Plus, SquareArrowOutUpRight, Save, Trash2, FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PlanRegistrationActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
  handleOpenAddModal,
  handleOpenDetailWindow,
  handleExportExcel,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canCreate = Boolean(permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
      {/* Nút tác vụ chuẩn shadcn/ui */}
      <div className="flex items-center gap-1.5">
        {canSearch && (
          <Button
            key="Search"
            variant="ghost"
            size="sm"
            onClick={handleSearchData}
            className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            title="Tìm kiếm đợt đăng ký (Ctrl+Q)"
          >
            <Search size={13} className="text-blue-500" />
            {t('TÌM KIẾM')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddPlan"
            variant="ghost"
            size="sm"
            onClick={handleOpenAddModal}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Mở form nạp file Excel & Đăng ký báo cáo mới"
          >
            <Plus size={13} className="text-emerald-500" />
            {t('ĐĂNG KÝ BÁO CÁO (NẠP MỚI)')}
          </Button>
        )}

        {handleOpenDetailWindow && (
          <Button
            key="ViewDetail"
            variant="ghost"
            size="sm"
            onClick={handleOpenDetailWindow}
            className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            title="Mở xem chi tiết đợt đăng ký trong cửa sổ mới (Ctrl+Shift+N)"
          >
            <SquareArrowOutUpRight size={13} className="text-blue-600" />
            {t('XEM CHI TIẾT')}
          </Button>
        )}

        {canSave && (
          <Button
            key="Save"
            variant="ghost"
            size="sm"
            onClick={handleSaveData}
            className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            title="Lưu dữ liệu (Ctrl+S)"
          >
            <Save size={13} className="text-emerald-600" />
            {t('LƯU')}
          </Button>
        )}

        {handleDeleteDataSheet && canDelete && (
          <Button
            key="Delete"
            variant="ghost"
            size="sm"
            onClick={handleDeleteDataSheet}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa đợt đăng ký đã chọn (Ctrl+Shift+D)"
          >
            <Trash2 size={13} className="text-rose-500" />
            {t('XÓA ĐĂNG KÝ')}
          </Button>
        )}

        {handleExportExcel && (
          <Button
            key="ExportExcel"
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            title="Xuất file Excel"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            {t('XUẤT EXCEL')}
          </Button>
        )}
      </div>
    </div>
  )
}
