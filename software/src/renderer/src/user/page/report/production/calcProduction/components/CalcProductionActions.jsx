/* eslint-disable react/prop-types */
import { memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import {
  Upload,
  Play,
  Save,
  Trash2,
  SlidersHorizontal,
  ArrowLeft,
  MinusCircle,
  Share2,
  FileArchive,
  CheckCircle2
} from 'lucide-react'

const CalcProductionActions = memo(function CalcProductionActions({
  isDetailView = false,
  onBack,
  activeTabDef,
  activeFileData,
  isParsing = false,
  isCalculating = false,
  isRegistering = false,
  isPublishing = false,
  isExporting = false,
  fileStatusSummary = {},
  masterRecord = null,
  masterInfo = null,
  selectedRowsCount = 0,
  onUploadFile,
  onOpenCustomMapping,
  onDeleteSelectedRows,
  onDeleteTabFile,
  onClearAll,
  onRunCalculation,
  onRegisterMaster,
  onPublishReport,
  onExportBundle,
  onOpenSearch
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const customMappingInputRef = useRef(null)

  const currentMaster = masterInfo || masterRecord || {}
  const isPublished = currentMaster.status === 'PUBLISHED' || currentMaster.isPublished

  const uploadedCount = Object.values(fileStatusSummary || {}).filter(
    (s) => s?.isUploaded || (s?.rowCount || 0) > 0
  ).length

  const hasActiveFileData = Boolean(
    activeFileData &&
      (activeFileData.rowCount > 0 || (activeFileData.data && activeFileData.data.length > 0))
  )

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && typeof onUploadFile === 'function') {
      onUploadFile(activeTabDef?.id, file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCustomMappingFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && typeof onOpenCustomMapping === 'function') {
      onOpenCustomMapping(activeTabDef?.id, file)
      if (customMappingInputRef.current) {
        customMappingInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none">
      {/* Ẩn input file thường */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Ẩn input file tùy chỉnh ánh xạ */}
      <input
        ref={customMappingInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleCustomMappingFileChange}
      />

      {/* DETAIL VIEW: Nút Quay Lại / Thoát */}
      {isDetailView && typeof onBack === 'function' && (
        <Button
          key="Back"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
          title="Quay lại / Thoát khỏi màn hình"
        >
          <ArrowLeft size={13} className="text-slate-500" />
          <span>{t('QUAY LẠI')}</span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 1. Nạp file Excel */}
      {!isDetailView && (
        <Button
          key="Upload"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing || isCalculating}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 h-7 px-2"
          title="Chọn file Excel/CSV để nạp dữ liệu vào tab hiện tại"
        >
          <Upload size={13} className="text-emerald-600" />
          <span>{t('NẠP FILE EXCEL')}</span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 2. Ánh xạ cột */}
      {!isDetailView && (
        <Button
          key="Mapping"
          variant="ghost"
          size="sm"
          onClick={() => customMappingInputRef.current?.click()}
          disabled={isParsing || isCalculating}
          className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2"
          title="Tùy chỉnh chọn dòng tiêu đề và cấu hình ánh xạ cột cho file Excel"
        >
          <SlidersHorizontal size={13} className="text-indigo-600" />
          <span>{t('ÁNH XẠ CỘT')}</span>
        </Button>
      )}

      {/* CHUNG: 3. Tính KHSX & TKSX */}
      <Button
        key="Calculate"
        variant="ghost"
        size="sm"
        onClick={onRunCalculation}
        disabled={isCalculating || isParsing || uploadedCount === 0}
        className="uppercase text-[11px] font-bold text-blue-700 hover:text-blue-800 h-7 px-2 shrink-0"
        title="Chạy tính toán Kế hoạch & Thống kê sản xuất từ các file đã nạp"
      >
        <Play size={13} className="text-blue-600 fill-blue-600/30" />
        <span>{t('TÍNH KHSX & TKSX')}</span>
      </Button>

      {/* REGISTRATION VIEW: 4. Đăng ký báo cáo (Lưu bản nháp/nội bộ) */}
      {!isDetailView && (
        <Button
          key="Register"
          variant="ghost"
          size="sm"
          onClick={onRegisterMaster}
          disabled={isRegistering || isCalculating || uploadedCount === 0}
          className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
          title="Lưu bản đăng ký báo cáo nội bộ vào CSDL"
        >
          <Save size={13} className="text-indigo-600" />
          <span>{t('LƯU ĐĂNG KÝ')}</span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 5. Công bố báo cáo (Publish Version) */}
      {!isDetailView && typeof onPublishReport === 'function' && (
        <Button
          key="Publish"
          variant="ghost"
          size="sm"
          onClick={onPublishReport}
          disabled={isPublishing || isCalculating || uploadedCount === 0}
          className={`uppercase text-[11px] font-bold h-7 px-2 shrink-0 ${
            isPublished
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/60'
              : 'text-violet-700 hover:text-violet-800'
          }`}
          title="Công bố phiên bản báo cáo chính thức (v1.0) cho người dùng khác"
        >
          {isPublished ? (
            <CheckCircle2 size={13} className="text-emerald-600" />
          ) : (
            <Share2 size={13} className="text-violet-600" />
          )}
          <span>
            {isPublished
              ? `${t('ĐÃ CÔNG BỐ')} (v${currentMaster.version || '1.0'})`
              : t('CÔNG BỐ BÁO CÁO')}
          </span>
        </Button>
      )}

      {/* CHUNG: 6. Xuất gói siêu nén .gsprod (<1MB thay vì 50MB) */}
      {typeof onExportBundle === 'function' && (
        <Button
          key="ExportBundle"
          variant="ghost"
          size="sm"
          onClick={onExportBundle}
          disabled={isExporting || (uploadedCount === 0 && !hasActiveFileData)}
          className="uppercase text-[11px] font-bold text-amber-700 hover:text-amber-800 h-7 px-2 shrink-0"
          title="Nén 6 bảng thành gói siêu nén .gsprod (<1MB) để chia sẻ/đồng bộ máy khác"
        >
          <FileArchive size={13} className="text-amber-600" />
          <span>{t('XUẤT GÓI .GSPROD')}</span>
        </Button>
      )}



      {/* CHUNG: 6. Xóa dòng đã chọn trong Tab hiện tại */}
      {hasActiveFileData && typeof onDeleteSelectedRows === 'function' && (
        <Button
          key="DeleteRow"
          variant="ghost"
          size="sm"
          onClick={onDeleteSelectedRows}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2"
          title="Xóa các dòng đang bôi đen / chọn khỏi tab hiện tại"
        >
          <MinusCircle size={13} className="text-rose-500" />
          <span>
            {selectedRowsCount > 0
              ? `${t('XÓA')} ${selectedRowsCount} ${t('DÒNG')}`
              : t('XÓA DÒNG')}
          </span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 7. Xóa tab hiện tại */}
      {!isDetailView && hasActiveFileData && (
        <Button
          key="DeleteTab"
          variant="ghost"
          size="sm"
          onClick={() => onDeleteTabFile && onDeleteTabFile(activeTabDef?.id)}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2"
          title="Xóa dữ liệu file trong tab hiện tại khỏi hệ thống"
        >
          <Trash2 size={13} className="text-rose-500" />
          <span>{t('XÓA TAB')}</span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 8. Xóa tất cả */}
      {!isDetailView && uploadedCount > 0 && (
        <Button
          key="ClearAll"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="uppercase text-[11px] font-semibold text-slate-600 hover:text-slate-900 h-7 px-2"
          title="Xóa toàn bộ file khỏi phiên làm việc"
        >
          <Trash2 size={13} className="text-slate-500" />
          <span>{t('XÓA TẤT CẢ')}</span>
        </Button>
      )}
    </div>
  )
})

export default CalcProductionActions
