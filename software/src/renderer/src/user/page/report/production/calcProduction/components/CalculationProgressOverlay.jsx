import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Calculator, Database, ShieldCheck, Cpu, Layers } from 'lucide-react'

/**
 * CalculationProgressOverlay - Modal Hiển thị Tiến trình Tính Toán KHSX & TKSX
 * Thiết kế vuông vắn chuẩn ERP GsHub, thể hiện rõ tiến độ tính toán từ CSDL
 */
export default function CalculationProgressOverlay({
  isCalculating = false,
  progressInfo = {},
  title = 'TIẾN TRÌNH TÍNH TOÁN KHSX & TKSX',
  subMessage = 'Thao tác đang được tạm khóa để bảo đảm kết quả tính toán chính xác nhất.'
}) {
  // Chặn phím tắt và F5 khi đang tính toán
  useEffect(() => {
    if (!isCalculating) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Hệ thống đang thực hiện tính toán. Bạn có chắc chắn muốn rời khỏi?'
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
  }, [isCalculating])

  if (!isCalculating) return null

  const percent = Math.min(100, Math.max(10, progressInfo?.percent || 15))
  const step = progressInfo?.step || 'INIT'
  const message = progressInfo?.message || 'Đang chuẩn bị dữ liệu tính toán từ CSDL...'
  const detail = progressInfo?.detail || ''
  const storageMode = progressInfo?.storageMode || 'SQLite Native C++'

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] select-none cursor-wait p-4"
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
        className="bg-[#f8fafc] rounded-none shadow-2xl border border-blue-600/60 w-[94vw] max-w-[620px] min-w-[360px] flex flex-col overflow-hidden font-sans"
        style={{ animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* 1. Header Vuông Liền Mạch */}
        <div className="px-3.5 py-2.5 bg-[#f1f5f9] border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block shrink-0" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate flex items-center gap-2">
              <Calculator size={15} className="text-blue-600" />
              {title}
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            {storageMode}
          </span>
        </div>

        {/* 2. Thân Modal & Thông Số Tính Toán */}
        <div className="p-4 bg-white space-y-4">
          {/* Hộp Thông Tin Trạng Thái Đang Xử Lý */}
          <div className="p-3 bg-slate-50 border border-slate-300 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-800 font-bold gap-2">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <Cpu size={15} className="text-indigo-600 shrink-0 animate-pulse" />
                <span className="truncate text-slate-800 font-semibold">{message}</span>
              </div>
            </div>

            {detail && (
              <div className="text-[11px] text-slate-600 font-mono pl-6 truncate border-t border-slate-200 pt-1.5">
                {detail}
              </div>
            )}
          </div>

          {/* Thanh Tiến Trình (Progress Bar) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />
                <span className="truncate text-[11px] text-slate-600">
                  {percent >= 100 ? 'Đã hoàn tất tính toán!' : 'Đang xử lý thuật toán...'}
                </span>
              </span>
              <span className="font-mono font-bold text-blue-700 text-sm shrink-0">{percent}%</span>
            </div>

            <div className="w-full bg-slate-200 h-2.5 overflow-hidden border border-slate-300">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-250 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* 4 Bước Tính Toán Chuẩn ERP */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center pt-1 font-semibold">
            <div
              className={`p-1.5 border transition-all ${
                percent >= 25
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              1. Đọc CSDL SQLite
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 55
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              2. Tính TKSX (98 Cột)
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 80
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              3. Đối Soát KHSX
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 98
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              4. Lưu CSDL & Đợt
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
