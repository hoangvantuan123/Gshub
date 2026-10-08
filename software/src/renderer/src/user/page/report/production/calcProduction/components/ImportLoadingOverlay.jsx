import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, FileSpreadsheet, Columns, Database, ShieldCheck } from 'lucide-react'

/**
 * ImportLoadingOverlay - Modal Hiển thị Tiến trình Nạp File Excel
 * Thiết kế vuông vức chuẩn ERP GsHub (phong cách CodeHelp Modal),
 * kèm tính năng khóa chuột, chặn thoát trang (F5, Ctrl+R, Alt+F4) và thông số nạp file.
 */
export default function ImportLoadingOverlay({
  isLoading = false,
  progressInfo = {},
  title = 'Đang Xử Lý & Nạp Dữ Liệu Excel',
  message = 'Hệ thống đang phân tích cấu trúc và đồng bộ dữ liệu...',
  subMessage = 'Thao tác đang được tạm khóa để bảo vệ toàn vẹn dữ liệu. Vui lòng không đóng trang.'
}) {
  // Chặn phím tắt và F5 khi đang nạp dữ liệu
  useEffect(() => {
    if (!isLoading) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Dữ liệu đang được import. Bạn có chắc chắn muốn rời khỏi?'
      return e.returnValue
    }

    const handleKeyDown = (e) => {
      if (
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') ||
        (e.altKey && e.key === 'F4') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w')
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isLoading])

  if (!isLoading) return null

  // Format kích thước file
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const fileName = progressInfo?.fileName || ''
  const fileSize = formatFileSize(progressInfo?.fileSize)
  const tabTitle = progressInfo?.tabTitle || ''
  const detectedCols = progressInfo?.detectedColumns || 0
  const totalRows = progressInfo?.totalRows || 0
  const percent = Math.min(100, Math.max(12, progressInfo?.percent || 25))
  const currentMsg = progressInfo?.message || message

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] select-none cursor-wait p-4"
      style={{ pointerEvents: 'all' }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <style>{`
        @keyframes modalPopIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* KHUNG MODAL TIẾN TRÌNH VUÔNG VẮN CHUẨN ERP GSHUB */}
      <div
        className="bg-[#f8fafc] rounded-none shadow-2xl border border-slate-500 w-[94vw] max-w-[620px] min-w-[360px] flex flex-col overflow-hidden font-sans"
        style={{ animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* 1. Header Vuông Liền Mạch */}
        <div className="px-3 py-2 bg-[#f1f5f9] border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block shrink-0" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
              {title} {tabTitle ? ` — [${tabTitle}]` : ''}
            </span>
          </div>
        </div>

        {/* 2. Thân Modal & Thông Số File */}
        <div className="p-4 bg-white space-y-3.5">
          {/* Thông tin tệp Excel đang nạp */}
          {fileName && (
            <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs">
              <div className="flex items-center justify-between text-slate-800 font-bold mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
                {fileSize && (
                  <span className="text-[10px] text-slate-500 font-mono font-normal shrink-0">
                    {fileSize}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <Columns size={12} className="text-blue-600" />
                  <span>Cột phát hiện:</span>
                  <b className="text-slate-800 font-mono">
                    {detectedCols > 0 ? `${detectedCols} cột` : 'Đang quét...'}
                  </b>
                </div>
                <div className="flex items-center gap-1">
                  <Database size={12} className="text-indigo-600" />
                  <span>Tổng dữ liệu:</span>
                  <b className="text-slate-800 font-mono">
                    {totalRows > 0
                      ? `${totalRows.toLocaleString('vi-VN')} dòng`
                      : 'Đang chuẩn hóa...'}
                  </b>
                </div>
              </div>
            </div>
          )}

          {/* Thanh Tiến Trình (Progress Bar) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />
                <span className="truncate">{currentMsg}</span>
              </span>
              <span className="font-mono font-bold text-blue-700 text-xs shrink-0">{percent}%</span>
            </div>

            <div className="w-full bg-slate-200 h-2 overflow-hidden border border-slate-300">
              <div
                className="bg-blue-600 h-full transition-all duration-200 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Các bước xử lý chuẩn hệ thống ERP */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-1 font-semibold">
            <div
              className={`p-1 border ${
                percent >= 25
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              1. Đọc & Quét Header
            </div>
            <div
              className={`p-1 border ${
                percent >= 60
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              2. Chuẩn Hóa Ngày Giờ
            </div>
            <div
              className={`p-1 border ${
                percent >= 90
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              3. Lưu Dữ Liệu Báo Cáo
            </div>
          </div>
        </div>

        {/* 3. Footer Cảnh Báo An Toàn */}
        <div className="px-3 py-2 bg-[#f1f5f9] border-t border-slate-300 flex items-center gap-2 text-[10px] text-slate-600 shrink-0">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span className="truncate">{subMessage}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
