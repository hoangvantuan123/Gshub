/* eslint-disable react/prop-types */
import { useTranslation } from 'react-i18next'
import {
  Search,
  ExternalLink,
  Trash2,
  RotateCcw,
  Download
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export default function CalcMasterQueryActions({
  onQuery,
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
    <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuery}
          disabled={isLoading}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          title="Truy vấn danh sách phiếu đăng ký (F8)"
        >
          <Search size={13} className="text-emerald-500" />
          <span>{isLoading ? t('ĐANG TRUY VẤN...') : t('TRUY VẤN (F8)')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetail}
          disabled={!hasSelection}
          className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
          title="Mở chi tiết 4 bảng dữ liệu cho phiếu đang chọn"
        >
          <ExternalLink size={13} className="text-blue-600" />
          <span>{t('XEM CHI TIẾT 4 BẢNG')}</span>
        </Button>

        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa phiếu đăng ký đang chọn"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>{t('XÓA PHIẾU')}</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onExportExcel}
          disabled={totalRows === 0}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          title="Xuất danh sách ra file Excel"
        >
          <Download size={13} className="text-emerald-600" />
          <span>{t('XUẤT EXCEL')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Đặt lại bộ lọc tìm kiếm"
        >
          <RotateCcw size={13} className="text-slate-500" />
          <span>{t('LÀM MỚI BỘ LỌC')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSearch}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Tìm kiếm trên bảng (Ctrl+F)"
        >
          <Search size={13} className="text-blue-500" />
          <span>{t('TÌM KIẾM BẢNG')}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 uppercase">
          <span>KẾT QUẢ:</span>
          <b className="text-indigo-700">{(totalRows || 0).toLocaleString('vi-VN')} PHIẾU MASTER</b>
        </div>
      </div>
    </div>
  )
}
