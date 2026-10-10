/* eslint-disable react/prop-types */
import { memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import {
  Upload,
  Play,
  Save,
  Trash2,
  Share2,
  FileArchive,
  CheckCircle2,
  FileSpreadsheet,
  Send
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
  isSyncingVersion = false,
  isExporting = false,
  fileStatusSummary = {},
  masterRecord = null,
  masterInfo = null,
  selectedRowsCount = 0,
  onUploadFile,
  onDeleteSelectedRows,
  onRunCalculation,
  onRegisterMaster,
  onPublishReport,
  onPushRegistration,
  isPushingRegistration = false,
  onExportBundle,
  onSyncFromServer,
  onUnlockForEdit,
  onExportAllTabsExcel,
  onExportTabExcel
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  const currentMaster = masterInfo || masterRecord || {}
  const isPublished = currentMaster.status === 'PUBLISHED' || currentMaster.isPublished

  const uploadedCount = Object.values(fileStatusSummary || {}).filter(
    (s) => s?.isUploaded || (s?.rowCount || 0) > 0
  ).length

  const hasActiveFileData = Boolean(
    activeFileData &&
    (activeFileData.rowCount > 0 || (activeFileData.data && activeFileData.data.length > 0))
  )

  const hasCalcResults = Boolean(
    fileStatusSummary?.result_tksx?.isUploaded ||
      fileStatusSummary?.result_khsx?.isUploaded ||
      (fileStatusSummary?.result_tksx?.rowCount || 0) > 0 ||
      (fileStatusSummary?.result_khsx?.rowCount || 0) > 0
  )

  const hasAnyData = uploadedCount > 0 || hasActiveFileData || hasCalcResults

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && typeof onUploadFile === 'function') {
      onUploadFile(activeTabDef?.id, file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none flex-wrap">
      {/* Input file ẩn */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 1. LƯU ĐĂNG KÝ (Chỉ khi chưa công bố hoặc đang ở chế độ chỉnh sửa) */}
      {!isPublished && typeof onRegisterMaster === 'function' && (
        <Button
          key="Register"
          variant="ghost"
          size="sm"
          onClick={onRegisterMaster}
          disabled={isRegistering || isCalculating || !hasAnyData}
          className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
          title="Lưu thông tin đăng ký và dữ liệu báo cáo vào CSDL"
        >
          <Save size={13} className="text-indigo-600" />
          <span>{t('LƯU ĐĂNG KÝ')}</span>
        </Button>
      )}

      {/* 2. NẠP FILE EXCEL (Khóa khi bản đã công bố để bảo vệ dữ liệu chuẩn) */}
      {!isPublished && typeof onUploadFile === 'function' && (
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

      {/* 3. TÍNH KHSX & TKSX (Khóa lại sau khi đã công bố) */}
      <Button
        key="Calculate"
        variant="ghost"
        size="sm"
        onClick={isPublished ? undefined : onRunCalculation}
        disabled={Boolean(isPublished) || isCalculating || isParsing || (uploadedCount === 0 && !hasActiveFileData)}
        className={`uppercase text-[11px] font-bold h-7 px-2 shrink-0 ${
          isPublished
            ? 'text-slate-400 cursor-not-allowed opacity-60'
            : 'text-blue-700 hover:text-blue-800'
        }`}
        title={
          isPublished
            ? t('Báo cáo đã công bố chính thức. Bấm [CHỈNH SỬA BẢN MỚI] để mở khóa tính toán lại.')
            : t('Chạy tính toán Kế hoạch & Thống kê sản xuất từ các file đã nạp')
        }
      >
        <Play size={13} className={isPublished ? 'text-slate-400' : 'text-blue-600 fill-blue-600/30'} />
        <span>{t('TÍNH KHSX & TKSX')}</span>
      </Button>

      {/* 3.1. ĐĂNG KÝ BÁO CÁO (Chỉ áp dụng cho báo cáo ĐÃ CÔNG BỐ PHÁT HÀNH) */}
      {isPublished && typeof onPushRegistration === 'function' && (
        <Button
          key="PushRegistration"
          variant="ghost"
          size="sm"
          onClick={onPushRegistration}
          disabled={isPushingRegistration || isCalculating || isParsing}
          className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0 bg-indigo-50/70 border border-indigo-200 shadow-sm"
          title="Nạp và Đăng ký 2 báo cáo KHSX và TKSX đã công bố lên hệ thống Đăng ký báo cáo (/erp/u/report/registration)"
        >
          <Send size={13} className="text-indigo-600" />
          <span>{t('ĐĂNG KÝ BÁO CÁO')}</span>
        </Button>
      )}

      {/* 4. CÔNG BỐ BÁO CÁO / ĐÃ CÔNG BỐ BADGE */}
      {typeof onPublishReport === 'function' && (
        <Button
          key="Publish"
          variant="ghost"
          size="sm"
          onClick={isPublished ? undefined : onPublishReport}
          disabled={Boolean(isPublished) || isPublishing || isCalculating || (uploadedCount === 0 && !hasActiveFileData)}
          className={`uppercase text-[11px] font-bold h-7 px-2 shrink-0 ${
            isPublished
              ? 'text-emerald-700 bg-emerald-50 cursor-default border border-emerald-300/60 opacity-90'
              : 'text-violet-700 hover:text-violet-800'
          }`}
          title={isPublished ? t('Báo cáo này đã được công bố chính thức') : t('Công bố phiên bản báo cáo chính thức cho mọi người dùng')}
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

      {/* 5. NÚT ĐỒNG BỘ DỮ LIỆU (Tải và khôi phục dữ liệu chuẩn bất cứ lúc nào) */}
      {typeof onSyncFromServer === 'function' && (
        <Button
          key="SyncServer"
          variant="ghost"
          size="sm"
          onClick={onSyncFromServer}
          disabled={isSyncingVersion || isCalculating || isParsing}
          className="uppercase text-[11px] font-bold text-teal-700 hover:text-teal-800 h-7 px-2 shrink-0"
          title="Đồng bộ và khôi phục toàn bộ dữ liệu báo cáo chuẩn về máy"
        >
          <Upload size={13} className="text-teal-600 rotate-180" />
          <span>{t('ĐỒNG BỘ DỮ LIỆU')}</span>
        </Button>
      )}

      {/* 6. NÚT CHỈNH SỬA / MỞ KHÓA BẢN MỚI (Khi bản đang ở PUBLISHED mà muốn sửa dữ liệu) */}
      {isPublished && typeof onUnlockForEdit === 'function' && (
        <Button
          key="UnlockEdit"
          variant="ghost"
          size="sm"
          onClick={onUnlockForEdit}
          disabled={isCalculating || isParsing}
          className="uppercase text-[11px] font-bold text-amber-700 hover:text-amber-800 h-7 px-2 shrink-0 border border-amber-300/60 bg-amber-50/50"
          title="Mở khóa để chỉnh sửa dữ liệu, nạp thêm file hoặc tạo phiên bản mới"
        >
          <Share2 size={13} className="text-amber-600" />
          <span>{t('CHỈNH SỬA BẢN MỚI')}</span>
        </Button>
      )}

      {/* 7. XUẤT GÓI .GSPROD */}
      {typeof onExportBundle === 'function' && (
        <Button
          key="ExportBundle"
          variant="ghost"
          size="sm"
          onClick={onExportBundle}
          disabled={isExporting || (uploadedCount === 0 && !hasActiveFileData)}
          className="uppercase text-[11px] font-bold text-amber-700 hover:text-amber-800 h-7 px-2 shrink-0"
          title="Xuất gói dữ liệu báo cáo để chia sẻ và lưu trữ"
        >
          <FileArchive size={13} className="text-amber-600" />
          <span>{t('XUẤT GÓI .GSPROD')}</span>
        </Button>
      )}

      {/* 8. NÚT XUẤT EXCEL 6 BẢNG (1 file đa Sheet siêu nhẹ) */}
      {typeof onExportAllTabsExcel === 'function' && (
        <Button
          key="ExportAllExcel"
          variant="ghost"
          size="sm"
          onClick={onExportAllTabsExcel}
          disabled={isExporting || (uploadedCount === 0 && !hasActiveFileData)}
          className="uppercase text-[11px] font-bold text-emerald-700 hover:text-emerald-800 h-7 px-2 shrink-0"
          title="Xuất toàn bộ dữ liệu 6 bảng ra 1 tệp Excel đa Sheet duy nhất"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          <span>{t('XUẤT EXCEL (6 BẢNG)')}</span>
        </Button>
      )}

      {/* 9. NÚT XÓA DÒNG (Chỉ hiển thị khi KHÔNG PHẢI bản PUBLISHED đã khóa, hoặc đang ở bản nháp/chỉnh sửa) */}
      {!isPublished && (hasActiveFileData || selectedRowsCount > 0) && typeof onDeleteSelectedRows === 'function' && (
        <Button
          key="Delete"
          variant="ghost"
          size="sm"
          onClick={() => onDeleteSelectedRows()}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2 shrink-0 flex items-center gap-1"
          title={selectedRowsCount > 0 ? t('Xóa các dòng đang chọn') : t('Xóa dữ liệu đang chọn')}
        >
          <Trash2 size={13} className="text-rose-500" />
          <span>
            {selectedRowsCount > 0
              ? `${t('XÓA')} (${selectedRowsCount} ${t('DÒNG')})`
              : t('XÓA')}
          </span>
        </Button>
      )}
    </div>
  )
})

export default CalcProductionActions
