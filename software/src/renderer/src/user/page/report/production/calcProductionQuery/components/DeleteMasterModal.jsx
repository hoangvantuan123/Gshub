/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, X, CloudOff, HardDrive, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from 'antd'

export default function DeleteMasterModal({
  isOpen = false,
  onClose,
  onConfirm,
  regCode = '',
  isMyRecord = false,
  creatorName = '',
  recordTitle = ''
}) {
  const { t } = useTranslation()
  const [deleteMode, setDeleteMode] = useState('server') // 'server' hoặc 'local'

  useEffect(() => {
    if (isOpen) {
      setDeleteMode(isMyRecord ? 'server' : 'local')
    }
  }, [isOpen, isMyRecord])

  if (!isOpen) return null

  const handleExecute = () => {
    if (typeof onConfirm === 'function') {
      onConfirm(isMyRecord ? deleteMode : 'local')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4">
      <div className="w-[520px] max-w-full bg-white rounded shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className={isMyRecord ? 'text-rose-600' : 'text-amber-600'} />
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
              {isMyRecord ? t('Xác nhận xóa phiếu tính sản xuất') : t('Xóa bộ nhớ đệm (Cache) trên máy')}
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
          </div>

          {/* Lựa chọn xóa nếu là chính chủ */}
          {isMyRecord ? (
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block">
                {t('Vui lòng chọn hình thức xóa')}:
              </label>

              {/* Tùy chọn 1: Xóa vĩnh viễn trên Server DataHub */}
              <div
                onClick={() => setDeleteMode('server')}
                className={`p-3 rounded border cursor-pointer transition-all flex items-start gap-3 ${
                  deleteMode === 'server'
                    ? 'border-rose-400 bg-rose-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'server'}
                  onChange={() => setDeleteMode('server')}
                  className="mt-1 cursor-pointer"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 text-xs">
                    <CloudOff size={14} className="text-rose-600 shrink-0" />
                    <span>{t('XÓA VĨNH VIỄN TRÊN SERVER DATAHUB')} (Khuyên dùng)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t(
                      'Xóa hoàn toàn bản ghi khỏi CSDL hệ thống. Phiếu này sẽ biến mất khỏi danh sách của tất cả mọi người (Bản nén gốc trên ổ đĩa server vẫn được bảo lưu an toàn).'
                    )}
                  </p>
                </div>
              </div>

              {/* Tùy chọn 2: Chỉ xóa bộ nhớ tạm trên máy */}
              <div
                onClick={() => setDeleteMode('local')}
                className={`p-3 rounded border cursor-pointer transition-all flex items-start gap-3 ${
                  deleteMode === 'local'
                    ? 'border-blue-400 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'local'}
                  onChange={() => setDeleteMode('local')}
                  className="mt-1 cursor-pointer"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-800 text-xs">
                    <HardDrive size={14} className="text-blue-600 shrink-0" />
                    <span>{t('CHỈ XÓA BỘ NHỚ ĐỆM (CACHE) TRÊN MÁY TÍNH NÀY')}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t(
                      'Chỉ dọn dẹp các tệp tạm và kết quả tính toán cục bộ để giải phóng dung lượng ổ cứng. Phiếu trên Server DataHub vẫn còn nguyên.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Không phải chính chủ */
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>{t('Phiếu thuộc quyền sở hữu của người khác')}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t(
                  'Bạn không có quyền xóa bản ghi gốc trên hệ thống. Thao tác này sẽ chỉ dọn dẹp các tệp tạm và bộ nhớ đệm (cache) đã tải về trên máy tính này để giải phóng dung lượng.'
                )}
              </p>
            </div>
          )}

          {/* Cảnh báo an toàn */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
            <ShieldAlert size={13} className="text-slate-400 shrink-0" />
            <span>{t('Thao tác xóa không thể hoàn tác trực tiếp trên giao diện.')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button onClick={onClose} size="small" className="text-xs">
            {t('Hủy bỏ')}
          </Button>
          <Button
            danger={isMyRecord && deleteMode === 'server'}
            type={isMyRecord && deleteMode === 'server' ? 'primary' : 'default'}
            onClick={handleExecute}
            size="small"
            className={`text-xs font-bold ${
              !isMyRecord || deleteMode === 'local'
                ? 'border-blue-600 text-blue-700 hover:bg-blue-50'
                : ''
            }`}
          >
            {isMyRecord
              ? deleteMode === 'server'
                ? t('Xác nhận xóa vĩnh viễn trên Server')
                : t('Xác nhận xóa cache trên máy')
              : t('Xóa cache trên máy')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
