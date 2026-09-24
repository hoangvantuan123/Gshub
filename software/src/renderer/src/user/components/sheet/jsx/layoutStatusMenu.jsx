import { useState } from 'react'
import {
  Search,
  RotateCcw,
  Undo,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Plus,
  Settings,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { Button, InputNumber, Space } from 'antd'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useTranslation } from 'react-i18next'
import { getNow_yyyymmdd_hhmmss } from '../../../../utils/getToday_yyyymmdd_hhmmss'
import { usePageData } from '../../../../context/PageDataContext'

const LayoutStatusMenuSheet = ({
  showMenu,
  setShowSearch,
  setShowMenu,
  showDrawer,
  handleReset,
  data = [],
  handleRestSheet,
  handleRowAppend,
  cols = []
}) => {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [inputValue, setInputValue] = useState(1)

  if (!showMenu) return null

  // 1. Export CSV
  const exportCSV = () => {
    const filteredData = (data || []).filter(
      (row) => row && row.WorkingTag !== 'AA' && row.Status !== 'AA'
    )
    if (filteredData.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất file CSV!') })
      }
      return
    }

    const exportCols = (cols || [])
      .filter((col) => col.visible !== false || col.id === 'WorkingTag' || col.id === 'Status')
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
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const filename = `DATA_EXPORT_${getNow_yyyymmdd_hhmmss()}.csv`
    saveAs(blob, filename)
    if (setStatusMessage) {
      setStatusMessage({ type: 'success', text: t('Đã xuất file CSV thành công!') })
    }
    setShowMenu(null)
  }

  // 2. Export Excel
  const exportExcel = () => {
    const filteredData = (data || []).filter(
      (row) => row && row.WorkingTag !== 'AA' && row.Status !== 'AA'
    )
    if (filteredData.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất file Excel!') })
      }
      return
    }

    const exportCols = (cols || [])
      .filter((col) => col.visible !== false || col.id === 'WorkingTag' || col.id === 'Status')
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

  // 3. Export JSON
  const exportJSON = () => {
    const filteredData = (data || []).filter(
      (row) => row && row.WorkingTag !== 'AA' && row.Status !== 'AA'
    )
    if (filteredData.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất file JSON!') })
      }
      return
    }

    const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' })
    const filename = `DATA_EXPORT_${getNow_yyyymmdd_hhmmss()}.json`
    saveAs(blob, filename)
    if (setStatusMessage) {
      setStatusMessage({ type: 'success', text: t('Đã xuất file JSON thành công!') })
    }
    setShowMenu(null)
  }

  // 4. Add Rows
  const handleAddRows = () => {
    const count = Number(inputValue)
    if (count > 0 && typeof handleRowAppend === 'function') {
      handleRowAppend(count)
      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t('Đã thêm {{count}} hàng dữ liệu!', { count })
        })
      }
    }
    setShowAddRow(false)
    setShowMenu(null)
  }

  return (
    <div className="w-[220px] bg-white rounded-none shadow-lg border border-slate-300 py-1 px-1 text-xs select-none font-sans text-slate-700 relative">
      {/* 1. Header label */}
      <div className="px-2.5 py-1 mb-1 font-bold text-[11px] text-slate-600 bg-slate-50 border-b border-slate-200 uppercase truncate">
        {t('Cột Trạng Thái')}
      </div>

      {/* 2. Tìm kiếm */}
      <div
        onClick={() => {
          if (setShowSearch) setShowSearch(true)
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
      >
        <Search size={14} className="text-slate-500 shrink-0" />
        <span className="text-xs">{t('Tìm kiếm')}</span>
      </div>

      {/* 3. Làm mới cột */}
      <div
        onClick={() => {
          if (handleReset) handleReset()
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
      >
        <RotateCcw size={14} className="text-indigo-600 shrink-0" />
        <span className="text-xs">{t('Làm mới cột')}</span>
      </div>

      {/* 4. Làm mới Sheet (nếu có) */}
      {handleRestSheet && (
        <div
          onClick={() => {
            handleRestSheet(true)
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
        >
          <Undo size={14} className="text-indigo-600 shrink-0" />
          <span className="text-xs">{t('Làm mới Sheet')}</span>
        </div>
      )}

      {/* 5. Export Data (Toggle menu) */}
      <div>
        <div
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Download size={14} className="text-emerald-600 shrink-0" />
            <span className="text-xs">{t('Export Data')}</span>
          </div>
          {showExportMenu ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </div>

        {showExportMenu && (
          <div className="pl-4 pr-1 py-1 space-y-1 bg-slate-50/80 border-y border-slate-100 my-0.5">
            <div
              onClick={exportExcel}
              className="flex items-center gap-2 px-2 py-1 hover:bg-emerald-50 hover:text-emerald-700 rounded-none cursor-pointer transition-colors"
            >
              <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
              <span className="text-[11.5px]">{t('Export Excel (.xlsx)')}</span>
            </div>
            <div
              onClick={exportCSV}
              className="flex items-center gap-2 px-2 py-1 hover:bg-blue-50 hover:text-blue-700 rounded-none cursor-pointer transition-colors"
            >
              <FileText size={13} className="text-blue-600 shrink-0" />
              <span className="text-[11.5px]">{t('Export CSV (.csv)')}</span>
            </div>
            <div
              onClick={exportJSON}
              className="flex items-center gap-2 px-2 py-1 hover:bg-amber-50 hover:text-amber-700 rounded-none cursor-pointer transition-colors"
            >
              <FileCode size={13} className="text-amber-600 shrink-0" />
              <span className="text-[11.5px]">{t('Export JSON (.json)')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Thêm hàng */}
      {handleRowAppend && (
        <div className="relative">
          <div
            onClick={() => setShowAddRow(!showAddRow)}
            className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-blue-600 shrink-0" />
              <span className="text-xs">{t('Thêm hàng')}</span>
            </div>
            {showAddRow ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </div>

          {showAddRow && (
            <div className="absolute left-[102%] top-0 z-[9999] w-[220px] bg-white border border-slate-300 shadow-xl p-3 text-xs">
              <div className="font-semibold text-slate-700 mb-2">{t('Thêm hàng dữ liệu')}</div>
              <InputNumber
                min={1}
                max={2000}
                value={inputValue}
                onChange={(val) => setInputValue(val || 1)}
                className="w-full mb-3"
                size="small"
                autoFocus
              />
              <Space className="w-full justify-end">
                <Button size="small" onClick={() => setShowAddRow(false)}>
                  {t('Hủy')}
                </Button>
                <Button size="small" type="primary" onClick={handleAddRows}>
                  {t('Thêm')}
                </Button>
              </Space>
            </div>
          )}
        </div>
      )}

      {/* Đường kẻ phân cách */}
      <div className="my-1 border-t border-slate-200" />

      {/* 7. Cài đặt cột Sheet */}
      {showDrawer && (
        <div
          onClick={() => {
            showDrawer()
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
        >
          <Settings size={14} className="text-slate-600 shrink-0" />
          <span className="text-xs">{t('Cài đặt cột Sheet')}</span>
        </div>
      )}
    </div>
  )
}

export default LayoutStatusMenuSheet
