/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, CheckCircle2, Clock, Send, ShieldCheck, X } from 'lucide-react'
import { Button } from 'antd'

/**
 * PlanRegistrationPushModal - Modal Theo Dõi Trạng Thái Nạp Báo Cáo KHSX & TKSX
 * Thiết kế tinh gọn, trực quan, loại bỏ các thuật ngữ kỹ thuật
 */
export default function PlanRegistrationPushModal({
  isOpen = false,
  progressInfo = {},
  onClose = null
}) {
  const isCompleted = Boolean(progressInfo?.isComplete || progressInfo?.percent >= 100)
  const isError = Boolean(progressInfo?.isError)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Bộ đếm thời gian thực thi (giây)
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0)
      return
    }
    if (isCompleted || isError) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isCompleted, isError])

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Chặn phím tắt và F5 khi đang thực hiện nạp dữ liệu
  useEffect(() => {
    if (!isOpen || isCompleted || isError) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Hệ thống đang nạp báo cáo. Bạn có chắc muốn rời khỏi?'
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
  }, [isOpen, isCompleted, isError])

  if (!isOpen) return null

  const percent = isCompleted
    ? 100
    : Math.min(100, Math.max(8, progressInfo?.percent || 10))

  const cleanMessage = () => {
    if (isCompleted) return 'Đã đăng ký báo cáo KHSX và TKSX thành công!'
    if (isError) return progressInfo?.message || 'Có lỗi xảy ra khi nạp báo cáo'
    if (progressInfo?.step === 'KHSX') return 'Đang nạp báo cáo Kế hoạch sản xuất (KHSX)...'
    if (progressInfo?.step === 'TKSX') return 'Đang nạp báo cáo Thống kê sản xuất (TKSX)...'
    return progressInfo?.message || 'Đang chuẩn bị dữ liệu báo cáo...'
  }

  const message = cleanMessage()

  const statusTag = isCompleted
    ? 'Hoàn tất'
    : isError
    ? 'Có lỗi'
    : 'Đang xử lý'

  const steps = [
    { title: 'Kiểm tra số liệu', key: 'INIT' },
    { title: 'Nạp Báo cáo KHSX', key: 'KHSX' },
    { title: 'Nạp Báo cáo TKSX', key: 'TKSX' },
    { title: 'Hoàn tất đăng ký', key: 'DONE' }
  ]

  const currentStep = progressInfo?.step || 'INIT'

  const getStepStatus = (stepKey) => {
    if (isCompleted) return 'DONE'
    if (stepKey === 'INIT') {
      if (currentStep === 'INIT') return 'ACTIVE'
      return 'DONE'
    }
    if (stepKey === 'KHSX') {
      if (currentStep === 'INIT') return 'PENDING'
      if (currentStep === 'KHSX' || currentStep === 'PUSHING_KHSX') return 'ACTIVE'
      return 'DONE'
    }
    if (stepKey === 'TKSX') {
      if (currentStep === 'INIT' || currentStep === 'KHSX' || currentStep === 'PUSHING_KHSX') return 'PENDING'
      if (currentStep === 'TKSX' || currentStep === 'PUSHING_TKSX') return 'ACTIVE'
      return 'DONE'
    }
    if (stepKey === 'DONE') {
      if (currentStep === 'COMPLETED' || isCompleted) return 'DONE'
      if (currentStep === 'SAVING_MASTER') return 'ACTIVE'
      return 'PENDING'
    }
    return 'PENDING'
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] select-none p-4"
      style={{ pointerEvents: 'all' }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <style>{`
        @keyframes pushModalPopIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* KHUNG MODAL VUÔNG VỨC GỌN GÀNG */}
      <div
        className="bg-white rounded-none shadow-2xl border border-slate-300 w-[92vw] max-w-[540px] min-w-[340px] flex flex-col overflow-hidden font-sans"
        style={{ animation: 'pushModalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* 1. Header */}
        <div className="px-3.5 py-2.5 bg-[#f1f5f9] border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className={`w-2.5 h-2.5 inline-block shrink-0 ${isCompleted ? 'bg-emerald-600' : 'bg-indigo-600'}`} />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <Send size={15} className="text-indigo-600 shrink-0" />
              )}
              ĐĂNG KÝ BÁO CÁO KHSX & TKSX
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300 text-slate-700 font-mono text-[11px] font-semibold">
              <Clock size={11} className={isCompleted ? 'text-emerald-600' : 'text-indigo-600 animate-spin'} />
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 border shrink-0 ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : isError
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              {statusTag}
            </span>
            {(isCompleted || isError) && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition-colors"
                title="Đóng"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Body Nội Dung */}
        <div className="p-4 flex flex-col gap-3.5 bg-white">
          {/* Trạng thái hiện tại */}
          <div className="flex items-start gap-3 bg-slate-50 p-3 border border-slate-200">
            <div className="mt-0.5 shrink-0">
              {isCompleted ? (
                <CheckCircle2 size={24} className="text-emerald-600" />
              ) : isError ? (
                <ShieldCheck size={24} className="text-rose-600" />
              ) : (
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 leading-snug">
                {message}
              </div>

              {progressInfo?.khsxRows !== undefined && progressInfo?.statRows !== undefined && (
                <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-600 bg-white p-1.5 border border-slate-200">
                  <span>
                    KHSX: <strong className="text-blue-700">{progressInfo.khsxRows.toLocaleString('vi-VN')}</strong> dòng
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    TKSX: <strong className="text-emerald-700">{progressInfo.statRows.toLocaleString('vi-VN')}</strong> dòng
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Thanh Tiến Trình */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-slate-600 uppercase tracking-wider">Tiến độ</span>
              <span className="font-mono font-bold text-indigo-700 text-xs">{percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 overflow-hidden border border-slate-300">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  isCompleted
                    ? 'bg-emerald-600'
                    : isError
                    ? 'bg-rose-600'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* 4 Bước Tiến Trình */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {steps.map((st) => {
              const status = getStepStatus(st.key)
              return (
                <div
                  key={st.key}
                  className={`p-2 border text-[11px] flex items-center gap-2 select-none transition-colors ${
                    status === 'DONE'
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800 font-medium'
                      : status === 'ACTIVE'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400'
                  }`}
                >
                  {status === 'DONE' ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : status === 'ACTIVE' ? (
                    <Loader2 size={13} className="text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center rounded-none bg-slate-200 text-[9px] text-slate-500 font-mono shrink-0">
                      •
                    </span>
                  )}
                  <span className="truncate">{st.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Footer Action: Chỉ giữ nút Đóng */}
        <div className="px-3.5 py-2.5 bg-[#f1f5f9] border-t border-slate-300 flex items-center justify-end">
          {isCompleted || isError ? (
            <Button
              type="primary"
              onClick={onClose}
              className="rounded-none h-7 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
            >
              Đóng
            </Button>
          ) : (
            <Button
              disabled
              className="rounded-none h-7 px-3 text-xs font-semibold opacity-70"
            >
              Đang nạp dữ liệu...
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

