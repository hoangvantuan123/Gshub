/* eslint-disable react/prop-types */
import { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export default function SystemConfirmModal({
  isOpen = false,
  title,
  message,
  subMessage,
  onConfirm,
  onCancel,
  onClose,
  onExtraAction,
  confirmText,
  cancelText,
  extraActionText,
  type = 'warning',
  confirmVariant,
  isMac
}) {
  const { t } = useTranslation()
  const modalRef = useRef(null)
  const handleCancel = onCancel || onClose

  const isMacOS = useMemo(() => {
    if (typeof isMac === 'boolean') return isMac
    if (typeof window === 'undefined') return false
    return (
      window.electron?.isMac ||
      (navigator.userAgent && /Macintosh|Mac OS X/i.test(navigator.userAgent))
    )
  }, [isMac])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleCancel && handleCancel()
      } else if (e.key === 'Enter') {
        if (
          document.activeElement?.tagName === 'BUTTON' &&
          document.activeElement !== modalRef.current
        ) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        onConfirm && onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onConfirm, handleCancel])

  if (!isOpen) return null

  const typeConfig = {
    warning: {
      titleDefault: t('Cảnh báo hệ thống'),
      btnColor: 'bg-[#0067c0] hover:bg-[#005fb8] text-white border-[#005fb8]'
    },
    unsaved: {
      titleDefault: t('Xác nhận dữ liệu chưa lưu'),
      btnColor: 'bg-[#0067c0] hover:bg-[#005fb8] text-white border-[#005fb8]'
    },
    danger: {
      titleDefault: t('Cảnh báo nguy hiểm'),
      btnColor: 'bg-[#c42b1c] hover:bg-[#b82819] text-white border-[#b82819]'
    },
    delete: {
      titleDefault: t('Xác nhận xóa dữ liệu'),
      btnColor: 'bg-[#c42b1c] hover:bg-[#b82819] text-white border-[#b82819]'
    },
    info: {
      titleDefault: t('Thông tin'),
      btnColor: 'bg-[#0067c0] hover:bg-[#005fb8] text-white border-[#005fb8]'
    },
    success: {
      titleDefault: t('Thành công'),
      btnColor: 'bg-[#107c41] hover:bg-[#0f703b] text-white border-[#0f703b]'
    }
  }

  const currentConfig = typeConfig[type] || typeConfig.warning

  let confirmBtnClass = currentConfig.btnColor
  if (confirmVariant === 'danger') {
    confirmBtnClass = isMacOS
      ? 'bg-[#FF3B30] hover:bg-[#E0342B] text-white border-transparent'
      : 'bg-[#c42b1c] hover:bg-[#b82819] text-white border-[#b82819]'
  } else if (confirmVariant === 'primary') {
    confirmBtnClass = isMacOS
      ? 'bg-[#007AFF] hover:bg-[#0069D9] text-white border-transparent'
      : 'bg-[#0067c0] hover:bg-[#005fb8] text-white border-[#005fb8]'
  }

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] select-none p-4 transition-opacity duration-150">
      <div
        className={`w-[450px] max-w-full flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 font-sans text-[13px] transition-transform duration-150 scale-100 ${
          isMacOS
            ? 'rounded-[12px] bg-[#ffffff] dark:bg-[#282828] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-black/10 dark:border-white/10'
            : 'rounded-[8px] bg-[#f9f9f9] dark:bg-[#202020] shadow-[0_16px_48px_rgba(0,0,0,0.35)] border border-[#d1d5db] dark:border-[#383838]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`h-[34px] flex items-center justify-between px-3 border-b select-none ${
            isMacOS
              ? 'bg-[#f6f6f6] dark:bg-[#303030] border-black/5 dark:border-white/5'
              : 'bg-[#ffffff] dark:bg-[#2c2c2c] border-[#e5e7eb] dark:border-[#383838]'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {isMacOS && (
              <div className="flex items-center gap-1.5 mr-1">
                <span
                  onClick={handleCancel}
                  className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 cursor-pointer flex items-center justify-center group"
                >
                  <X className="w-2 h-2 text-[#4A0002] opacity-0 group-hover:opacity-100" />
                </span>
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              </div>
            )}

            <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200 tracking-wide truncate">
              {title || currentConfig.titleDefault}
            </span>
          </div>

          {!isMacOS && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-[32px] h-[34px] -mr-3 flex items-center justify-center hover:bg-[#e81123] hover:text-white text-slate-500 dark:text-slate-400 transition-colors"
              title={t('Đóng (Esc)')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div
          className={`p-5 flex flex-col gap-1.5 ${
            isMacOS ? 'bg-white dark:bg-[#282828]' : 'bg-[#fcfcfc] dark:bg-[#242424]'
          }`}
        >
          <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50 leading-snug">
            {message || t('Dữ liệu trên bảng đã được chỉnh sửa nhưng chưa lưu!')}
          </h3>
          <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {subMessage ||
              t(
                'Nếu bạn tiếp tục thao tác, các thay đổi chưa lưu trên bảng sẽ bị hủy bỏ. Bạn có muốn tiếp tục?'
              )}
          </p>
        </div>

        <div
          className={`px-4 py-2.5 flex items-center justify-end gap-2 border-t select-none ${
            isMacOS
              ? 'bg-[#f6f6f6] dark:bg-[#222222] border-black/5 dark:border-white/5'
              : 'bg-[#f0f0f0] dark:bg-[#1c1c1c] border-[#e5e7eb] dark:border-[#333333]'
          }`}
        >
          {extraActionText && onExtraAction && (
            <button
              type="button"
              onClick={onExtraAction}
              className={`h-[28px] px-3.5 text-[12px] font-medium transition-all cursor-pointer outline-none whitespace-nowrap shrink-0 inline-flex items-center justify-center ${
                isMacOS
                  ? 'rounded-[6px] bg-white dark:bg-[#383838] hover:bg-slate-50 dark:hover:bg-[#444444] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs'
                  : 'rounded-[4px] bg-white dark:bg-[#2d2d2d] hover:bg-[#f0f0f0] dark:hover:bg-[#383838] text-slate-700 dark:text-slate-200 border border-[#d1d5db] dark:border-[#444444] shadow-xs'
              }`}
            >
              {extraActionText}
            </button>
          )}

          {cancelText !== null && cancelText !== false && (
            <button
              type="button"
              onClick={handleCancel}
              className={`h-[28px] px-3.5 min-w-[76px] text-[12px] font-medium transition-all cursor-pointer outline-none whitespace-nowrap shrink-0 inline-flex items-center justify-center ${
                isMacOS
                  ? 'rounded-[6px] bg-white dark:bg-[#383838] hover:bg-slate-50 dark:hover:bg-[#444444] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs active:scale-[0.98]'
                  : 'rounded-[4px] bg-white dark:bg-[#2d2d2d] hover:bg-[#f0f0f0] dark:hover:bg-[#383838] text-slate-700 dark:text-slate-200 border border-[#d1d5db] dark:border-[#444444] shadow-xs active:bg-[#e5e5e5]'
              }`}
            >
              {cancelText || t('Quay lại')}
            </button>
          )}

          <button
            ref={modalRef}
            type="button"
            onClick={onConfirm}
            className={`h-[28px] px-4 min-w-[88px] text-[12px] font-medium transition-all cursor-pointer outline-none whitespace-nowrap shrink-0 inline-flex items-center justify-center shadow-xs active:scale-[0.98] ${
              isMacOS
                ? `rounded-[6px] ${confirmBtnClass}`
                : `rounded-[4px] border ${confirmBtnClass}`
            }`}
          >
            {confirmText || t('Đồng ý')}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
