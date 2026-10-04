/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader2, AlertCircle } from 'lucide-react'

const STORAGE_KEY_LAST_DIR = 'ERP_EXCEL_LAST_EXPORT_DIR'

// Custom Switch Toggle phong cách ERP: Nút gạt bên TRÁI, chữ bên PHẢI
function ErpSwitch({ checked, onChange, disabled = false, label, hint }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-1 select-none transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-slate-400'
          : 'cursor-pointer text-slate-800 hover:text-slate-950'
      }`}
      onClick={(e) => {
        e.preventDefault()
        if (!disabled) onChange?.(!checked)
      }}
    >
      {/* Nút Switch bên trái */}
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

      {/* Nhãn chữ bên phải */}
      <div className="flex-1 min-w-0">
        <span className="text-[12.5px] font-normal leading-tight block text-slate-800">
          {label}
        </span>
        {hint && <span className="text-[10.5px] text-slate-400 block leading-tight">{hint}</span>}
      </div>
    </div>
  )
}

export default function ExportExcelModal({
  isOpen = false,
  onClose,
  title,
  reportName = 'Báo cáo thống kê sản xuất',
  totalRows = 0,
  loadedCount = 0,
  selectedCount = 0,
  columns = [],
  activeFilters = {},
  defaultFileName = '',
  onConfirmExport
}) {
  const { t } = useTranslation()
  const modalRef = useRef(null)

  // File name without extension
  const [baseFileName, setBaseFileName] = useState('')
  const [saveDirectory, setSaveDirectory] = useState('')

  // Tùy chọn kết xuất: 'selected' | 'loaded' | 'all'
  const [exportScope, setExportScope] = useState('all')

  const [isExporting, setIsExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Kiểm tra môi trường Electron Desktop
  const isElectron = Boolean(window?.electron?.selectDirectory)

  // Load initial settings
  useEffect(() => {
    if (!isOpen) return

    const sanitizedBase = (
      defaultFileName ||
      `BCTKSX_${reportName.replace(/[\s/\\:*?"<>|]+/g, '_')}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
    ).replace(/\.[a-zA-Z0-9]+$/, '')

    setBaseFileName(sanitizedBase)
    setExportScope('all')
    setIsExporting(false)
    setErrorMsg('')

    // Load saved directory from localStorage or Electron default download folder
    const savedDir = localStorage.getItem(STORAGE_KEY_LAST_DIR)
    if (savedDir && savedDir.trim()) {
      setSaveDirectory(savedDir.trim())
    } else if (window?.electron?.getDefaultDownloadPath) {
      window.electron
        .getDefaultDownloadPath()
        .then((p) => {
          if (p && typeof p === 'string') {
            setSaveDirectory(p.trim())
            localStorage.setItem(STORAGE_KEY_LAST_DIR, p.trim())
          }
        })
        .catch(() => {})
    }
  }, [isOpen, defaultFileName, reportName, totalRows, selectedCount])

  // Cột xuất
  const exportableCols = useMemo(() => {
    return (columns || []).filter(
      (c) =>
        c.id !== 'WorkingTag' &&
        c.id !== 'isEdited' &&
        c.id !== 'Id' &&
        c.id !== 'IdRow' &&
        c.id !== 'IdSeq' &&
        c.id !== 'RowVersion' &&
        c.visible !== false
    )
  }, [columns])

  // Format breadcrumb path: D: » GoldSun » DATA_GS » 2809 » GS51B (Desktop) hoặc Downloads (Web)
  const formattedBreadcrumb = useMemo(() => {
    if (!isElectron) return 'Trình duyệt Web » Tải về mặc định (Downloads)'
    if (!saveDirectory) return 'C: » Downloads'
    return saveDirectory.replace(/\\/g, '/').split('/').filter(Boolean).join(' » ')
  }, [saveDirectory, isElectron])

  // Số lượng dòng sẽ xuất thực tế theo lựa chọn
  const targetRowCount = useMemo(() => {
    if (exportScope === 'all') return totalRows || loadedCount
    if (exportScope === 'selected') return selectedCount || 1
    return loadedCount
  }, [exportScope, totalRows, loadedCount, selectedCount])

  // Browse directory: Chỉ hoạt động trên Electron Desktop
  const handleBrowseDirectory = async () => {
    if (!isElectron) return
    try {
      if (window?.electron?.selectDirectory) {
        const selected = await window.electron.selectDirectory(saveDirectory)
        if (selected && typeof selected === 'string' && selected.trim()) {
          setSaveDirectory(selected.trim())
          localStorage.setItem(STORAGE_KEY_LAST_DIR, selected.trim())
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Lỗi khi duyệt thư mục:', err)
      }
    }
  }

  // Handle Execute Export
  const handleExecute = async () => {
    if (!baseFileName.trim()) {
      setErrorMsg(t('Vui lòng nhập tên file kết xuất!'))
      return
    }

    setIsExporting(true)
    setErrorMsg('')
    try {
      const fullFileName = `${baseFileName.trim()}.xlsx`
      if (saveDirectory) {
        localStorage.setItem(STORAGE_KEY_LAST_DIR, saveDirectory.trim())
      }

      await onConfirmExport?.({
        scope: exportScope,
        fileName: fullFileName,
        saveDirectory: isElectron ? saveDirectory.trim() : '',
        includeHeaders: true,
        exportableCols,
        targetRowCount,
        selectedFormat: 'xlsx'
      })

      onClose?.()
    } catch (err) {
      console.error('Lỗi khi kết xuất file:', err)
      setErrorMsg(err?.message || t('Lỗi không xác định khi kết xuất file'))
    } finally {
      setIsExporting(false)
    }
  }

  // Hotkeys
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isExporting) {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'Enter' && !isExporting && e.target.tagName !== 'BUTTON') {
        e.preventDefault()
        handleExecute()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, isExporting, baseFileName, saveDirectory, exportScope, targetRowCount])

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4 select-none animate-in fade-in duration-100 font-sans">
      {/* Modal Dialog Chuẩn phong cách phần mềm Desktop ERP - Gọn gàng chuyên biệt xuất Excel */}
      <div
        ref={modalRef}
        className="w-full max-w-[580px] bg-white rounded-[2px] border border-[#7ba4c9] shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Cửa sổ: Chỉ để chữ tiêu đề và nút ✕ đóng */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#f5f8fa] border-b border-[#d0dbe5] select-none">
          <span className="text-[13px] font-medium text-slate-800">
            {t('Kết xuất')} / {reportName || title || t('Báo cáo thống kê sản xuất')}
          </span>

          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1 hover:bg-rose-500 hover:text-white rounded text-slate-600 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* 2. Thân Modal - Bố cục trực diện chuyên biệt cho xuất Excel */}
        <div className="p-4 space-y-4 bg-white">
          {/* PHẦN 1: ĐƯỜNG DẪN KẾT XUẤT */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[#0088cc] uppercase tracking-wide">
                {t('ĐƯỜNG DẪN KẾT XUẤT')}
              </h4>
            </div>

            {/* Dòng đường dẫn breadcrumb: D: » GoldSun » DATA_GS » ... */}
            <div
              onClick={isElectron ? handleBrowseDirectory : undefined}
              className={`text-[12px] text-slate-600 truncate font-sans py-0.5 ${
                isElectron
                  ? 'cursor-pointer hover:text-[#0088cc] transition-colors'
                  : 'cursor-default'
              }`}
              title={
                isElectron
                  ? t('Nhấp để đổi thư mục lưu')
                  : t('Trên Web, file sẽ tự động tải về thư mục Downloads')
              }
            >
              {formattedBreadcrumb}
            </div>

            {/* Ô nhập tên file lớn viền xanh, chữ .XLSX bên phải, nút ... */}
            <div className="flex items-center border border-[#0088cc] rounded-[2px] bg-white overflow-hidden shadow-2xs">
              <input
                type="text"
                value={baseFileName}
                onChange={(e) => setBaseFileName(e.target.value)}
                disabled={isExporting}
                className="flex-1 px-3 py-1.5 text-[15px] font-normal text-[#005580] outline-none bg-transparent"
                placeholder="BCTKSX_GS51B_28"
              />
              <span className="px-3 text-[15px] font-bold text-[#b0c8dc] select-none tracking-wide">
                .XLSX
              </span>
              {isElectron && (
                <button
                  type="button"
                  onClick={handleBrowseDirectory}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 border-l border-[#0088cc] text-slate-600 hover:bg-[#f0f8ff] hover:text-[#0088cc] font-bold text-sm transition-colors shrink-0 cursor-pointer"
                  title={t('Duyệt thư mục lưu file...')}
                >
                  ...
                </button>
              )}
            </div>
          </div>

          {/* PHẦN 2: TÙY CHỌN KẾT XUẤT & PHẠM VI DỮ LIỆU */}
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-0.5 border-b border-[#f0f4f8]">
                <h4 className="text-[13px] font-semibold text-[#0088cc] uppercase tracking-wide">
                  {t('TÙY CHỌN KẾT XUẤT')}
                </h4>
                <span className="text-[11.5px] text-slate-500">
                  {exportableCols.length} {t('cột dữ liệu')}
                </span>
              </div>

              {/* Danh sách 3 switch tùy chọn phạm vi */}
              <div className="space-y-2 pt-1">
                <ErpSwitch
                  checked={exportScope === 'selected'}
                  onChange={(val) => setExportScope(val ? 'selected' : 'all')}
                  label={t('Kết xuất các dòng đã chọn')}
                  hint={
                    selectedCount > 0
                      ? `(${selectedCount.toLocaleString('vi-VN')} dòng được chọn)`
                      : ''
                  }
                  disabled={selectedCount === 0}
                />

                <ErpSwitch
                  checked={exportScope === 'loaded'}
                  onChange={(val) => setExportScope(val ? 'loaded' : 'all')}
                  label={t('Kết xuất dữ liệu đang xem')}
                  hint={`(${loadedCount.toLocaleString('vi-VN')} dòng đang hiển thị trên bảng)`}
                />

                <ErpSwitch
                  checked={exportScope === 'all'}
                  onChange={(val) => setExportScope(val ? 'all' : 'loaded')}
                  label={t('Kết xuất toàn bộ dữ liệu báo cáo')}
                  hint={`(${(totalRows || loadedCount).toLocaleString('vi-VN')} dòng theo điều kiện tìm kiếm)`}
                />
              </div>
            </div>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[2px]">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 3. Thanh nút bấm dưới đáy: Nằm ở BÊN PHẢI [ ▶ Bắt đầu thực hiện ] [ Thoát ra ] */}
        <div className="flex items-center justify-end px-3.5 py-2.5 bg-[#f4f7fa] border-t border-[#d0dbe5] select-none gap-2">
          {/* Nút Bắt đầu thực hiện: viền xanh #0088cc, icon ▶ tam giác xanh lá */}
          <button
            type="button"
            onClick={handleExecute}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-white hover:bg-[#e8f4fc] active:bg-[#d8ecf8] text-slate-800 border border-[#0088cc] rounded-[2px] text-xs font-normal transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {isExporting ? (
              <>
                <Loader2 size={12} className="animate-spin text-[#0088cc]" />
                <span>{t('Đang thực hiện...')}</span>
              </>
            ) : (
              <>
                <span className="text-[#107c41] font-black text-[11px]">▶</span>
                <span className="font-medium text-slate-800">{t('Bắt đầu thực hiện')}</span>
              </>
            )}
          </button>

          {/* Nút Thoát ra: nền trắng, viền xám nhẹ */}
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-[#c0d0e0] rounded-[2px] text-xs font-normal transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {t('Thoát ra')}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
