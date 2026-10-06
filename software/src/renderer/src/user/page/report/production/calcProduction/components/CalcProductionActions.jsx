/* eslint-disable react/prop-types */
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload,
  Play,
  Trash2,
  RotateCcw,
  Search,
  Save,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { StorageStatusBadge } from './StorageStatusBadge'

export default function CalcProductionActions({
  activeTabDef,
  activeFileData,
  isParsing,
  isCalculating,
  isRegistering,
  storageMode,
  fileStatusSummary,
  onUploadFile,
  onDeleteTabFile,
  onClearAll,
  onRunCalculation,
  onRegisterMaster,
  onRefresh,
  onOpenSearch,
  onOpenInNewWindow
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  const uploadedCount = Object.values(fileStatusSummary || {}).filter((s) => s.isUploaded).length
  const hasActiveFileData = Boolean(activeFileData && activeFileData.rowCount > 0)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadFile(activeTabDef.id, file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
      {/* Ẩn input file */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Cụm nút tác vụ chuẩn GsHub phong cách ghost uppercase */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          title="Chọn file Excel/CSV để nạp dữ liệu vào tab hiện tại"
        >
          <Upload size={13} className="text-emerald-500" />
          <span>{hasActiveFileData ? t('TẢI LẠI FILE') : t('NẠP FILE EXCEL')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRegisterMaster}
          disabled={isRegistering || uploadedCount === 0}
          className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800"
          title="Đăng ký và lưu thông tin báo cáo master vào CSDL"
        >
          <Save size={13} className="text-indigo-600" />
          <span>{isRegistering ? t('ĐANG ĐĂNG KÝ...') : t('ĐĂNG KÝ BÁO CÁO')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRunCalculation}
          disabled={isCalculating || uploadedCount === 0}
          className="uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800"
          title="Chạy tính toán Kế hoạch & Thống kê sản xuất từ các file đã nạp"
        >
          <Play size={13} className="text-blue-600" />
          <span>{isCalculating ? t('ĐANG TÍNH...') : t('TÍNH KHSX & TKSX')}</span>
        </Button>

        {typeof onOpenInNewWindow === 'function' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenInNewWindow}
            className="uppercase text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            title="Mở toàn bộ 4 bảng trong cửa sổ mới độc lập"
          >
            <ExternalLink size={13} className="text-indigo-500" />
            <span>{t('CỬA SỔ MỚI')}</span>
          </Button>
        )}

        {hasActiveFileData && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteTabFile(activeTabDef.id)}
            className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            title="Xóa dữ liệu file trong tab hiện tại khỏi CSDL"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>{t('XÓA TAB')}</span>
          </Button>
        )}

        {uploadedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            title="Xóa toàn bộ file khỏi phiên làm việc"
          >
            <Trash2 size={13} className="text-slate-500" />
            <span>{t('XÓA TẤT CẢ')}</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Nạp lại dữ liệu từ CSDL SQLite/IndexedDB"
        >
          <RotateCcw size={13} className="text-slate-500" />
          <span>{t('LÀM MỚI')}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSearch}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          title="Tìm kiếm trên bảng (Ctrl+F)"
        >
          <Search size={13} className="text-blue-500" />
          <span>{t('TÌM KIẾM')}</span>
        </Button>
      </div>

      {/* Cụm thông tin & trạng thái bên phải */}
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-slate-500 font-semibold hidden md:flex items-center gap-1 uppercase">
          <span>TIẾN ĐỘ:</span>
          <b className={uploadedCount === 4 ? 'text-emerald-700' : 'text-amber-600'}>
            {uploadedCount}/4 FILE
          </b>
        </div>
        <StorageStatusBadge mode={storageMode} />
      </div>
    </div>
  )
}
