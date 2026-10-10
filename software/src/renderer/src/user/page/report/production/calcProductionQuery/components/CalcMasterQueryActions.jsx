import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import { Search, Calculator, SquareArrowOutUpRight, Trash2, FileSpreadsheet } from 'lucide-react'

const CalcMasterQueryActions = memo(function CalcMasterQueryActions({
  onQuery,
  onOpenCalcProduction,
  onViewDetail,
  onExportDataKhsx,
  onDeleteSelected,
  isLoading,
  isSyncing,
  hasSelection
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 py-0 select-none">
      {/* 1. Truy vấn - Lấy trực tiếp từ Server DB DataHub + CSDL */}
      <Button
        key="Query"
        variant="ghost"
        size="sm"
        onClick={onQuery}
        disabled={isLoading || isSyncing}
        className="uppercase text-[10.5px] font-semibold text-slate-700 hover:text-slate-900 h-6 px-1.5 shrink-0"
        title="Truy vấn danh sách từ Server DataHub & Local DB"
      >
        <Search size={12} className="text-blue-500" />
        <span>{t('TRUY VẤN')}</span>
      </Button>

      {/* 2. Tính KHSX & TKSX */}
      <Button
        key="OpenCalc"
        variant="ghost"
        size="sm"
        onClick={onOpenCalcProduction}
        className="uppercase text-[10.5px] font-semibold text-indigo-700 hover:text-indigo-800 h-6 px-1.5 shrink-0"
        title="Mở màn hình tính toán KHSX & TKSX mới"
      >
        <Calculator size={12} className="text-indigo-600" />
        <span>{t('TÍNH KHSX & TKSX')}</span>
      </Button>

      {/* 3. Xem chi tiết (Chỉ sáng khi chọn dòng) */}
      <Button
        key="ViewDetail"
        variant="ghost"
        size="sm"
        onClick={onViewDetail}
        disabled={!hasSelection}
        className="uppercase text-[10.5px] font-semibold text-blue-700 hover:text-blue-800 h-6 px-1.5 shrink-0"
        title="Mở chi tiết 4 bảng dữ liệu cho phiếu đang chọn"
      >
        <SquareArrowOutUpRight size={12} className="text-blue-600" />
        <span>{t('XEM CHI TIẾT')}</span>
      </Button>

      {/* 4. Xuất Data KHSX (Xuất trọn bộ 6 bảng của phiếu đang chọn ra 1 file Excel siêu nhẹ) */}
      {typeof onExportDataKhsx === 'function' && (
        <Button
          key="ExportDataKhsx"
          variant="ghost"
          size="sm"
          onClick={onExportDataKhsx}
          disabled={!hasSelection}
          className="uppercase text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 h-6 px-1.5 shrink-0"
          title="Xuất trọn vẹn toàn bộ dữ liệu 6 bảng KHSX & TKSX ra 1 file Excel đa Sheet"
        >
          <FileSpreadsheet size={12} className="text-emerald-600" />
          <span>{t('XUẤT DATA KHSX')}</span>
        </Button>
      )}

      {/* 5. Xóa phiếu (Hiện khi chọn dòng) */}
      {hasSelection && (
        <Button
          key="DeleteSelected"
          variant="ghost"
          size="sm"
          onClick={onDeleteSelected}
          className="uppercase text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 h-6 px-1.5 shrink-0"
          title="Xóa phiếu đăng ký đang chọn (cả trên Server DataHub & Local DB)"
        >
          <Trash2 size={12} className="text-rose-500" />
          <span>{t('XÓA')}</span>
        </Button>
      )}
    </div>
  )
})

export default CalcMasterQueryActions
