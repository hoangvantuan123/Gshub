/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Upload,
  Check,
  Clock,
  Percent,
  Tag,
  SlidersHorizontal,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react'
import { DEFAULT_CALC_RULES, getEffectiveCalcRules } from '../engine/calcRuleConfig'

// Switch Toggle phong cách ERP GsHub
function ErpSwitch({ checked, onChange, disabled = false, label, hint }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 select-none transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-slate-400'
          : 'cursor-pointer text-slate-800 hover:text-slate-950'
      }`}
      onClick={(e) => {
        e.preventDefault()
        if (!disabled) onChange?.(!checked)
      }}
    >
      <div
        className={`relative inline-flex h-[18px] w-[34px] items-center rounded-full transition-colors shrink-0 ${
          checked ? 'bg-[#0088cc]' : 'bg-[#cbd5e1]'
        }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-xs transition-transform ${
            checked ? 'translate-x-[17px]' : 'translate-x-[3px]'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium leading-tight block text-slate-800">{label}</span>
        {hint && (
          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{hint}</span>
        )}
      </div>
    </div>
  )
}

export default function CalcRuleConfigModal({
  open = false,
  isOpen = false,
  onClose,
  onCancel,
  currentRules,
  onSaveRules,
  masterInfo = {}
}) {
  const { t } = useTranslation()
  const isVisible = open || isOpen
  const handleClose = onClose || onCancel
  const fileInputRef = useRef(null)

  const [isMaximized, setIsMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState('shift')
  const [bannerNotice, setBannerNotice] = useState(null)

  // State các giá trị cấu hình
  const [rulesState, setRulesState] = useState(() => getEffectiveCalcRules(currentRules))

  useEffect(() => {
    if (isVisible) {
      setRulesState(getEffectiveCalcRules(currentRules))
      setIsMaximized(false)
      setBannerNotice(null)
    }
  }, [isVisible, currentRules])

  // Tự động ẩn banner sau 8s
  useEffect(() => {
    if (!bannerNotice) return
    const timer = setTimeout(() => {
      setBannerNotice(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [bannerNotice])

  const handleUpdate = (section, key, value) => {
    setRulesState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  // Khôi phục mặc định
  const handleResetDefaults = () => {
    setRulesState(DEFAULT_CALC_RULES)
    setBannerNotice({
      type: 'info',
      title: t('Đã khôi phục mặc định!'),
      message: t(
        'Toàn bộ thông số ca kíp, dung sai và nhãn trạng thái đã được đưa về cấu hình chuẩn ban đầu.'
      )
    })
  }

  // Tải cấu hình xuống file JSON để chuyển sang máy khác
  const handleDownloadConfig = () => {
    try {
      const exportPayload = {
        app: 'GsHub Production Calculation Engine',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        factoryName: masterInfo.factoryName || 'GS1 Hà Nội',
        calcVersion: masterInfo.calcVersion || 'V1',
        rules: rulesState
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const fileName = `gshub_calc_rules_${masterInfo.factoryName || 'factory'}_${dateStr}.json`
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBannerNotice({
        type: 'success',
        title: t('Đã xuất file cấu hình thành công!'),
        message: t(
          `File "${fileName}" đã được tải xuống. Bạn có thể sao chép file này sang các máy khác để nạp cấu hình.`
        )
      })
    } catch (err) {
      console.error(err)
      setBannerNotice({
        type: 'error',
        title: t('Lỗi xuất file cấu hình!'),
        message: t('Không thể tạo hoặc tải file cấu hình JSON. Vui lòng thử lại.')
      })
    }
  }

  // Nhập file cấu hình JSON từ máy khác
  const handleImportConfigFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        const importedRules = parsed.rules || parsed
        const merged = getEffectiveCalcRules(importedRules)
        setRulesState(merged)

        setBannerNotice({
          type: 'success',
          title: t('Nạp file cấu hình thành công!'),
          message: t(
            `Đã nhập các quy tắc tính toán từ file "${file.name}" (Đơn vị: ${parsed.factoryName || 'Tùy chỉnh'} - Phiên bản: ${parsed.calcVersion || 'V1'}). Nhấn "Lưu & Áp Dụng" để lưu thay đổi.`
          )
        })
      } catch (err) {
        console.error(err)
        setBannerNotice({
          type: 'error',
          title: t('Lỗi cấu trúc file cấu hình!'),
          message: t(
            `File "${file.name}" không phải là định dạng JSON hợp lệ hoặc thiếu các trường quy tắc tính toán.`
          )
        })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // Lưu và áp dụng
  const handleSaveAndApply = () => {
    if (onSaveRules) {
      onSaveRules(rulesState)
    }
    if (handleClose) handleClose()
  }

  if (!isVisible) return null

  const tabs = [
    {
      id: 'shift',
      title: t('1. Ca KHSX & Khung Giờ'),
      icon: Clock,
      desc: t('Giờ bắt đầu ca sản xuất và chu kỳ 24h đối soát')
    },
    {
      id: 'quantity',
      title: t('2. Dung Sai Số Lượng'),
      icon: Percent,
      desc: t('Tỷ lệ dung sai % và quy tắc so khớp sản lượng')
    },
    {
      id: 'status_dp',
      title: t('3. Trạng Thái ĐP - SX'),
      icon: Tag,
      desc: t('Quy tắc gắn nhãn điều phối sản xuất')
    },
    {
      id: 'status_time_capa',
      title: t('4. Nhãn Thời Gian & Capa'),
      icon: SlidersHorizontal,
      desc: t('Đánh giá Chậm / Đúng / Nhanh hơn ĐM')
    }
  ]

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-[99999] select-none transition-[padding] duration-200 ease-out ${
        isMaximized ? 'p-0' : 'p-3 sm:p-5'
      }`}
      style={{ animation: 'macBackdropFade 0.15s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose && handleClose()
      }}
    >
      <style>{`
        @keyframes macBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes macOriginIn {
          0% { opacity: 0; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Hidden file input for config upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportConfigFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* KHUNG DIALOG VUÔNG CHUẨN GSHUB ERP MODAL */}
      <div
        className={`bg-[#f8fafc] flex flex-col shadow-2xl border border-slate-500 font-sans rounded-none select-none transition-[width,height,max-width,max-height,transform] duration-200 ease-out transform-gpu will-change-[width,height,transform] ${
          isMaximized
            ? 'w-full h-full max-w-full max-h-full border-0'
            : 'w-[92vw] max-w-[880px] h-[84vh] max-h-[660px] min-h-[480px]'
        }`}
        style={{ animation: 'macOriginIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER MODAL VUÔNG LIỀN MẠCH */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#f1f5f9] border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
              {t('Cấu Hình Quy Tắc Tính Toán Động & Tối Ưu Logic')}
              {masterInfo?.factoryName ? ` — [${masterInfo.factoryName}]` : ''}
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? t('Thu nhỏ') : t('Phóng to')}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors rounded-none cursor-pointer"
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              title={t('Đóng (Esc)')}
              className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-100 transition-colors rounded-none cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 2. THÔNG BÁO INLINE BANNER (NẠP XONG / XUẤT XONG / LỖI HIỂN THỊ TRỰC TIẾP TRÊN MODAL) */}
        {bannerNotice && (
          <div
            className={`px-3 py-2 border-b flex items-start justify-between gap-2 text-xs shrink-0 transition-all ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : bannerNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : bannerNotice.type === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              {bannerNotice.type === 'success' && (
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              )}
              {bannerNotice.type === 'error' && (
                <XCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              {bannerNotice.type === 'warning' && (
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              {bannerNotice.type === 'info' && (
                <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              )}

              <div className="min-w-0">
                {bannerNotice.title && (
                  <div className="font-bold text-[11.5px] leading-tight mb-0.5">
                    {bannerNotice.title}
                  </div>
                )}
                <div className="text-[11px] opacity-90 leading-tight">{bannerNotice.message}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
              title={t('Đóng thông báo')}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* 3. BODY LAYOUT: SIDEBAR TABS BÊN TRÁI + NỘI DUNG BÊN PHẢI */}
        <div className="flex-1 min-h-0 flex bg-white">
          {/* Sidebar Tabs */}
          <div className="w-56 border-r border-slate-200 bg-[#f8fafc] flex flex-col shrink-0 p-1.5 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-2.5 py-2 transition-all rounded-none flex items-start gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-xs text-blue-700 font-semibold'
                      : 'bg-transparent border-transparent text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    size={14}
                    className={`shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <div className="min-w-0">
                    <div className="text-[11.5px] leading-tight font-semibold">{tab.title}</div>
                    <div className="text-[9.5px] text-slate-400 truncate mt-0.5 leading-tight">
                      {tab.desc}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Thông tin mô tả hỗ trợ */}
            <div className="mt-auto p-2 border-t border-slate-200 bg-blue-50/50 text-[10.5px] text-slate-600 leading-tight">
              <div className="flex items-center gap-1 text-blue-700 font-semibold mb-1">
                <FileJson size={12} />
                <span>{t('Đồng bộ đa máy')}</span>
              </div>
              <p className="text-slate-500 text-[10px]">
                {t('Bạn có thể tải file cấu hình .json để chuyển sang các máy khác nhau.')}
              </p>
            </div>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 min-w-0 p-4 overflow-y-auto bg-white text-xs">
            {activeTab === 'shift' && (
              <div className="space-y-4">
                <div className="border border-slate-200 p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-800 text-[12px] mb-1 flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-600" />
                    <span>{t('Khung giờ chu kỳ 24h ngày KHSX')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    {t(
                      'Tự động xác định các lệnh thực hiện trong khung giờ hợp lệ của ca ngày KHSX. Ví dụ: từ 07:00 ngày Áp dụng đến 07:00 ngày tiếp theo.'
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('Giờ bắt đầu ca (0 - 23h)')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={rulesState.shift.startHour}
                        onChange={(e) =>
                          handleUpdate('shift', 'startHour', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('Phút bắt đầu ca (0 - 59p)')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={rulesState.shift.startMinute}
                        onChange={(e) =>
                          handleUpdate('shift', 'startMinute', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {t('Thời lượng chu kỳ đối soát (tiếng)')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={rulesState.shift.durationHours}
                      onChange={(e) =>
                        handleUpdate('shift', 'durationHours', parseInt(e.target.value, 10) || 24)
                      }
                      className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {t('Mặc định: 24 tiếng (kết thúc tại 07:00 ngày tiếp theo)')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'quantity' && (
              <div className="space-y-4">
                <div className="border border-slate-200 p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-800 text-[12px] mb-1 flex items-center gap-1.5">
                    <Percent size={13} className="text-blue-600" />
                    <span>{t('Dung sai và điều kiện khớp số lượng')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    {t(
                      'Quy tắc so sánh số lượng đạt thực tế với số lượng cần đạt và cần sản xuất theo kế hoạch.'
                    )}
                  </p>

                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {t('Dung sai phần trăm khớp số lượng (± %)')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={rulesState.quantity.tolerancePercent}
                        onChange={(e) =>
                          handleUpdate(
                            'quantity',
                            'tolerancePercent',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-32 h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                      <span className="text-slate-600 font-semibold">%</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <ErpSwitch
                      checked={rulesState.quantity.requireTargetRange}
                      onChange={(val) => handleUpdate('quantity', 'requireTargetRange', val)}
                      label={t('Khớp dải: Số lượng đạt nằm trong khoảng [Cần đạt -> Cần sản xuất]')}
                      hint={t('Nếu thỏa mãn điều kiện này, hệ thống sẽ đánh giá Khớp số lượng')}
                    />

                    <ErpSwitch
                      checked={rulesState.quantity.allowZeroQualifiedAsMissed}
                      onChange={(val) =>
                        handleUpdate('quantity', 'allowZeroQualifiedAsMissed', val)
                      }
                      label={t('Đánh giá sản lượng đạt = 0 là "Trượt KH"')}
                      hint={t(
                        'Lệnh có trong kế hoạch nhưng không có sản phẩm đạt nào được thống kê'
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status_dp' && (
              <div className="space-y-3">
                <div className="border border-slate-200 p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-800 text-[12px] mb-1 flex items-center gap-1.5">
                    <Tag size={13} className="text-blue-600" />
                    <span>{t('Tùy chỉnh nhãn Trạng thái Điều phối - Sản xuất (ĐP - SX)')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    {t('Các nhãn hiển thị trên cột "Trạng thái ĐP - SX" trong bảng KẾT QUẢ KHSX')}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('Khớp số lượng')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.coordinatorStatus.matchedQty}
                        onChange={(e) =>
                          handleUpdate('coordinatorStatus', 'matchedQty', e.target.value)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('Khớp job (chưa đủ SL)')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.coordinatorStatus.matchedJob}
                        onChange={(e) =>
                          handleUpdate('coordinatorStatus', 'matchedJob', e.target.value)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('Trượt kế hoạch (SL đạt = 0)')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.coordinatorStatus.missedPlan}
                        onChange={(e) =>
                          handleUpdate('coordinatorStatus', 'missedPlan', e.target.value)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('SX sai ngày KH / Ngoài KH')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.coordinatorStatus.outsidePlan}
                        onChange={(e) =>
                          handleUpdate('coordinatorStatus', 'outsidePlan', e.target.value)
                        }
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status_time_capa' && (
              <div className="space-y-3">
                {/* Trạng thái thời gian */}
                <div className="border border-slate-200 p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-800 text-[12px] mb-1">
                    {t('Nhãn Trạng thái Thời gian (TimeStatus)')}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                    {t(
                      'Logic: So sánh [Thời gian sản xuất thực tế] với [Thời gian sản xuất theo ĐM]. Tự động để trống nếu [Trạng thái ĐP-SX] là Trượt KH hoặc chưa có dữ liệu thời gian.'
                    )}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Thực tế > ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.timeStatus.slowLabel}
                        onChange={(e) => handleUpdate('timeStatus', 'slowLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Thực tế = ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.timeStatus.exactLabel}
                        onChange={(e) => handleUpdate('timeStatus', 'exactLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Thực tế < ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.timeStatus.fastLabel}
                        onChange={(e) => handleUpdate('timeStatus', 'fastLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Trạng thái Capa */}
                <div className="border border-slate-200 p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-800 text-[12px] mb-1">
                    {t('Nhãn Trạng thái Capa (CapaStatus)')}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                    {t(
                      'Logic: So sánh [Capa thực tế] với [Capa ĐM]. Tự động để trống nếu [Trạng thái ĐP-SX] là Trượt KH hoặc chưa có dữ liệu Capa/Thời gian.'
                    )}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Capa TT > Capa ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.capaStatus.slowLabel}
                        onChange={(e) => handleUpdate('capaStatus', 'slowLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Capa TT = Capa ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.capaStatus.exactLabel}
                        onChange={(e) => handleUpdate('capaStatus', 'exactLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-600 mb-1">
                        {t('Capa TT < Capa ĐM')}
                      </label>
                      <input
                        type="text"
                        value={rulesState.capaStatus.fastLabel}
                        onChange={(e) => handleUpdate('capaStatus', 'fastLabel', e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 text-xs rounded-none bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. FOOTER ACTIONS LIỀN MẠCH CHUẨN CODEHELP */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#f1f5f9] border-t border-slate-300 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-colors text-xs rounded-none cursor-pointer"
              title={t('Khôi phục cấu hình mặc định')}
            >
              <RotateCcw size={12} />
              <span>{t('Khôi phục mặc định')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadConfig}
              className="flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 transition-colors text-xs rounded-none cursor-pointer"
              title={t('Tải file cấu hình JSON xuống máy')}
            >
              <Download size={12} />
              <span>{t('Tải file cấu hình (.json)')}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors text-xs rounded-none cursor-pointer"
              title={t('Nạp file cấu hình JSON từ máy khác')}
            >
              <Upload size={12} />
              <span>{t('Nhập file cấu hình (.json)')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors text-xs rounded-none cursor-pointer"
            >
              {t('Đóng')}
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex items-center gap-1.5 px-3 py-1 text-white bg-blue-600 hover:bg-blue-700 transition-colors text-xs font-semibold rounded-none cursor-pointer shadow-xs"
            >
              <Check size={13} />
              <span>{t('Lưu & Áp Dụng')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
