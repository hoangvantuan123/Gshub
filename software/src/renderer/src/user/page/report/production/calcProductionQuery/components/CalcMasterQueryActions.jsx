/* eslint-disable react/prop-types */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import {
  Search,
  Calculator,
  SquareArrowOutUpRight,
  Trash2,
  FileSpreadsheet,
  RotateCw
} from 'lucide-react'

const CalcMasterQueryActions = memo(function CalcMasterQueryActions({
  onQuery,
  onOpenCalcProduction,
  onViewDetail,
  onDeleteSelected,
  onResetFilters,
  onExportExcel,
  onOpenSearch,
  isLoading,
  hasSelection,
  totalRows
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none">
      {/* 1. Truy vấn */}
      <Button
        key="Query"
        variant="ghost"
        size="sm"
        onClick={onQuery}
        disabled={isLoading}
        className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2 shrink-0"
        title="Truy vấn danh sách phiếu đăng ký (F8)"
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
        className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2"
        title="Mở màn hình tính toán KHSX & TKSX trong cửa sổ / tab mới"
      >
        <Calculator size={13} className="text-indigo-600" />
        <span>{t('TÍNH KHSX & TKSX')}</span>
      </Button>

      {/* 3. Xem chi tiết 4 bảng */}
      <Button
        key="ViewDetail"
        variant="ghost"
        size="sm"
        onClick={onViewDetail}
        disabled={!hasSelection}
        className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800 h-7 px-2"
        title="Mở chi tiết 4 bảng dữ liệu cho phiếu đang chọn"
      >
        <SquareArrowOutUpRight size={13} className="text-blue-600" />
        <span>{t('XEM CHI TIẾT 4 BẢNG')}</span>
      </Button>

      {/* 4. Xóa phiếu */}
      {hasSelection && (
        <Button
          key="DeleteSelected"
          variant="ghost"
          size="sm"
          onClick={onDeleteSelected}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2"
          title="Xóa phiếu đăng ký đang chọn"
        >
          <Trash2 size={13} className="text-rose-500" />
          <span>{t('XÓA PHIẾU')}</span>
        </Button>
      )}

      {/* 5. Xuất Excel */}
      <Button
        key="Export"
        variant="ghost"
        size="sm"
        onClick={onExportExcel}
        disabled={totalRows === 0}
        className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 h-7 px-2"
        title="Xuất danh sách ra file Excel"
      >
        <FileSpreadsheet size={13} className="text-emerald-600" />
        <span>{t('XUẤT EXCEL')}</span>
      </Button>

      {/* 6. Làm mới bộ lọc */}
      <Button
        key="ResetFilters"
        variant="ghost"
        size="sm"
        onClick={onResetFilters}
        className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
        title="Đặt lại bộ lọc tìm kiếm"
      >
        <RotateCw size={13} className="text-slate-500" />
        <span>{t('LÀM MỚI BỘ LỌC')}</span>
      </Button>

      {/* 7. Tìm kiếm bảng */}
      {typeof onOpenSearch === 'function' && (
        <Button
          key="SearchTable"
          variant="ghost"
          size="sm"
          onClick={onOpenSearch}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
          title="Tìm kiếm trên bảng (Ctrl+F)"
        >
          <Search size={13} className="text-blue-500" />
          <span>{t('TÌM KIẾM')}</span>
        </Button>
      )}
    </div>
  )
})

export default CalcMasterQueryActions
