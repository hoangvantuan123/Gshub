/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Ban, X, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Button, Input } from 'antd'

const SUGGESTED_REASONS = [
  'Nhập sai số liệu nguồn',
  'Kế hoạch sản xuất thay đổi',
  'Tính toán lại phiên bản mới',
  'Hủy theo yêu cầu điều độ'
]

export default function CancelMasterModal({
  isOpen = false,
  onClose,
  onConfirm,
  regCode = '',
  creatorName = '',
  recordTitle = '',
  cancelReason = '',
  onChangeCancelReason
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason(cancelReason || '')
    }
  }, [isOpen, cancelReason])

  const handleReasonChange = (val) => {
    setReason(val)
    if (typeof onChangeCancelReason === 'function') {
      onChangeCancelReason(val)
    }
  }

  const handleExecute = () => {
    if (typeof onConfirm === 'function') {
      onConfirm()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4">
      <div className="w-[500px] max-w-full bg-white rounded shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban size={16} className="text-rose-600" />
            <span className="font-bold text-xs text-rose-900 uppercase tracking-wide">
              {t('Chuyển đổi trạng thái sang Bản hủy (CANCELLED)')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Thông tin phiếu */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{t('Mã đăng ký')}:</span>
              <span className="font-mono font-bold text-indigo-700">{regCode}</span>
            </div>
            {recordTitle && recordTitle !== regCode && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('Nội dung')}:</span>
                <span className="text-slate-800 font-semibold">{recordTitle}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{t('Người tạo')}:</span>
              <span className="text-slate-800 font-medium">{creatorName || 'Hệ thống'}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">{t('Trạng thái mới')}:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                {t('Bản hủy (CANCELLED)')}
              </span>
            </div>
          </div>

          {/* Nhập lý do hủy */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">
              {t('Lý do hủy phiếu')}{' '}
              <span className="text-slate-400 font-normal">({t('tùy chọn')})</span>:
            </label>
            <Input.TextArea
              rows={2}
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder={t(
                'Nhập lý do hủy phiếu (ví dụ: Kế hoạch thay đổi, tính lại phiên bản mới...)'
              )}
              className="text-xs"
            />
            {/* Gợi ý lý do nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400">{t('Gợi ý')}:</span>
              {SUGGESTED_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleReasonChange(r)}
                  className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Lưu ý nghiệp vụ chuẩn ERP */}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
            <ShieldAlert size={13} className="text-slate-400 shrink-0" />
            <span>
              {t('Sau khi hủy, phiếu sẽ không còn được dùng để làm báo cáo KHSX và TKSX.')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button onClick={onClose} size="small" className="text-xs">
            {t('Quay lại')}
          </Button>
          <Button
            danger
            type="primary"
            onClick={handleExecute}
            size="small"
            className="text-xs font-bold bg-rose-600 hover:bg-rose-700"
          >
            {t('Xác nhận hủy phiếu')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
