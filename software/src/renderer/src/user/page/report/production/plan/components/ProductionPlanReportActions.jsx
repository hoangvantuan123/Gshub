import { useTranslation } from 'react-i18next'
import {
  Search,
  Save,
  Trash2,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Plus,
  Share2
} from 'lucide-react'
import { message, Modal } from 'antd'

export default function ProductionPlanReportActions({
  handleSearchData,
  handleSaveData,
  handleDeleteData,
  handleRowAppend,
  handleExportExcel,
  onResetQuery,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  plantKey = 'hanoi_gs1',
  kpiStats = {}
}) {
  const { t } = useTranslation()

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/#/public/report/plan?plant=${plantKey}`
    navigator.clipboard.writeText(url)
    message.success(t('Đã sao chép liên kết báo cáo KHSX công khai'))
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border-b border-slate-200">
      {/* Nút hành động */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={handleSearchData}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition"
        >
          <Search size={14} />
          <span>{t('Truy vấn')}</span>
        </button>

        {canCreate && (
          <button
            onClick={() => handleRowAppend?.(1)}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Plus size={14} />
            <span>{t('Thêm dòng')}</span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={handleSaveData}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Save size={14} />
            <span>{t('Lưu thay đổi')}</span>
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleDeleteData}
            className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Trash2 size={14} />
            <span>{t('Xóa dòng')}</span>
          </button>
        )}

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-sm transition"
        >
          <FileSpreadsheet size={14} />
          <span>{t('Xuất Excel')}</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm transition"
        >
          <Printer size={14} />
          <span>{t('In báo cáo')}</span>
        </button>

        <button
          onClick={handleCopyPublicLink}
          className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-sm transition"
          title="Chia sẻ link báo cáo xem bên ngoài không cần đăng nhập"
        >
          <Share2 size={14} />
          <span>{t('Link Public')}</span>
        </button>
      </div>

      {/* KPI Tóm tắt nhanh */}
      <div className="flex items-center gap-3 text-xs bg-white px-3 py-1 rounded border border-slate-200">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">{t('Tổng lệnh')}:</span>
          <span className="font-bold text-blue-600">{kpiStats.totalRecords || 0}</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <span className="text-slate-500">{t('Tổng SL cần sản xuất')}:</span>
          <span className="font-bold text-indigo-600">{(kpiStats.totalTargetProd || 0).toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <span className="text-slate-500">{t('Đã thống kê đạt')}:</span>
          <span className="font-bold text-emerald-600">{(kpiStats.totalStatPass || 0).toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <span className="text-slate-500">{t('Tiến độ trung bình')}:</span>
          <span className="font-bold text-amber-600">{kpiStats.avgProgress || '0.00'}%</span>
        </div>
      </div>
    </div>
  )
}
