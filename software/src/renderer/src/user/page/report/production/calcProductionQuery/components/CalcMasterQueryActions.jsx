import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import {
  Search,
  Calculator,
  SquareArrowOutUpRight,
  Trash2,
  FileSpreadsheet
} from 'lucide-react'

const CalcMasterQueryActions = memo(function CalcMasterQueryActions({
  onQuery,
  onOpenCalcProduction,
  onViewDetail,
  onDeleteSelected,
  onExportExcel,
  isLoading,
  isSyncing,
  hasSelection,
  totalRows
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none">
      {/* 1. Truy vấn (F8) - Lấy trực tiếp từ Server DB DataHub + CSDL */}
      <Button
        key="Query"
        variant="ghost"
        size="sm"
        onClick={onQuery}
        disabled={isLoading || isSyncing}
        className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2 shrink-0"
        title="Truy vấn danh sách từ Server DataHub & Local DB (F8)"
      >
        <Search size={13} className="text-blue-500" />
        <span>{t('TRUY VẤN (F8)')}</span>
      </Button>

      {/* 2. Tính KHSX & TKSX */}
      <Button
        key="OpenCalc"
        variant="ghost"
        size="sm"
        onClick={onOpenCalcProduction}
        className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
        title="Mở màn hình tính toán KHSX & TKSX mới"
      >
        <Calculator size={13} className="text-indigo-600" />
        <span>{t('TÍNH KHSX & TKSX')}</span>
      </Button>

      {/* 3. Xem chi tiết (Chỉ sáng khi chọn dòng) */}
      <Button
        key="ViewDetail"
        variant="ghost"
        size="sm"
        onClick={onViewDetail}
        disabled={!hasSelection}
        className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800 h-7 px-2 shrink-0"
        title="Mở chi tiết 4 bảng dữ liệu cho phiếu đang chọn"
      >
        <SquareArrowOutUpRight size={13} className="text-blue-600" />
        <span>{t('XEM CHI TIẾT')}</span>
      </Button>

      {/* 4. Xuất Excel */}
      <Button
        key="ExportExcel"
        variant="ghost"
        size="sm"
        onClick={onExportExcel}
        disabled={totalRows === 0}
        className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 h-7 px-2 shrink-0"
        title="Xuất danh sách ra file Excel"
      >
        <FileSpreadsheet size={13} className="text-emerald-600" />
        <span>{t('XUẤT EXCEL')}</span>
      </Button>

      {/* 5. Xóa phiếu (Hiện khi chọn dòng) */}
      {hasSelection && (
        <Button
          key="DeleteSelected"
          variant="ghost"
          size="sm"
          onClick={onDeleteSelected}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2 shrink-0"
          title="Xóa phiếu đăng ký đang chọn (cả trên Server DataHub & Local DB)"
        >
          <Trash2 size={13} className="text-rose-500" />
          <span>{t('XÓA')}</span>
        </Button>
      )}
    </div>
  )
})

export default CalcMasterQueryActions
