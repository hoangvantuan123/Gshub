/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Calculator, ShieldCheck, Cpu, CheckCircle2, Clock } from 'lucide-react'
import { Button } from 'antd'

/**
 * CalculationProgressOverlay - Modal Hiển thị Tiến trình Tính Toán & Đồng Bộ KHSX & TKSX
 * Thiết kế vuông vắn chuẩn ERP GsHub, thể hiện rõ tiến độ từ CSDL / Server DataHub
 * Hỗ trợ trạng thái hoàn tất và yêu cầu người dùng bấm [Đồng ý/Xác nhận] mới đóng modal.
 */
export default function CalculationProgressOverlay({
  isCalculating = false,
  progressInfo = {},
  title = 'TIẾN TRÌNH TÍNH TOÁN KHSX & TKSX',
  icon: IconComponent = Calculator,
  steps = [
    '1. Chuẩn bị dữ liệu',
    '2. Tổng hợp TKSX',
    '3. Đối soát KHSX',
    '4. Hoàn tất báo cáo'
  ],
  subMessage = 'Thao tác đang được bảo vệ an toàn để bảo đảm tính toàn vẹn dữ liệu.',
  onClose = null
}) {
  const isCompleted = Boolean(
    progressInfo?.isComplete ||
      progressInfo?.step === 'COMPLETED' ||
      (progressInfo?.percent !== undefined && progressInfo?.percent >= 100)
  )

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Bộ đếm thời gian thực thi (giây)
  useEffect(() => {
    if (!isCalculating) {
      setElapsedSeconds(0)
      return
    }
    if (isCompleted) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isCalculating, isCompleted])

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Chặn phím tắt và F5 khi đang thực hiện tác vụ (khi chưa hoàn tất)
  useEffect(() => {
    if (!isCalculating || isCompleted) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Hệ thống đang thực hiện tác vụ. Bạn có chắc chắn muốn rời khỏi?'
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
  }, [isCalculating, isCompleted])

  if (!isCalculating) return null

  const percent = isCompleted ? 100 : Math.min(100, Math.max(10, progressInfo?.percent || 15))
  const message = isCompleted
    ? progressInfo?.message || 'Đã hoàn tất tác vụ thành công!'
    : progressInfo?.message || 'Đang chuẩn bị dữ liệu...'
  const detail = progressInfo?.detail || ''
  const statusTag = isCompleted
    ? 'Hoàn tất thành công'
    : progressInfo?.statusTag || 'Đang xử lý dữ liệu'

  const stepList = Array.isArray(steps) && steps.length >= 4 ? steps : [
    '1. Chuẩn bị dữ liệu',
    '2. Tổng hợp TKSX',
    '3. Đối soát KHSX',
    '4. Hoàn tất báo cáo'
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] select-none p-4"
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
        {/* 1. Header Vuông Liền MẠCH */}
        <div className="px-3.5 py-2.5 bg-[#f1f5f9] border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className={`w-2.5 h-2.5 inline-block shrink-0 ${isCompleted ? 'bg-emerald-600' : 'bg-blue-600'}`} />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <IconComponent size={15} className="text-blue-600 shrink-0" />
              )}
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300 text-slate-700 font-mono text-[11px] font-semibold">
              <Clock size={11} className={isCompleted ? 'text-emerald-600' : 'text-blue-600 animate-spin'} />
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 border shrink-0 ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {statusTag}
            </span>
          </div>
        </div>

        {/* 2. Thân Modal & Thông Số */}
        <div className="p-4 bg-white space-y-4">
          {/* Hộp Thông Tin Trạng Thái */}
          <div
            className={`p-3 border text-xs space-y-2 ${
              isCompleted
                ? 'bg-emerald-50/60 border-emerald-300'
                : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-800 font-bold gap-2">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                {isCompleted ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <Cpu size={15} className="text-indigo-600 shrink-0 animate-pulse" />
                )}
                <span className={`truncate font-semibold ${isCompleted ? 'text-emerald-900 font-bold' : 'text-slate-800'}`}>
                  {message}
                </span>
              </div>
            </div>

            {detail && (
              <div
                className={`text-[11px] pl-6 truncate border-t pt-1.5 ${
                  isCompleted
                    ? 'text-emerald-800 border-emerald-200'
                    : 'text-slate-600 border-slate-200'
                }`}
              >
                {detail}
              </div>
            )}
          </div>

          {/* Thanh Tiến Trình (Progress Bar) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                {isCompleted ? (
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                ) : (
                  <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />
                )}
                <span className="truncate text-[11px] text-slate-600">
                  {isCompleted ? 'Đã hoàn tất 100% dữ liệu!' : 'Đang xử lý dữ liệu...'}
                </span>
              </span>
              <span
                className={`font-mono font-bold text-sm shrink-0 ${
                  isCompleted ? 'text-emerald-700' : 'text-blue-700'
                }`}
              >
                {percent}%
              </span>
            </div>

            <div className="w-full bg-slate-200 h-2.5 overflow-hidden border border-slate-300">
              <div
                className={`h-full transition-all duration-250 ease-out ${
                  isCompleted
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* 4 Bước Tiến Trình Chuẩn ERP */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center pt-1 font-semibold">
            <div
              className={`p-1.5 border transition-all ${
                percent >= 20
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              {stepList[0]}
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 50
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              {stepList[1]}
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 80
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              {stepList[2]}
            </div>
            <div
              className={`p-1.5 border transition-all ${
                percent >= 98 || isCompleted
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              {stepList[3]}
            </div>
          </div>
        </div>

        {/* 3. Footer Cảnh Báo An Toàn & Nút Xác Nhận Khi Hoàn Tất */}
        <div className="px-3.5 py-2.5 bg-[#f1f5f9] border-t border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-slate-600 min-w-0 flex-1 truncate">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span className="truncate">{subMessage}</span>
          </div>

          {isCompleted && typeof onClose === 'function' && (
            <Button
              type="primary"
              size="small"
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-none text-xs font-bold px-4 h-7 shrink-0 shadow flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} className="text-white shrink-0" />
              <span>Đồng ý</span>
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
