/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  Columns,
  Sparkles,
  FileSpreadsheet,
  Check,
  RotateCcw
} from 'lucide-react'
import { Select } from 'antd'

/**
 * ExcelMappingModal - Modal Ánh Xạ Cột Excel
 * Phối màu & cấu trúc chuẩn 100% theo giao diện CodeHelp Modal (GenericCodeHelpModal) của hệ thống GsHub.
 * 1 khối bảng tính duy nhất (Full-width Sheet), 100% góc vuông phẳng (rounded-none).
 */
export default function ExcelMappingModal({
  isOpen = false,
  file,
  rawFile,
  targetTabId,
  fileType,
  tabTitle,
  matrixPreview,
  rawMatrix = [],
  detectedHeaderRow = 0,
  initialHeaderRow = 0,
  detectedDataStartRow = 1,
  initialDataStartRow = 1,
  availableSchema = [],
  initialMapping = {},
  initialMappings = {},
  onConfirm,
  onClose,
  onCancel
}) {
  const { t } = useTranslation()

  // Đồng bộ props linh hoạt
  const effectiveFile = file || rawFile
  const effectiveTabId = targetTabId || fileType || ''
  const effectiveMatrix =
    matrixPreview && matrixPreview.length > 0 ? matrixPreview : rawMatrix || []
  const effectiveHeaderRow = initialHeaderRow ?? detectedHeaderRow ?? 0
  const effectiveDataStartRow =
    initialDataStartRow ?? detectedDataStartRow ?? effectiveHeaderRow + 1
  const effectiveInitialMapping = initialMapping || initialMappings || {}
  const handleClose = onClose || onCancel

  const [isMaximized, setIsMaximized] = useState(false)
  const [headerRowIdx, setHeaderRowIdx] = useState(effectiveHeaderRow)
  const [dataStartRowIdx, setDataStartRowIdx] = useState(effectiveDataStartRow)
  const [columnMappings, setColumnMappings] = useState(effectiveInitialMapping)

  // Cập nhật khi mở modal
  useEffect(() => {
    if (isOpen) {
      setHeaderRowIdx(effectiveHeaderRow)
      setDataStartRowIdx(effectiveDataStartRow)
      setColumnMappings(effectiveInitialMapping || {})
      setIsMaximized(false)
    }
  }, [isOpen, effectiveHeaderRow, effectiveDataStartRow]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phím tắt bàn phím toàn cục
  useEffect(() => {
    if (!isOpen) return
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose && handleClose()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true)
  }, [isOpen, handleClose])

  // Trích xuất dòng Header đang chọn
  const rawHeaderRow = useMemo(() => {
    return Array.isArray(effectiveMatrix[headerRowIdx]) ? effectiveMatrix[headerRowIdx] : []
  }, [effectiveMatrix, headerRowIdx])

  const maxCols = useMemo(() => {
    let max = rawHeaderRow.length
    effectiveMatrix.slice(0, 30).forEach((r) => {
      if (Array.isArray(r)) max = Math.max(max, r.length)
    })
    return max
  }, [effectiveMatrix, rawHeaderRow])

  // Tự động map cột dựa trên tên tiêu đề
  const autoMatchColumns = () => {
    const newMappings = {}
    for (let c = 0; c < maxCols; c++) {
      const headerTitle = String(rawHeaderRow[c] || '')
        .trim()
        .toLowerCase()
      if (!headerTitle) continue

      const matched = availableSchema.find((s) => {
        const sLower = s.title.toLowerCase()
        return (
          sLower === headerTitle ||
          (sLower.includes(headerTitle) && headerTitle.length >= 3) ||
          (headerTitle.includes(sLower) && sLower.length >= 3)
        )
      })

      if (matched) {
        newMappings[c] = matched.key
      } else {
        newMappings[c] = `CUSTOM_${c}`
      }
    }
    setColumnMappings(newMappings)
  }

  // Chạy tự động khớp khi đổi Header Row
  useEffect(() => {
    if (isOpen && effectiveMatrix.length > 0) {
      autoMatchColumns()
    }
  }, [headerRowIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMappingChange = (colIndex, targetKey) => {
    setColumnMappings((prev) => ({
      ...prev,
      [colIndex]: targetKey
    }))
  }

  const handleApply = () => {
    onConfirm?.({
      tabId: effectiveTabId,
      file: effectiveFile,
      headerRowIndex: headerRowIdx,
      dataStartRowIndex: dataStartRowIdx,
      columnMappings
    })
  }

  if (!isOpen) return null

  // Chuyển chỉ số cột 0, 1, 2 sang A, B, C
  const getColLetter = (index) => {
    let letter = ''
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter
      index = Math.floor(index / 26) - 1
    }
    return letter
  }

  // Đếm số lượng cột đã khớp hợp lệ
  const mappedCount = Object.values(columnMappings).filter(
    (key) => key && !key.startsWith('CUSTOM_') && key !== '__IGNORE__'
  ).length

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[99999] select-none transition-[padding] duration-200 ease-out ${
        isMaximized ? 'p-0' : 'p-3 sm:p-5'
      }`}
      style={{ animation: 'macBackdropFade 0.15s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose && handleClose()
        }
      }}
    >
      <style>{`
        @keyframes macBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes macOriginIn {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* KHUNG DIALOG VUÔNG CHUẨN CODEHELP GSHUB */}
      <div
        className={`bg-[#f8fafc] flex flex-col shadow-2xl border border-slate-500 font-sans rounded-none select-none transition-[width,height,max-width,max-height,transform] duration-200 ease-out transform-gpu will-change-[width,height,transform] ${
          isMaximized
            ? 'w-full h-full max-w-full max-h-full border-0'
            : 'w-[94vw] max-w-[1360px] h-[86vh] max-h-[800px] min-h-[480px]'
        }`}
        style={{ animation: 'macOriginIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER DIALOG VUÔNG LIỀN MẠCH CHUẨN CODEHELP */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#f1f5f9] border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
              {t('Cấu Hình Dòng Tiêu Đề & Ánh Xạ Cột Excel')}
              {tabTitle ? ` — [${tabTitle}]` : ''}
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

        {/* 2. TOOLBAR TÍCH HỢP CHUẨN CODEHELP */}
        <div className="bg-white border-b border-slate-300 flex items-center justify-between px-3 py-1.5 shrink-0 text-xs">
          <div className="flex items-center gap-5">
            {/* Dòng Tiêu Đề */}
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                <Columns size={13} className="text-blue-600" />
                <span>{t('Dòng Tiêu Đề:')}</span>
              </span>
              <div className="flex items-center border border-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-none">
                <input
                  type="number"
                  min={1}
                  max={Math.min(30, effectiveMatrix.length || 30)}
                  value={headerRowIdx + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1
                    const idx = Math.max(0, val - 1)
                    setHeaderRowIdx(idx)
                    if (dataStartRowIdx <= idx) {
                      setDataStartRowIdx(idx + 1)
                    }
                  }}
                  className="w-8 text-center font-bold text-blue-700 bg-transparent outline-none text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500">dòng</span>
              </div>
            </div>

            {/* Dòng Bắt Đầu Data */}
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                <TableIcon size={13} className="text-emerald-600" />
                <span>{t('Dòng Bắt Đầu Data:')}</span>
              </span>
              <div className="flex items-center border border-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-none">
                <input
                  type="number"
                  min={headerRowIdx + 2}
                  max={Math.min(50, effectiveMatrix.length || 50)}
                  value={dataStartRowIdx + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || headerRowIdx + 2
                    setDataStartRowIdx(Math.max(headerRowIdx + 1, val - 1))
                  }}
                  className="w-8 text-center font-bold text-emerald-700 bg-transparent outline-none text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500">dòng</span>
              </div>
            </div>

            {/* Nút Tự Động Khớp */}
            <button
              type="button"
              onClick={autoMatchColumns}
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 outline-none cursor-pointer rounded-none flex items-center gap-1 select-none transition-colors"
            >
              <Sparkles size={12} className="text-blue-600" />
              <span>{t('Tự Động Khớp Lại Cột')}</span>
            </button>
          </div>

          {/* Thống kê cột CodeHelp */}
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span>
              Tổng cột: <b className="text-slate-800 font-mono">{maxCols}</b>
            </span>
            <span>•</span>
            <span>
              Đã khớp: <b className="text-blue-700 font-mono">{mappedCount}</b>
            </span>
            <span>•</span>
            <span>
              Cột tự do: <b className="text-slate-700 font-mono">{maxCols - mappedCount}</b>
            </span>
          </div>
        </div>

        {/* 3. BẢNG DỮ LIỆU SHEET FULL-WIDTH CHUẨN CODEHELP */}
        <div className="flex-1 w-full relative bg-white overflow-auto border-b border-slate-300 min-h-0">
          <table className="w-full border-collapse text-xs font-sans">
            <thead>
              {/* TẦNG 1: KÝ TỰ CỘT (A, B, C...) & TRẠNG THÁI KHỚP */}
              <tr className="bg-[#f1f5f9] sticky top-0 z-30 border-b border-slate-300 text-slate-700 text-xs select-none">
                <th className="p-1 border-r border-slate-300 text-center w-12 bg-[#e2e8f0] sticky left-0 z-40 font-bold">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, c) => {
                  const colLetter = getColLetter(c)
                  const currentMapped = columnMappings[c] || `CUSTOM_${c}`
                  const isMatched =
                    currentMapped &&
                    !currentMapped.startsWith('CUSTOM_') &&
                    currentMapped !== '__IGNORE__'
                  const isIgnored = currentMapped === '__IGNORE__'

                  return (
                    <th
                      key={c}
                      className="p-1.5 border-r border-slate-300 text-center font-mono min-w-[200px] max-w-[260px] bg-[#f1f5f9]"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="font-bold text-slate-800 text-xs">{colLetter}</span>
                        {isMatched ? (
                          <span className="text-[10px] font-semibold text-blue-700 flex items-center gap-0.5">
                            <Check size={11} className="stroke-[2.5]" />
                            <span>Khớp</span>
                          </span>
                        ) : isIgnored ? (
                          <span className="text-[10px] font-normal text-slate-400">Bỏ qua</span>
                        ) : (
                          <span className="text-[10px] font-normal text-slate-500">Tự do</span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>

              {/* TẦNG 2: DROPDOWN ÁNH XẠ CSDL CHUẨN ANT DESIGN TRONG CODEHELP */}
              <tr className="bg-white sticky top-[30px] z-30 border-b border-slate-300 shadow-2xs">
                <th className="p-1 border-r border-slate-300 text-center text-[10px] font-bold text-slate-500 bg-[#f1f5f9] sticky left-0 z-40 uppercase">
                  Ánh xạ
                </th>
                {Array.from({ length: maxCols }).map((_, c) => {
                  const currentMapped = columnMappings[c] || `CUSTOM_${c}`

                  return (
                    <th
                      key={c}
                      className="p-1 border-r border-slate-300 bg-white min-w-[200px] max-w-[260px]"
                    >
                      <Select
                        size="small"
                        value={currentMapped}
                        onChange={(val) => handleMappingChange(c, val)}
                        className="w-full text-xs rounded-none font-normal"
                        popupMatchSelectWidth={false}
                        options={[
                          { label: t('-- Bỏ qua cột này --'), value: '__IGNORE__' },
                          { label: t('-- Cột mở rộng (Tự do) --'), value: `CUSTOM_${c}` },
                          ...availableSchema.map((s) => ({
                            label: `${s.title} (${s.key})`,
                            value: s.key
                          }))
                        ]}
                      />
                    </th>
                  )
                })}
              </tr>

              {/* TẦNG 3: TIÊU ĐỀ TRONG FILE EXCEL */}
              <tr className="bg-[#f8fafc] sticky top-[64px] z-30 border-b-2 border-slate-300 text-slate-800 text-xs">
                <th className="p-1 border-r border-slate-300 text-center text-[10px] font-bold text-blue-700 bg-blue-50 sticky left-0 z-40 uppercase">
                  Tiêu đề
                </th>
                {Array.from({ length: maxCols }).map((_, c) => {
                  const headerTitle = String(rawHeaderRow[c] || '').trim() || `(Trống)`

                  return (
                    <th
                      key={c}
                      className="p-1.5 border-r border-slate-300 text-left font-bold text-slate-800 bg-[#f8fafc] min-w-[200px] max-w-[260px] truncate"
                      title={headerTitle}
                    >
                      <div className="truncate text-xs">{headerTitle}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* THÂN BẢNG: LƯỚI Ô TÍNH CHUẨN CODEHELP THEME */}
            <tbody>
              {effectiveMatrix.slice(0, 60).map((row, rIdx) => {
                const isHeader = rIdx === headerRowIdx
                const isDataStart = rIdx === dataStartRowIdx
                const isDataRow = rIdx >= dataStartRowIdx

                return (
                  <tr
                    key={rIdx}
                    className={`border-b border-slate-200 transition-colors ${
                      isHeader
                        ? 'bg-[#eef6ff] font-bold text-blue-950'
                        : isDataStart
                          ? 'bg-[#ecfdf5] font-semibold text-emerald-950'
                          : isDataRow
                            ? rIdx % 2 === 1
                              ? 'bg-[#f8fafc] hover:bg-[#eef6ff]/60 text-slate-800'
                              : 'bg-white hover:bg-[#eef6ff]/60 text-slate-800'
                            : 'bg-slate-50/50 text-slate-400 italic'
                    }`}
                  >
                    {/* Cột số thứ tự dòng */}
                    <td
                      className={`p-1 border-r border-slate-300 text-center text-[10px] font-mono select-none sticky left-0 z-20 ${
                        isHeader
                          ? 'bg-[#dbeafe] text-blue-900 font-bold'
                          : isDataStart
                            ? 'bg-[#d1fae5] text-emerald-900 font-bold'
                            : 'bg-[#f1f5f9] text-slate-500'
                      }`}
                    >
                      <span>{rIdx + 1}</span>
                      {isHeader && (
                        <span className="block text-[8px] text-blue-700 leading-none">HEADER</span>
                      )}
                      {isDataStart && (
                        <span className="block text-[8px] text-emerald-700 leading-none">DATA</span>
                      )}
                    </td>

                    {/* Các ô dữ liệu Excel */}
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-1.5 border-r border-slate-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[260px] font-mono text-xs"
                        title={String(row?.[cIdx] || '')}
                      >
                        {String(row?.[cIdx] || '')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 4. FOOTER DIALOG CHUẨN 100% CODEHELP MODAL */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#f8fafc] border-t border-slate-300 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-slate-500 shrink-0" />
            <span>
              Tệp: <strong className="text-slate-800">{effectiveFile?.name || 'File Excel'}</strong>
            </span>
            {effectiveFile?.size && (
              <span className="text-slate-400 text-xs font-mono">
                ({(effectiveFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#1677ff] hover:bg-[#0958d9] text-white font-semibold text-xs rounded-none shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#1677ff]"
            >
              <Check size={13} className="stroke-[2.5]" />
              {t('Áp dụng')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-none border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              {t('Đóng')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
