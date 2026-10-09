/* eslint-disable react/prop-types */
import { memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import {
  Upload,
  Play,
  Save,
  Trash2,
  RotateCw,
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  SquareArrowOutUpRight,
  ArrowLeft
} from 'lucide-react'

const CalcProductionActions = memo(function CalcProductionActions({
  isDetailView = false,
  onBack,
  activeTabDef,
  activeFileData,
  isParsing = false,
  isCalculating = false,
  isRegistering = false,
  fileStatusSummary = {},
  masterRecord = null,
  onUploadFile,
  onOpenCustomMapping,
  onDeleteTabFile,
  onClearAll,
  onRunCalculation,
  onRegisterMaster,
  onExportExcel,
  onExportAll,
  onRefresh,
  onOpenSearch,
  onOpenInNewWindow
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const customMappingInputRef = useRef(null)

  const uploadedCount = Object.values(fileStatusSummary || {}).filter(
    (s) => s?.isUploaded || (s?.rowCount || 0) > 0
  ).length

  const hasActiveFileData = Boolean(
    activeFileData && (activeFileData.rowCount > 0 || (activeFileData.data && activeFileData.data.length > 0))
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

      {/* DETAIL VIEW: Nút Quay Lại */}
      {isDetailView && typeof onBack === 'function' && (
        <Button
          key="Back"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
          title="Quay lại danh sách truy vấn"
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

      {/* REGISTRATION VIEW: 4. Đăng ký báo cáo */}
      {!isDetailView && (
        <Button
          key="Register"
          variant="ghost"
          size="sm"
          onClick={onRegisterMaster}
          disabled={isRegistering || isCalculating || uploadedCount === 0}
          className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
          title="Đăng ký và lưu thông tin báo cáo master vào CSDL"
        >
          <Save size={13} className="text-indigo-600" />
          <span>{t('ĐĂNG KÝ BÁO CÁO')}</span>
        </Button>
      )}

      {/* CHUNG: 4.1. Xuất Excel */}
      {typeof onExportExcel === 'function' && (
        <Button
          key="ExportExcel"
          variant="ghost"
          size="sm"
          onClick={onExportExcel}
          disabled={!hasActiveFileData}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 h-7 px-2"
          title="Xuất bảng dữ liệu hiện tại ra tệp Excel chuẩn"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          <span>{t('XUẤT EXCEL')}</span>
        </Button>
      )}

      {/* DETAIL VIEW: Xuất toàn bộ bảng */}
      {isDetailView && typeof onExportAll === 'function' && (
        <Button
          key="ExportAll"
          variant="ghost"
          size="sm"
          onClick={onExportAll}
          className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 h-7 px-2"
          title="Xuất toàn bộ các bảng ra 1 file Excel nhiều sheet"
        >
          <FileSpreadsheet size={13} className="text-indigo-600" />
          <span>{t('XUẤT TOÀN BỘ BẢNG')}</span>
        </Button>
      )}

      {/* REGISTRATION VIEW: 5. Cửa sổ mới */}
      {!isDetailView && typeof onOpenInNewWindow === 'function' && (
        <Button
          key="NewWindow"
          variant="ghost"
          size="sm"
          onClick={onOpenInNewWindow}
          className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800 h-7 px-2"
          title="Mở toàn bộ các bảng trong cửa sổ mới độc lập"
        >
          <SquareArrowOutUpRight size={13} className="text-blue-600" />
          <span>{t('CỬA SỔ MỚI')}</span>
        </Button>
      )}

      {/* CHUNG: 6. Làm mới */}
      <Button
        key="Refresh"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
        title="Nạp lại dữ liệu từ CSDL"
      >
        <RotateCw size={13} className="text-slate-500" />
        <span>{t('LÀM MỚI')}</span>
      </Button>

      {/* CHUNG: 7. Tìm kiếm */}
      <Button
        key="Search"
        variant="ghost"
        size="sm"
        onClick={onOpenSearch}
        className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
        title="Tìm kiếm trên bảng (Ctrl+F)"
      >
        <Search size={13} className="text-blue-500" />
        <span>{t('TÌM KIẾM')}</span>
      </Button>

      {/* REGISTRATION VIEW: 8. Xóa tab hiện tại */}
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

      {/* REGISTRATION VIEW: 9. Xóa tất cả */}
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
