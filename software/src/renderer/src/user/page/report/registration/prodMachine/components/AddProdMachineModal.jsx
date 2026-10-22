/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Loader2, RefreshCw, RotateCw, Save, X } from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { queryPlanMaster } from '../../services/planRegistrationService'
import { MACHINE_COMPARISON_COLUMN_SCHEMA } from '../../../production/calcProduction/constants/calcConstants'
import { Button } from '@renderer/components/ui/button'

const rowsFrom = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  return []
}

const pageInfoFrom = (response) => {
  const raw = response?.pageInfo || response?.page || response?.raw?.pageInfo || {}
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleUpperCase('vi-VN')
    .replace(/[^A-Z0-9]/g, '')

const COLUMN_ALIASES = {
  SourceRow: ['SourceRow', 'Dòng TK nguồn', 'Dòng nguồn', 'RowSeq'],
  StatSlipNo: ['StatSlipNo', 'StatTicketNo', 'Số phiếu thống kê', 'Phiếu thống kê'],
  StatDate: ['StatDate', 'Ngày thống kê'],
  OperationOrderNo: ['OperationOrderNo', 'OperationNo', 'Số lệnh thao tác'],
  StageOrderNo: ['StageOrderNo', 'StageNo', 'Số lệnh công đoạn'],
  OperationName: ['OperationName', 'OperationTypeName', 'Thao tác'],
  MaterialCode: ['MaterialCode', 'ItemCode', 'Mã vật tư'],
  MaterialName: ['MaterialName', 'ItemName', 'Tên vật tư'],
  ActualMachineCode: ['ActualMachineCode', 'MachineCode', 'Mã máy thực tế'],
  ActualMachineName: ['ActualMachineName', 'MachineName', 'Tên máy thực tế'],
  PlannedMachineCode: ['PlannedMachineCode', 'Mã máy khai báo'],
  PlannedMachineName: ['PlannedMachineName', 'Tên máy khai báo'],
  IsBelongToFactory: [
    'IsBelongToFactory',
    'Thuộc nhà máy',
    'Máy thuộc nhà máy',
    'Thuộc nhà máy?'
  ]
}

const ALIAS_TO_COLUMN = new Map(
  Object.entries(COLUMN_ALIASES).flatMap(([column, aliases]) =>
    aliases.map((alias) => [normalize(alias), column])
  )
)
const COLUMN_SCHEMA_BY_KEY = new Map(
  MACHINE_COMPARISON_COLUMN_SCHEMA.map((column) => [column.key, column])
)

const findHeaderRow = (matrix) => {
  let best = null
  matrix.slice(0, 20).forEach((row, index) => {
    const columns = row.map((cell) => ALIAS_TO_COLUMN.get(normalize(cell)) || '')
    const score = new Set(columns.filter(Boolean)).size
    if (!best || score > best.score) best = { index, columns, score }
  })
  return best
}

const cellText = (value) => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${value.getFullYear()}`
  }
  return String(value).trim()
}

const typedCellValue = (columnKey, value, fallbackRow) => {
  const schema = COLUMN_SCHEMA_BY_KEY.get(columnKey)
  if (schema?.kind === 'Number') {
    if (value === null || value === undefined || value === '') return fallbackRow
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : fallbackRow
  }
  return cellText(value)
}

const parseMachineComparisonFile = async (file) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  if (!workbook.SheetNames.length) throw new Error('File Excel không có trang tính dữ liệu.')
  const candidates = workbook.SheetNames.map((sheetName, sheetIndex) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: ''
    })
    return { sheetName, sheetIndex, matrix, header: findHeaderRow(matrix) }
  }).filter(({ header }) => header?.score >= 2 && header.columns.includes('StatSlipNo'))
  if (!candidates.length) {
    throw new Error('Không nhận diện được dòng tiêu đề Tab 7. File cần có cột “Số phiếu thống kê”.')
  }
  candidates.sort((left, right) => {
    const leftPreferred = /TAB\s*7|ĐỐI CHIẾU MÁY/i.test(left.sheetName) ? 1 : 0
    const rightPreferred = /TAB\s*7|ĐỐI CHIẾU MÁY/i.test(right.sheetName) ? 1 : 0
    return right.header.score - left.header.score || rightPreferred - leftPreferred || left.sheetIndex - right.sheetIndex
  })
  const { sheetName, matrix, header } = candidates[0]
  const rows = matrix
    .slice(header.index + 1)
    .map((source, index) => {
      const row = {}
      header.columns.forEach((column, columnIndex) => {
        if (column) row[column] = typedCellValue(column, source[columnIndex], index + 1)
      })
      if (!Object.values(row).some((value) => value !== '' && value !== null && value !== undefined)) return null
      return {
        ...row,
        SourceRow: Number(row.SourceRow) > 0 ? Number(row.SourceRow) : index + 1,
        StatSlipNo: String(row.StatSlipNo || '').trim()
      }
    })
    .filter(Boolean)
  if (!rows.length) throw new Error('File Excel không có dòng dữ liệu Tab 7.')
  const missingSlipRows = rows.filter((row) => !row.StatSlipNo)
  if (missingSlipRows.length) {
    throw new Error(`File có ${missingSlipRows.length} dòng chưa có số phiếu thống kê.`)
  }
  return { rows, sheetName }
}

const reportDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString('vi-VN')
}

export default function AddProdMachineModal({ isOpen, onClose, onRegister, permissions = {} }) {
  const fileInputRef = useRef(null)
  const [reports, setReports] = useState([])
  const [reportSearch, setReportSearch] = useState('')
  const [selectedRegCode, setSelectedRegCode] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [fileRows, setFileRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [columnWidths, setColumnWidths] = useState({})

  const loadReports = async () => {
    setIsLoadingReports(true)
    setError('')
    try {
      const pageSize = 1000
      const firstPage = await queryPlanMaster({ ReportType: 'statistics', page: 1, pageSize })
      const allReports = rowsFrom(firstPage)
      const total = Number(pageInfoFrom(firstPage)?.total ?? allReports.length)
      for (let page = 2; page <= Math.ceil(total / pageSize); page += 1) {
        const nextPage = await queryPlanMaster({ ReportType: 'statistics', page, pageSize })
        allReports.push(...rowsFrom(nextPage))
      }
      const loaded = allReports.filter((item) => {
        const type = normalize(item.ReportType)
        return !type || ['STATISTICS', 'TKSX'].includes(type)
      })
      setReports(loaded)
      if (!loaded.length) setError('Chưa tìm thấy báo cáo TKSX nào để đăng ký máy.')
    } catch (loadError) {
      setError(loadError?.message || 'Không thể tải danh sách báo cáo TKSX.')
    } finally {
      setIsLoadingReports(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setReports([])
    setReportSearch('')
    setSelectedRegCode('')
    setSelectedReport(null)
    setFileRows([])
    setFileName('')
    setError('')
    loadReports()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // Load the report list only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const filteredReports = useMemo(() => {
    const query = normalize(reportSearch)
    return reports.filter((report) =>
      !query ||
      normalize(report.RegCode).includes(query) ||
      normalize(report.FactoryName).includes(query) ||
      normalize(report.FactoryCode).includes(query)
    )
  }, [reports, reportSearch])

  useEffect(() => {
    if (!isOpen || !selectedRegCode) {
      setSelectedReport(null)
      return
    }
    const report = reports.find((item) => String(item.RegCode) === selectedRegCode)
    setSelectedReport(report || null)
    setError('')
    if (!report) setError('Không tìm thấy báo cáo TKSX đã chọn.')
  }, [isOpen, selectedRegCode, reports])

  const currentColumns = useMemo(
    () =>
      MACHINE_COMPARISON_COLUMN_SCHEMA.map((column) => ({
        title: column.title,
        id: column.key,
        group: column.group,
        kind: column.kind,
        readonly: true,
        width: columnWidths[column.key] || column.width || 135,
        hasMenu: true,
        visible: true
      })),
    [columnWidths]
  )

  const onColumnResize = useCallback((column, newSize) => {
    setColumnWidths((previous) => ({ ...previous, [column.id]: newSize }))
  }, [])

  const getCellContent = useCallback(
    ([columnIndex, rowIndex]) => {
      const column = currentColumns[columnIndex]
      const row = fileRows[rowIndex]
      const value = column && row ? row[column.id] : ''
      if (!column || column.kind !== 'Number') {
        const text = value === null || value === undefined ? '' : String(value).trim()
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text,
          readonly: true,
          allowOverlay: false
        }
      }
      const numeric = Number(value)
      const display = value === null || value === undefined || value === '' ? '' : String(value)
      return {
        kind: GridCellKind.Number,
        data: Number.isFinite(numeric) ? numeric : 0,
        displayData: display,
        readonly: true,
        allowOverlay: false
      }
    },
    [currentColumns, fileRows]
  )

  const handleReadFile = async (file) => {
    if (!file) return
    setIsReadingFile(true)
    setError('')
    try {
      const parsed = await parseMachineComparisonFile(file)
      setFileRows(parsed.rows)
      setFileName(`${file.name} · ${parsed.sheetName}`)
    } catch (readError) {
      setFileRows([])
      setFileName('')
      setError(readError?.message || 'Không thể đọc file đối chiếu máy.')
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleRegister = async () => {
    if (!permissions.canCreate || !permissions.canSave) {
      setError('Bạn chưa có quyền đăng ký báo cáo máy.')
      return
    }
    if (!selectedReport) return setError('Hãy chọn một báo cáo TKSX.')
    if (!fileRows.length) return setError('Hãy tải file Excel kết quả Tab 7 lên trước.')
    setIsRegistering(true)
    setError('')
    try {
      await onRegister?.({ report: selectedReport, rows: fileRows })
      onClose?.()
    } catch (registerError) {
      setError(registerError?.message || 'Không thể đăng ký các dòng Tab 7 trong file.')
    } finally {
      setIsRegistering(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        animation: 'fadeIn 0.12s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #94a3b8',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          width: '98vw',
          height: '96vh',
          maxWidth: '99vw',
          maxHeight: '98vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-300 bg-slate-100 px-3 py-1.5 select-none">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-800">
            <FileSpreadsheet size={15} className="text-[#01411b]" />
            Đăng ký & nạp dữ liệu báo cáo máy (TKSX / Tab 7)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
            title="Đóng cửa sổ (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white font-sans text-slate-800 select-none antialiased">
          <div className="flex h-7 min-h-[28px] shrink-0 items-center justify-between border-b border-slate-200 bg-[#F8F9FA] px-2">
            <div className="flex items-center gap-1.5">
              <Button
                key="RegisterMachine"
                size="sm"
                variant="ghost"
                onClick={handleRegister}
                disabled={
                  !permissions.canCreate ||
                  !permissions.canSave ||
                  isReadingFile ||
                  isRegistering ||
                  !selectedReport ||
                  !fileRows.length
                }
                className="h-7 whitespace-nowrap px-2 text-[10px] font-medium uppercase"
                title="Đăng ký toàn bộ dòng Tab 7 cho báo cáo TKSX đã chọn"
              >
                {isRegistering ? (
                  <Loader2 size={12} className="animate-spin text-emerald-600" />
                ) : (
                  <Save size={12} className="text-emerald-600" />
                )}
                <span>{isRegistering ? 'ĐANG ĐĂNG KÝ' : 'ĐĂNG KÝ (' + fileRows.length + ')'}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={isReadingFile || isRegistering}
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  handleReadFile(file)
                  event.target.value = ''
                }}
              />
              <Button
                key="UploadMachineExcel"
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFile || isRegistering}
                className="h-7 whitespace-nowrap px-2 text-[10px] font-medium uppercase text-emerald-700 hover:text-emerald-800"
                title="Nạp file Excel, hệ thống tự ánh xạ tiêu đề Tab 7"
              >
                {isReadingFile ? (
                  <Loader2 size={12} className="animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet size={12} className="text-emerald-600" />
                )}
                <span>{isReadingFile ? 'ĐANG ĐỌC EXCEL' : 'NẠP EXCEL'}</span>
              </Button>
              <Button
                key="ResetMachineExcel"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFileRows([])
                  setFileName('')
                  setError('')
                }}
                disabled={!fileRows.length || isRegistering}
                className="h-7 whitespace-nowrap px-2 text-[10px] font-medium uppercase"
                title="Xóa dữ liệu Excel vừa nạp"
              >
                <RotateCw size={12} className="text-amber-500" />
                <span>LÀM MỚI</span>
              </Button>
              <span className="max-w-[42vw] truncate pl-1 text-[10px] text-slate-500" title={fileName}>
                {fileName || 'Chưa chọn file Excel'}
              </span>
            </div>
            <button
              type="button"
              onClick={loadReports}
              disabled={isLoadingReports}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase text-blue-700 disabled:opacity-50"
              title="Tải lại danh sách báo cáo TKSX"
            >
              <RefreshCw size={12} className={isLoadingReports ? 'animate-spin' : ''} /> Tải danh sách TKSX
            </button>
          </div>

          <div className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-2 py-0.5 text-gray-900 select-none">
              <h2 className="flex items-center gap-1.5 py-0.5 text-[10px] font-bold italic uppercase text-indigo-600">
                <span className="inline-block h-3 w-1 shrink-0 rounded-full bg-indigo-600" />
                Thông tin đăng ký báo cáo máy
              </h2>
              <span className="text-[10px] text-slate-500">Chọn một báo cáo TKSX để liên kết với dữ liệu Tab 7</span>
            </div>
            <div className="grid w-full grid-cols-1 border-b border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex h-[52px] min-w-0 flex-col border-r border-slate-200">
                <label htmlFor="prod-machine-report-search" className="flex h-5 items-center bg-slate-50 px-2 text-[10px] font-semibold text-slate-700">
                  Tìm mã / nhà máy TKSX
                </label>
                <input
                  id="prod-machine-report-search"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  placeholder="Lọc danh sách báo cáo..."
                  className="h-6 border-t border-slate-200 px-2 text-[11px] outline-none focus:bg-blue-50"
                />
              </div>
              <div className="flex h-[52px] min-w-0 flex-col border-r border-slate-200">
                <label htmlFor="prod-machine-report-code" className="flex h-5 items-center bg-slate-50 px-2 text-[10px] font-semibold text-slate-700">
                  Báo cáo TKSX <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  id="prod-machine-report-code"
                  value={selectedRegCode}
                  onChange={(event) => {
                    setSelectedRegCode(event.target.value)
                    setFileRows([])
                    setFileName('')
                    setError('')
                    setSelection({
                      columns: CompactSelection.empty(),
                      rows: CompactSelection.empty()
                    })
                  }}
                  disabled={isLoadingReports || isRegistering}
                  className="h-6 min-w-0 border-t border-slate-200 bg-white px-1 text-[11px] outline-none focus:bg-blue-50"
                >
                  <option value="">{isLoadingReports ? 'Đang tải...' : '— Chọn báo cáo TKSX —'}</option>
                  {filteredReports.map((report) => (
                    <option key={report.IdSeq || report.RegCode} value={String(report.RegCode || '')}>
                      {report.RegCode} · {report.FactoryName || report.FactoryCode || 'Chưa rõ nhà máy'} · {reportDate(report.ApplyDate)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex h-[52px] min-w-0 flex-col border-r border-slate-200">
                <div className="flex h-5 items-center bg-slate-50 px-2 text-[10px] font-semibold text-slate-700">Nhà máy / ngày báo cáo</div>
                <div className="flex h-6 min-w-0 items-center gap-2 border-t border-slate-200 px-2 text-[11px]">
                  <span className="truncate font-medium text-slate-800">{selectedReport?.FactoryName || selectedReport?.FactoryCode || '—'}</span>
                  <span className="shrink-0 text-slate-400">·</span>
                  <span className="shrink-0 font-mono text-slate-700">{reportDate(selectedReport?.ApplyDate) || '—'}</span>
                </div>
              </div>
              <div className="flex h-[52px] min-w-0 flex-col">
                <div className="flex h-5 items-center bg-slate-50 px-2 text-[10px] font-semibold text-slate-700">Mã báo cáo TKSX / dòng Tab 7</div>
                <div className="flex h-6 min-w-0 items-center gap-2 border-t border-slate-200 px-2 text-[11px]">
                  <span className="truncate font-mono font-bold text-indigo-700">{selectedReport?.RegCode || '—'}</span>
                  <span className="shrink-0 text-slate-400">·</span>
                  <span className="shrink-0 text-slate-600">{fileRows.length.toLocaleString('vi-VN')} dòng Tab 7</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-b border-slate-200">
            <div className="flex h-6 min-h-[24px] shrink-0 items-center justify-between border-b border-slate-200 px-2">
              <h2 className="flex items-center gap-1.5 text-[10px] font-bold italic uppercase text-indigo-600">
                <span className="inline-block h-3 w-1 rounded-full bg-indigo-600" />
                Bảng dữ liệu chi tiết (Đối chiếu máy — Tab 7)
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-600">
                <span>Trong file: <b className="text-slate-800">{fileRows.length.toLocaleString('vi-VN')}</b> dòng</span>
                <span>Báo cáo TKSX: <b className="text-emerald-700">{selectedReport?.RegCode || 'Chưa chọn'}</b></span>
              </div>
            </div>
            {error && (
              <div role="alert" className="shrink-0 border-b border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
                {error}
              </div>
            )}
            {!fileRows.length && (
              <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                Chọn báo cáo TKSX rồi nạp file Excel Tab 7. Hệ thống tự nhận diện cột và kiểu dữ liệu; tiêu đề luôn hiển thị trong lưới.
              </div>
            )}
            <div
              className={'relative min-h-0 flex-1 bg-white ' + (isDragging ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50/40' : '')}
              onDragOver={(event) => {
                event.preventDefault()
                if (!isRegistering) setIsDragging(true)
              }}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) setIsDragging(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragging(false)
                const file = event.dataTransfer?.files?.[0]
                if (file && /\.xlsx?$/i.test(file.name)) handleReadFile(file)
                else if (file) setError('Vui lòng chọn file định dạng Excel (.xlsx hoặc .xls).')
              }}
            >
              <DataEditor
                columns={currentColumns}
                rows={fileRows.length}
                getCellContent={getCellContent}
                gridSelection={selection}
                onGridSelectionChange={setSelection}
                onColumnResize={onColumnResize}
                getCellsForSelection={true}
                keybindings={{ copy: true }}
                rowMarkers="both"
                rowSelect="multi"
                columnSelect="single"
                headerHeight={23}
                rowHeight={23}
                smoothScrollX
                smoothScrollY
                width="100%"
                height="100%"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
