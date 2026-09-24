/* eslint-disable react/prop-types */
import {
  Search,
  FileSpreadsheet,
  BetweenHorizontalStart,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useTranslation } from 'react-i18next'
import { getNow_yyyymmdd_hhmmss } from '../../../../utils/getToday_yyyymmdd_hhmmss'
import { usePageData } from '../../../../context/PageDataContext'
import { useTableClipboard, writeClipboardNativeOrWeb } from '../../../hooks/useTableClipboard'
import { useOpenInNewWindow } from '../../../hooks/useOpenInNewWindow'

const LayoutContextMenuSheet = ({
  showMenu,
  setShowSearch,
  setShowMenu,
  data = [],
  handleRowAppend,
  cols = [],
  selection = null,
  canCreate = true
}) => {
  const { t } = useTranslation()
  const { openInNewWindow } = useOpenInNewWindow()
  const { pageData, setStatusMessage } = usePageData() || {}
  const selectionStats = pageData?.selectionStats
  const rawSelectedCount = selectionStats?.selectedRowsCount || 1
  const selectedRowsCount = Math.min(2000, Math.max(1, rawSelectedCount))

  if (!showMenu) return null

  const rowIdx = showMenu?.row
  const rowData = rowIdx !== undefined && Array.isArray(data) ? data[rowIdx] : null
  const hasError = rowData?.Status === 'E' || Boolean(rowData?.ErrorMessage || rowData?.Error)
  const errorMessage =
    rowData?.ErrorMessage ||
    rowData?.Error ||
    (rowData?.Status === 'E' ? t('Dòng này đang gặp lỗi khi cập nhật!') : '')

  const exportExcel = () => {
    const filteredData = (data || []).filter((row) => row && row.Status !== 'AA')
    if (filteredData.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất file Excel!') })
      }
      return
    }

    const exportCols = (cols || [])
      .filter((col) => col.visible !== false || col.id === 'Status')
      .map((col) => ({
        key: col.id,
        header: col.title || col.id
      }))

    const formattedData = filteredData.map((row) => {
      const newRow = {}
      exportCols.forEach((col) => {
        newRow[col.header] = row[col.key] !== undefined ? row[col.key] : ''
      })
      return newRow
    })

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const filename = `DATA_EXPORT_${getNow_yyyymmdd_hhmmss()}.xlsx`
    saveAs(blob, filename)
    if (setStatusMessage) {
      setStatusMessage({ type: 'success', text: t('Đã xuất file Excel thành công!') })
    }
    setShowMenu(null)
  }

  const { copySelection } = useTableClipboard({
    gridData: data,
    cols,
    selection
  })

  // Tính toán vị trí menu tránh tràn màn hình
  const menuWidth = 280
  const menuHeight = 360
  const posX = showMenu.bounds?.x ?? showMenu.x ?? 0
  const posY = showMenu.bounds?.y ?? showMenu.y ?? 0
  const clampedX =
    posX + menuWidth > window.innerWidth ? Math.max(8, window.innerWidth - menuWidth - 8) : posX
  const clampedY =
    posY + menuHeight > window.innerHeight ? Math.max(8, window.innerHeight - menuHeight - 8) : posY

  return (
    <div
      style={{
        position: 'fixed',
        left: clampedX,
        top: clampedY,
        zIndex: 9999
      }}
      className="w-72 bg-white border border-slate-300 shadow-2xl rounded-none py-1 text-xs select-none font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Mở trang trong cửa sổ mới */}
      <div
        onClick={() => {
          openInNewWindow()
          setShowMenu(null)
        }}
        className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
      >
        <div className="flex items-center gap-2">
          <ExternalLink size={14} className="text-blue-600 shrink-0" />
          <span className="font-medium">{t('Mở trong cửa sổ mới')}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+N</span>
      </div>

      {/* 2. Tìm kiếm mặc định của Table */}
      {setShowSearch && (
        <div
          onClick={() => {
            setShowSearch(true)
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
        >
          <Search size={14} className="text-blue-600 shrink-0" />
          <span className="font-medium">{t('Tìm kiếm')}</span>
        </div>
      )}

      {/* 3. Sao chép ô / dòng đã chọn */}
      <div
        onClick={() => {
          if (copySelection) {
            copySelection(false)
          }
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
      >
        <Copy size={14} className="text-indigo-600 shrink-0" />
        <span className="font-medium">{t('Sao chép dữ liệu')}</span>
      </div>

      {/* 4. Sao chép kèm tiêu đề cột */}
      <div
        onClick={() => {
          if (copySelection) {
            copySelection(true)
          }
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
      >
        <Copy size={14} className="text-indigo-600 shrink-0" />
        <span className="font-medium">{t('Sao chép kèm tiêu đề')}</span>
      </div>

      {/* 5. Xuất file Excel (.xlsx) chuẩn ERP */}
      <div
        onClick={() => exportExcel()}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
      >
        <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
        <span className="font-medium">{t('Xuất file Excel (.xlsx)')}</span>
      </div>

      {/* 5. Chèn hàng (giới hạn max 2000 dòng - kiểm soát theo phân quyền canCreate) */}
      {handleRowAppend && canCreate !== false && (
        <div
          onClick={() => {
            if (canCreate === false) {
              if (setStatusMessage) {
                setStatusMessage({
                  type: 'warning',
                  text: t('Bạn không có quyền thêm dữ liệu trên trang này!')
                })
              }
              setShowMenu(null)
              return
            }
            const count = selectedRowsCount > 0 ? selectedRowsCount : 1
            handleRowAppend(count)
            if (setStatusMessage) {
              setStatusMessage({
                type: 'success',
                text: t('Đã chèn {{count}} hàng!', { count })
              })
            }
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
        >
          <BetweenHorizontalStart size={14} className="text-blue-600 shrink-0" />
          <span className="font-medium">
            {selectedRowsCount > 1
              ? t('Chèn {{count}} hàng', { count: selectedRowsCount })
              : t('Chèn hàng')}
          </span>
        </div>
      )}

      {/* 6. Xem tin nhắn lỗi (nếu có lỗi trên dòng) */}
      {hasError && (
        <div
          onClick={() => {
            if (setStatusMessage) {
              setStatusMessage({
                type: 'error',
                text: errorMessage || t('Đã xảy ra lỗi trên dòng này!')
              })
            }
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-50 text-rose-700 rounded-none cursor-pointer transition-colors font-medium"
        >
          <AlertTriangle size={14} className="text-rose-600 shrink-0" />
          <span>{t('Xem tin nhắn lỗi')}</span>
        </div>
      )}

      {/* Đường kẻ phân cách */}
      <div className="my-1 border-t border-slate-200" />

      {/* 7. Danh sách công thức tính toán theo vùng chọn chuẩn Excel */}
      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 border-b border-slate-100 flex items-center justify-between">
        <span>{t('Thống kê')}</span>
      </div>

      <div className="flex flex-col py-0.5 text-[11.5px] text-slate-800">
        {/* Đếm ô (Count) */}
        <div
          onClick={() => {
            if (selectionStats?.count !== undefined) {
              writeClipboardNativeOrWeb(String(selectionStats.count))
              if (setStatusMessage) {
                setStatusMessage({
                  type: 'success',
                  text: t('Đã sao chép: {{val}}', { val: selectionStats.count })
                })
              }
            }
          }}
          className="flex items-center justify-between px-2.5 py-1 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
          title={t('Bấm để sao chép giá trị')}
        >
          <span className="text-slate-800">{t('Đếm (Count):')}</span>
          <span className="font-semibold text-slate-900">
            {(selectionStats?.count || 0).toLocaleString('en-US')}
          </span>
        </div>

        {/* Vùng chọn Dòng x Cột */}
        <div className="flex items-center justify-between px-2.5 py-1 text-slate-800">
          <span className="text-slate-800">{t('Vùng chọn (R × C):')}</span>
          <span className="font-semibold text-slate-900">
            {(selectionStats?.selectedRowsCount || 0).toLocaleString('en-US')} ×{' '}
            {(selectionStats?.selectedColsCount || 0).toLocaleString('en-US')}
          </span>
        </div>

        {/* Tổng (Sum) */}
        {selectionStats?.hasNumericStats && (
          <>
            <div
              onClick={() => {
                writeClipboardNativeOrWeb(String(selectionStats.sum))
                if (setStatusMessage) {
                  setStatusMessage({
                    type: 'success',
                    text: t('Đã sao chép: {{val}}', { val: selectionStats.sum })
                  })
                }
              }}
              className="flex items-center justify-between px-2.5 py-1 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
              title={t('Bấm để sao chép giá trị')}
            >
              <span className="text-slate-800 font-semibold">{t('Tổng (Sum):')}</span>
              <span className="font-bold text-slate-900">
                {selectionStats.sum.toLocaleString('en-US')}
              </span>
            </div>

            {/* Trung bình (Average) */}
            {selectionStats.numericCount > 1 && (
              <div
                onClick={() => {
                  const avg = Number(selectionStats.average.toFixed(2))
                  writeClipboardNativeOrWeb(String(avg))
                  if (setStatusMessage) {
                    setStatusMessage({
                      type: 'success',
                      text: t('Đã sao chép: {{val}}', { val: avg })
                    })
                  }
                }}
                className="flex items-center justify-between px-2.5 py-1 hover:bg-slate-100 rounded-none cursor-pointer transition-colors text-slate-800"
                title={t('Bấm để sao chép giá trị')}
              >
                <span className="text-slate-800">{t('Trung bình (Avg):')}</span>
                <span className="font-semibold text-slate-900">
                  {Number(selectionStats.average.toFixed(2)).toLocaleString('en-US')}
                </span>
              </div>
            )}

            {/* Nhỏ nhất & Lớn nhất */}
            {selectionStats.numericCount > 1 && (
              <div className="flex items-center justify-between px-2.5 py-1 text-slate-800">
                <span className="text-slate-800">{t('Min / Max:')}</span>
                <span className="font-semibold text-slate-900">
                  {selectionStats.min.toLocaleString('en-US')} /{' '}
                  {selectionStats.max.toLocaleString('en-US')}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LayoutContextMenuSheet
