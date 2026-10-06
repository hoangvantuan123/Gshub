/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, RotateCw, FileSpreadsheet } from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import DataPageContainer from '../../../../components/layout/DataPageContainer'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../utils/exportExcelUtils'
import { Button } from '../../../../../components/ui/button'
import { DEFAULT_GRID_THEME } from '../../../../components/hooks/sheet/useTableCellTheme'
import { usePageData } from '../../../../../context/PageDataContext'
import { ALL_HANDBOOK_DATABASE } from './handbookData'

const DEFAULT_HANDBOOK_COLUMNS = [
  { id: 'stt', title: 'STT', width: 55, readonly: true, isReadOnly: true },
  { id: 'reportTypeName', title: 'Phân hệ Báo cáo', width: 150, readonly: true, isReadOnly: true },
  { id: 'categoryName', title: 'Phân loại Hạng mục', width: 170, readonly: true, isReadOnly: true },
  { id: 'columnId', title: 'Mã Cột / Field ID', width: 180, readonly: true, isReadOnly: true },
  {
    id: 'columnName',
    title: 'Tên hiển thị / Tiếng Việt',
    width: 220,
    readonly: true,
    isReadOnly: true
  },
  { id: 'scope', title: 'Vị trí áp dụng', width: 180, readonly: true, isReadOnly: true },
  {
    id: 'formula',
    title: 'Công thức tính toán (Formula Logic)',
    width: 330,
    readonly: true,
    isReadOnly: true
  },
  { id: 'source', title: 'Nguồn CSDL & Trường gốc', width: 250, readonly: true, isReadOnly: true },
  {
    id: 'description',
    title: 'Ý nghĩa & Quy tắc nghiệp vụ',
    width: 360,
    readonly: true,
    isReadOnly: true
  },
  { id: 'notes', title: 'Ghi chú & Lưu ý', width: 260, readonly: true, isReadOnly: true }
]

export function FormulaHandbookSheet({ isStandalone = false, defaultReportType = 'all' }) {
  const { t } = useTranslation()
  const { setPageData } = usePageData() || {}
  const [columns, setColumns] = useState(DEFAULT_HANDBOOK_COLUMNS)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const gridRef = useRef(null)

  // Query filter state
  const [searchValues, setSearchValues] = useState({
    ReportType: defaultReportType !== 'all' ? defaultReportType : '',
    Category: '',
    ColumnId: '',
    ColumnName: '',
    Scope: '',
    Keyword: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  useEffect(() => {
    if (defaultReportType && defaultReportType !== 'all') {
      setSearchValues((prev) => ({ ...prev, ReportType: defaultReportType }))
    } else {
      setSearchValues((prev) => ({ ...prev, ReportType: '' }))
    }
  }, [defaultReportType])

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'ReportType',
        label: t('Phân hệ báo cáo'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả phân hệ' },
          { value: 'stat', label: 'Thống kê SX (TKSX)' },
          { value: 'plan', label: 'Kế hoạch SX (KHSX)' }
        ]
      },
      {
        key: 'Category',
        label: t('Phân loại hạng mục'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả hạng mục' },
          { value: 'KPI', label: 'I. Thẻ KPI Điều hành' },
          { value: 'CHARTS', label: 'II. Biểu đồ Phân tích' },
          { value: 'TABLES', label: 'IV. Bảng biểu Chi tiết' }
        ]
      },
      {
        key: 'Keyword',
        label: t('Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Tìm kiếm mã, tên cột, công thức, nguồn...'
      },
      {
        key: 'ColumnId',
        label: t('Mã Cột / Field ID'),
        type: 'text',
        placeholder: 'Nhập mã cột (VD: totalTickets, mesRate)...'
      },
      {
        key: 'ColumnName',
        label: t('Tên Cột / Tiêu đề'),
        type: 'text',
        placeholder: 'Nhập tên cột tiếng Việt...'
      },
      {
        key: 'Scope',
        label: t('Vị trí áp dụng'),
        type: 'text',
        placeholder: 'Nhập vị trí báo cáo...'
      }
    ],
    [t]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'ReportType',
        label: t('Phân hệ báo cáo'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả phân hệ' },
          { value: 'stat', label: 'Thống kê SX (TKSX)' },
          { value: 'plan', label: 'Kế hoạch SX (KHSX)' }
        ],
        visible: true
      },
      {
        key: 'Category',
        label: t('Phân loại hạng mục'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả hạng mục' },
          { value: 'KPI', label: 'I. Thẻ KPI Điều hành' },
          { value: 'CHARTS', label: 'II. Biểu đồ Phân tích' },
          { value: 'TABLES', label: 'IV. Bảng biểu Chi tiết' }
        ],
        visible: true
      },
      {
        key: 'Keyword',
        label: t('Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Tìm mã cột, tên, công thức, nguồn dữ liệu...',
        visible: true
      },
      {
        key: 'ColumnId',
        label: t('Mã Cột / Field ID'),
        type: 'text',
        placeholder: 'Mã cột...',
        visible: true
      },
      {
        key: 'ColumnName',
        label: t('Tên Tiếng Việt'),
        type: 'text',
        placeholder: 'Tên hiển thị...',
        visible: true
      }
    ]
  }, [t])

  // Filter rows based on search conditions
  const filteredData = useMemo(() => {
    return ALL_HANDBOOK_DATABASE.filter((item) => {
      // 0. Report Type Filter (stat / plan)
      if (searchValues.ReportType && item.reportType !== searchValues.ReportType) {
        return false
      }
      // 1. Category Filter
      if (searchValues.Category && item.category !== searchValues.Category) {
        return false
      }
      // 2. Keyword Filter (Multi-field full text)
      if (searchValues.Keyword) {
        const q = searchValues.Keyword.toLowerCase().trim()
        const matchText =
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.columnId && item.columnId.toLowerCase().includes(q)) ||
          (item.columnName && item.columnName.toLowerCase().includes(q)) ||
          (item.scope && item.scope.toLowerCase().includes(q)) ||
          (item.formula && item.formula.toLowerCase().includes(q)) ||
          (item.source && item.source.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        if (!matchText) return false
      }
      // 3. Column ID
      if (searchValues.ColumnId) {
        const qId = searchValues.ColumnId.toLowerCase().trim()
        if (!item.columnId?.toLowerCase().includes(qId) && !item.id?.toLowerCase().includes(qId)) {
          return false
        }
      }
      // 4. Column Name
      if (searchValues.ColumnName) {
        const qName = searchValues.ColumnName.toLowerCase().trim()
        if (
          !item.columnName?.toLowerCase().includes(qName) &&
          !item.title?.toLowerCase().includes(qName)
        ) {
          return false
        }
      }
      // 5. Scope
      if (searchValues.Scope) {
        const qScope = searchValues.Scope.toLowerCase().trim()
        if (!item.scope?.toLowerCase().includes(qScope)) {
          return false
        }
      }
      return true
    })
  }, [searchValues])

  // Đồng bộ số lượng dòng và cột về Status Bar của hệ thống
  useEffect(() => {
    if (typeof setPageData === 'function') {
      setPageData((prev) => ({
        ...prev,
        total: filteredData.length,
        totalAll: ALL_HANDBOOK_DATABASE.length,
        loadedCount: filteredData.length,
        totalColumns: columns.length
      }))
    }
  }, [filteredData.length, columns.length, setPageData])

  // Cell Content Callback using standard library styles
  const getCellContent = useCallback(
    ([colIdx, rowIdx]) => {
      const row = filteredData[rowIdx]
      if (!row) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const colKey = columns[colIdx]?.id
      let text = ''

      switch (colKey) {
        case 'stt':
          text = String(rowIdx + 1)
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#475569',
              baseFontStyle: '500 12px Inter, sans-serif'
            }
          }

        case 'reportTypeName':
          text = row.reportTypeName || (row.reportType === 'stat' ? 'Thống kê SX' : 'Kế hoạch SX')
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#1e293b',
              baseFontStyle: '500 12px Inter, sans-serif'
            }
          }

        case 'categoryName':
          text = row.categoryName || row.category || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#1e293b',
              baseFontStyle: '600 12px Inter, sans-serif'
            }
          }

        case 'columnId':
          text = row.columnId || row.id || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#1e293b',
              baseFontStyle: '500 12px Consolas, Monaco, monospace'
            }
          }

        case 'columnName':
          text = row.columnName || row.title || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#0f172a',
              baseFontStyle: '600 12px Inter, sans-serif'
            }
          }

        case 'scope':
          text = row.scope || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#334155',
              baseFontStyle: '500 12px Inter, sans-serif'
            }
          }

        case 'formula':
          text = row.formula || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#1e293b',
              baseFontStyle: '500 12px Consolas, Monaco, monospace'
            }
          }

        case 'source':
          text = row.source || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#334155',
              baseFontStyle: '12px Inter, sans-serif'
            }
          }

        case 'description':
          text = row.description || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#1e293b',
              baseFontStyle: '12px Inter, sans-serif'
            }
          }

        case 'notes':
          text = row.notes || ''
          return {
            kind: GridCellKind.Text,
            data: text,
            displayData: text,
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              textDark: '#64748b',
              baseFontStyle: '12px Inter, sans-serif'
            }
          }

        default:
          return {
            kind: GridCellKind.Text,
            data: '',
            displayData: '',
            readonly: true,
            allowOverlay: false
          }
      }
    },
    [filteredData, columns]
  )

  // 1. Column drag and drop reordering
  const onColumnMoved = useCallback((startIndex, endIndex) => {
    setColumns((prev) => {
      const next = [...prev]
      const [removed] = next.splice(startIndex, 1)
      next.splice(endIndex, 0, removed)
      return next
    })
  }, [])

  // 2. Column width resizing
  const onColumnResize = useCallback((column, newSize) => {
    setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, width: newSize } : c)))
  }, [])

  // 3. Export to Excel Modal & Execution
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleOpenExportModal = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('Không có dữ liệu sổ tay công thức để xuất!')
      return
    }
    setIsExportModalOpen(true)
  }

  const executeExportHandbookExcel = async ({
    fileName,
    saveDirectory,
    overwriteExisting,
    includeHeaders,
    exportScope = 'all',
    exportableCols
  }) => {
    const selectedRows = selection.rows.toArray()
    let targetData = filteredData
    if (exportScope === 'selected' && selectedRows.length > 0) {
      targetData = selectedRows.map((idx) => filteredData[idx]).filter(Boolean)
    }

    const reportTitle = 'SỔ TAY QUY CHUẨN ĐỊNH NGHĨA & CÔNG THỨC BÁO CÁO SẢN XUẤT'
    const filterSummary = formatFilterSummary(searchValues)

    const colsToExport = [
      { id: 'reportTypeName', name: 'Phân hệ Báo cáo', width: 130, group: 'Phân loại' },
      { id: 'categoryName', name: 'Phân loại Hạng mục', width: 140, group: 'Phân loại' },
      { id: 'columnId', name: 'Mã Cột / Field ID', width: 140, group: 'Định danh' },
      { id: 'columnName', name: 'Tên Tiếng Việt', width: 180, group: 'Định danh' },
      { id: 'scope', name: 'Vị trí áp dụng', width: 150, group: 'Quy chuẩn' },
      { id: 'formula', name: 'Công thức tính toán', width: 250, group: 'Quy chuẩn' },
      { id: 'source', name: 'Nguồn CSDL & Trường gốc', width: 200, group: 'Kỹ thuật' },
      { id: 'description', name: 'Ý nghĩa & Quy tắc', width: 250, group: 'Kỹ thuật' },
      { id: 'notes', name: 'Ghi chú & Lưu ý', width: 180, group: 'Kỹ thuật' }
    ]

    const validCols = exportableCols || colsToExport

    const formattedData = targetData.map((item) => ({
      ...item,
      reportTypeName:
        item.reportTypeName || (item.reportType === 'stat' ? 'Thống kê SX' : 'Kế hoạch SX'),
      categoryName: item.categoryName || item.category,
      columnId: item.columnId || item.id,
      columnName: item.columnName || item.title
    }))

    const wb = generateExcelWorkbook({
      data: formattedData,
      columns: validCols,
      sheetName: 'Tu_Dien_Cong_Thuc',
      reportTitle,
      filterInfo: filterSummary,
      includeHeaders: includeHeaders !== false
    })

    await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
  }

  // 4. Reset columns & filters
  const handleResetQuery = () => {
    setSearchValues({
      ReportType: defaultReportType !== 'all' ? defaultReportType : '',
      Category: '',
      ColumnId: '',
      ColumnName: '',
      Scope: '',
      Keyword: ''
    })
    setColumns(DEFAULT_HANDBOOK_COLUMNS)
  }

  const handleFieldChange = (key, value) => {
    setSearchValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const onAddQueryField = (fieldKey) => {
    setDynamicQueryFields((prev) => {
      if (prev.includes(fieldKey)) return prev
      return [...prev, fieldKey]
    })
  }

  const onRemoveQueryField = (fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((k) => k !== fieldKey))
  }

  return (
    <>
      <DataPageContainer
        actions={
          <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
            {/* Nút tác vụ chuẩn DataPageContainer */}
            <div className="flex items-center gap-1.5">
              <Button
                key="Search"
                variant="ghost"
                size="sm"
                onClick={() => {}}
                className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                title="Tìm kiếm"
              >
                <Search size={13} className="text-blue-500" />
                <span>{t('TÌM KIẾM')}</span>
              </Button>

              <Button
                key="Reset"
                variant="ghost"
                size="sm"
                onClick={handleResetQuery}
                className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                title="Khôi phục bộ lọc và thứ tự cột mặc định"
              >
                <RotateCw size={13} className="text-amber-500" />
                <span>{t('LÀM MỚI')}</span>
              </Button>

              <Button
                key="ExportExcel"
                variant="ghost"
                size="sm"
                onClick={handleOpenExportModal}
                className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                title="Xuất bảng dữ liệu ra file Excel (.xlsx)"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>{t('XUẤT EXCEL')}</span>
              </Button>
            </div>
          </div>
        }
        query={
          <DynamicQueryBar
            fields={defaultFields}
            dynamicFields={dynamicQueryFields}
            allAvailableFields={allAvailableFields}
            values={searchValues}
            onChange={handleFieldChange}
            onSearch={() => {}}
            onReset={handleResetQuery}
            onAddField={onAddQueryField}
            onRemoveField={onRemoveQueryField}
            disabled={false}
            storageKey="query_report_formula_handbook"
          />
        }
        table={
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <DataEditor
              ref={gridRef}
              width="100%"
              height="100%"
              rows={filteredData.length}
              columns={columns}
              getCellContent={getCellContent}
              onColumnMoved={onColumnMoved}
              onColumnResize={onColumnResize}
              gridSelection={selection}
              onGridSelectionChange={setSelection}
              theme={DEFAULT_GRID_THEME}
              rowHeight={24}
              headerHeight={26}
              smoothScrollX
              smoothScrollY
              rowMarkers="none"
              rangeSelect="rect"
              columnSelect="multi"
              rowSelect="multi"
              getCellsForSelection={true}
              keybindings={{ search: true, copy: true, downFill: false, rightFill: false }}
              fillHandle={false}
              isDraggable={false}
              onPaste={() => false}
            />
          </div>
        }
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExportHandbookExcel}
        defaultFileName={`SoTay_CongThuc_BaoCao_${new Date().toISOString().slice(0, 10)}`}
        totalRows={filteredData.length}
        selectedCount={selection.rows.toArray().length}
        columns={columns}
      />
    </>
  )
}

export default FormulaHandbookSheet
