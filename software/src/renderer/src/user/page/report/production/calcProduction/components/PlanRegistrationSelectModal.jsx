/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Send, FileSpreadsheet, X, Check, Calendar, Building2, Tag, Layers } from 'lucide-react'
import { Button, Checkbox } from 'antd'

/**
 * PlanRegistrationSelectModal - Modal Cho phép người dùng tùy chọn báo cáo cần nạp (KHSX / TKSX)
 * Mặc định chọn cả 2, cho phép tích bỏ nếu không muốn nạp.
 */
export default function PlanRegistrationSelectModal({
  isOpen = false,
  onClose = null,
  onConfirm = null,
  masterInfo = {},
  khsxRowsCount = 0,
  statRowsCount = 0,
  isLoading = false
}) {
  const [pushKhsx, setPushKhsx] = useState(true)
  const [pushTksx, setPushTksx] = useState(true)

  // Reset về mặc định mỗi khi modal được mở ra
  useEffect(() => {
    if (isOpen) {
      setPushKhsx(khsxRowsCount > 0)
      setPushTksx(statRowsCount > 0)
    }
  }, [isOpen, khsxRowsCount, statRowsCount])

  const baseRegCode = useMemo(() => {
    const raw = masterInfo?.regCode || 'REG-CALC'
    return String(raw).replace(/-KHSX$|-TKSX$/i, '')
  }, [masterInfo?.regCode])

  const selectedCount = (pushKhsx ? 1 : 0) + (pushTksx ? 1 : 0)
  const totalRowsSelected =
    (pushKhsx ? khsxRowsCount : 0) + (pushTksx ? statRowsCount : 0)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!pushKhsx && !pushTksx) return
    onConfirm?.({
      pushKhsx: Boolean(pushKhsx),
      pushTksx: Boolean(pushTksx)
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/50 backdrop-blur-[2px] select-none p-4"
      style={{ pointerEvents: 'all' }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <style>{`
        @keyframes selectModalPopIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        className="bg-white rounded-none shadow-2xl border border-slate-300 w-[94vw] max-w-[560px] min-w-[340px] flex flex-col overflow-hidden font-sans"
        style={{ animation: 'selectModalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#f1f5f9] border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className="w-2.5 h-2.5 inline-block shrink-0 bg-indigo-600" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate flex items-center gap-2">
              <Send size={15} className="text-indigo-600 shrink-0" />
              ĐĂNG KÝ BÁO CÁO VÀO HỆ THỐNG
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition-colors disabled:opacity-50"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Thông tin Master Info tóm tắt */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <Tag size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-500">Mã đợt:</span>
            <strong className="text-slate-800 font-mono truncate">{baseRegCode}</strong>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-500">Nhà máy:</span>
            <strong className="text-slate-800 truncate">
              {masterInfo?.factoryName || 'GS1 Hà Nội'}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-500">Ngày áp dụng:</span>
            <strong className="text-slate-800 font-mono">{masterInfo?.applyDate || 'Hôm nay'}</strong>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Layers size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-500">Phiên bản:</span>
            <strong className="text-indigo-700 font-mono">
              v{masterInfo?.version || masterInfo?.calcVersion || '1.0'}
            </strong>
          </div>
        </div>

        {/* Thân Modal */}
        <div className="p-4 flex flex-col gap-3.5 bg-white">
          <div className="text-[12px] text-slate-700 font-medium">
            Vui lòng tích chọn các báo cáo bạn muốn đăng ký nạp lên hệ thống:
          </div>

          {/* Danh sách 2 báo cáo để tích chọn */}
          <div className="flex flex-col gap-2.5">
            {/* 1. Báo cáo KHSX */}
            <div
              onClick={() => {
                if (khsxRowsCount > 0) setPushKhsx((prev) => !prev)
              }}
              className={`p-3 border transition-all flex items-start gap-3 select-none ${
                khsxRowsCount === 0
                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  : pushKhsx
                  ? 'bg-blue-50/60 border-blue-400 shadow-sm cursor-pointer'
                  : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
              }`}
            >
              <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={pushKhsx}
                  disabled={khsxRowsCount === 0}
                  onChange={(e) => setPushKhsx(e.target.checked)}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      1. Báo cáo Kế hoạch sản xuất (KHSX)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 border ${
                      khsxRowsCount > 0
                        ? 'bg-blue-100 text-blue-800 border-blue-300 font-mono'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {khsxRowsCount > 0
                      ? `${khsxRowsCount.toLocaleString('vi-VN')} dòng`
                      : '0 dòng (Không có DL)'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-mono">
                  <span>Mã đẩy: <strong className="text-blue-700">{baseRegCode}-KHSX</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 font-sans">Module: Báo cáo kế hoạch sản xuất</span>
                </div>
              </div>
            </div>

            {/* 2. Báo cáo TKSX */}
            <div
              onClick={() => {
                if (statRowsCount > 0) setPushTksx((prev) => !prev)
              }}
              className={`p-3 border transition-all flex items-start gap-3 select-none ${
                statRowsCount === 0
                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  : pushTksx
                  ? 'bg-emerald-50/60 border-emerald-400 shadow-sm cursor-pointer'
                  : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
              }`}
            >
              <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={pushTksx}
                  disabled={statRowsCount === 0}
                  onChange={(e) => setPushTksx(e.target.checked)}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      2. Báo cáo Thống kê sản xuất (TKSX)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 border ${
                      statRowsCount > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-mono'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {statRowsCount > 0
                      ? `${statRowsCount.toLocaleString('vi-VN')} dòng`
                      : '0 dòng (Không có DL)'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-mono">
                  <span>Mã đẩy: <strong className="text-emerald-700">{baseRegCode}-TKSX</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 font-sans">Module: Báo cáo thống kê sản xuất</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ghi chú tổng hợp */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border border-slate-200 text-[11px]">
            <span className="text-slate-600">
              Đã chọn: <strong className="text-slate-800">{selectedCount} / 2</strong> báo cáo
            </span>
            <span className="text-slate-600 font-mono">
              Tổng số dòng: <strong className="text-indigo-700">{totalRowsSelected.toLocaleString('vi-VN')}</strong> dòng
            </span>
          </div>

          {!pushKhsx && !pushTksx && (
            <div className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-200 px-3 py-1.5">
              * Vui lòng tích chọn ít nhất 1 báo cáo để thực hiện đăng ký!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#f1f5f9] border-t border-slate-300 flex items-center justify-end gap-2 shrink-0">
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-none h-7 px-3 text-xs font-semibold"
          >
            Hủy bỏ
          </Button>

          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={(!pushKhsx && !pushTksx) || isLoading}
            className="rounded-none h-7 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <Check size={14} />
            Đồng ý đăng ký
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
