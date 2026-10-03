import { Button } from '../../../../../../components/ui/button'
import { Search, Save, Trash2, FileSpreadsheet, Printer, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ProductionStatisticsActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
  handleExportExcel,
  handlePrint,
  handleOpenPublicLink,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto max-w-full">
      {canSearch && (
        <Button
          key="Search"
          size="sm"
          variant="ghost"
          onClick={handleSearchData}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Tìm kiếm (Ctrl+Q)"
        >
          <Search size={13} className="text-blue-500" />
          {t('TÌM KIẾM')}
        </Button>
      )}

      {canSave && (
        <Button
          key="Save"
          size="sm"
          variant="ghost"
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
          size="sm"
          variant="ghost"
          onClick={handleDeleteDataSheet}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
          title="Xóa dòng (Ctrl+Shift+D)"
        >
          <Trash2 size={13} className="text-rose-500" />
          {t('XÓA SHEET')}
        </Button>
      )}

      {handleExportExcel && (
        <Button
          key="ExportExcel"
          size="sm"
          variant="ghost"
          onClick={handleExportExcel}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Xuất file Excel"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          {t('XUẤT EXCEL')}
        </Button>
      )}

      {handlePrint && (
        <Button
          key="Print"
          size="sm"
          variant="ghost"
          onClick={handlePrint}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="In báo cáo thống kê"
        >
          <Printer size={13} className="text-indigo-600" />
          {t('IN BÁO CÁO')}
        </Button>
      )}

      {handleOpenPublicLink && (
        <Button
          key="PublicLink"
          size="sm"
          variant="ghost"
          onClick={handleOpenPublicLink}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Xem đường dẫn báo cáo công khai (Public)"
        >
          <Share2 size={13} className="text-sky-600" />
          {t('LINK PUBLIC')}
        </Button>
      )}
    </div>
  )
}
