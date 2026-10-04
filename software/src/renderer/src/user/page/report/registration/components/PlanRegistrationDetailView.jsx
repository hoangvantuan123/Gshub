/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../../../components/ui/button'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')
import {
  Search,
  Copy,
  Download,
  Layers,
  Building2,
  Calendar,
  Database,
  Columns3,
  User,
  Info,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  FileSpreadsheet
} from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import * as XLSX from 'xlsx'

import { useStatisticsImportColumns } from '../statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../plan/columns/planImportColumns'
import {
  queryPlanMaster,
  queryPlanDetail,
  queryProdStatsDetail
} from '../services/planRegistrationService'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePageData } from '../../../../../context/PageDataContext'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../utils/exportExcelUtils'
import { useDateFormat } from '../../../../hooks/useDateFormat'

const executiveGridTheme = {
  accentColor: '#01411b',
  accentFg: '#ffffff',
  accentLight: '#f0fdf4',
  bgHeader: '#f8fafc',
  bgHeaderHasFocus: '#f1f5f9',
  bgHeaderHovered: '#e2e8f0',
  textHeader: '#334155',
  textHeaderSelected: '#01411b',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headerFontSize: '12px',
  baseFontSize: '12px',
  borderColor: '#cbd5e1',
  drilldownBorder: '#01411b',
  lineHeight: 1.2
}

export default function PlanRegistrationDetailView() {
  const { regCode } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { formatDate } = useDateFormat()
  const { setStatusMessage, setPageData } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // ── Khởi tạo Master Data (ưu tiên lấy từ Cache storage cho tốc độ 0ms) ──
  const [masterInfo, setMasterInfo] = useState(() => {
    try {
      const cached =
        sessionStorage.getItem(`master_info_${regCode}`) ||
        localStorage.getItem(`master_info_${regCode}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  // ── Form Master Info States (giống 100% Form Đăng Ký) ──
  const [reportType, setReportType] = useState(() => {
    return (
      masterInfo?.ReportType || (regCode?.toLowerCase()?.includes('tksx') ? 'statistics' : 'plan')
    )
  })
  const [factoryCode, setFactoryCode] = useState(() => masterInfo?.FactoryCode || 'GS1')
  const [factoryName, setFactoryName] = useState(() => masterInfo?.FactoryName || 'GS1 Hà Nội')
  const [applyDate, setApplyDate] = useState(() => masterInfo?.ApplyDate || '')
  const [remark, setRemark] = useState(() => masterInfo?.Remark || '')

  // ── Sheet Data State & Sorting ──
  const [sheetData, setSheetData] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'desc' })
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const gridRef = useRef(null)

  // ── Cột cấu hình (Toàn bộ là READ-ONLY, có thể chỉnh kích thước cột) ──
  const statColumns = useStatisticsImportColumns()
  const planColumns = usePlanImportColumns()
  const [columnWidths, setColumnWidths] = useState({})

  const rawBaseCols = useMemo(() => {
    return reportType === 'statistics' ? statColumns : planColumns
  }, [reportType, statColumns, planColumns])

  const currentColumns = useMemo(() => {
    return rawBaseCols.map((col) => {
      let title = col.title || col.id
      if (sortConfig.key === col.id) {
        title = `${title} ${sortConfig.direction === 'asc' ? '▲' : '▼'}`
      }
      return {
        ...col,
        title,
        readonly: true,
        isReadOnly: true,
        width: columnWidths[col.id] || col.width || 135
      }
    })
  }, [rawBaseCols, columnWidths, sortConfig])

  const onColumnResize = useCallback((column, newSize) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  // Sắp xếp cột khi bấm tiêu đề
  const onHeaderClicked = useCallback(
    (colIndex) => {
      const colObj = currentColumns[colIndex]
      if (!colObj) return
      const colId = colObj.id
      if (colId === 'WorkingTag') return
      setSortConfig((prev) => {
        if (prev.key === colId) {
          return { key: colId, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        }
        return { key: colId, direction: 'desc' }
      })
    },
    [currentColumns]
  )

  // Dữ liệu hiển thị sau sắp xếp
  const displayList = useMemo(() => {
    if (!sortConfig.key) return sheetData
    const { key, direction } = sortConfig
    return [...sheetData].sort((a, b) => {
      const valA = a[key] ?? a[key.charAt(0).toLowerCase() + key.slice(1)] ?? ''
      const valB = b[key] ?? b[key.charAt(0).toLowerCase() + key.slice(1)] ?? ''
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi')
    })
  }, [sheetData, sortConfig])

  // ── Tải dữ liệu Master & Chi tiết từ Database ──
  const fetchDetailData = useCallback(async () => {
    if (!regCode) return
    loadingBarRef.current?.continuousStart?.()
    try {
      // 1. Tải Master
      const masterRes = await queryPlanMaster({ RegCode: regCode })
      const masterList = masterRes?.data || []
      const currentMaster =
        masterList.find((m) => m.RegCode === regCode) || masterList[0] || masterInfo || null

      if (currentMaster) {
        setMasterInfo(currentMaster)
        setReportType(
          currentMaster.ReportType || (regCode.includes('TKSX') ? 'statistics' : 'plan')
        )
        setFactoryCode(currentMaster.FactoryCode || 'GS1')
        setFactoryName(currentMaster.FactoryName || 'GS1 Hà Nội')
        setApplyDate(currentMaster.ApplyDate || '')
        setRemark(currentMaster.Remark || '')

        try {
          sessionStorage.setItem(`master_info_${regCode}`, JSON.stringify(currentMaster))
        } catch {}
      }

      const isStatType =
        currentMaster?.ReportType === 'statistics' ||
        currentMaster?.ReportType === 'tksx' ||
        regCode.toLowerCase().includes('tksx')

      // 2. Tải Detail
      let detailList = []
      if (isStatType) {
        const statRes = await queryProdStatsDetail({ RegCode: regCode })
        detailList = statRes?.data || []
      } else {
        const planRes = await queryPlanDetail({ RegCode: regCode })
        detailList = planRes?.data || []
      }

      // Xóa WorkingTag 'A' -> chuyển thành '' vì dữ liệu đã lưu trong DB
      const cleanList = detailList.map((row) => ({
        ...row,
        WorkingTag: ''
      }))

      setSheetData(cleanList)

      setPageData?.((prev) => ({
        ...prev,
        total: cleanList.length,
        totalAll: cleanList.length,
        loadedCount: cleanList.length,
        totalColumns: currentColumns.length,
        createdBy: currentMaster?.CreatedByName || currentMaster?.CreatedBy || '',
        createdAt: currentMaster?.CreatedAt
          ? new Date(currentMaster.CreatedAt).toLocaleDateString('vi-VN')
          : '',
        updatedBy: currentMaster?.UpdatedByName || currentMaster?.UpdatedBy || '',
        updatedAt: currentMaster?.UpdatedAt
          ? new Date(currentMaster.UpdatedAt).toLocaleDateString('vi-VN')
          : ''
      }))

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${cleanList.length.toLocaleString('vi-VN')} dòng chi tiết cho đợt đăng ký ${regCode}`
      })
    } catch (err) {
      console.error('Fetch detail error:', err)
      setStatusMessage?.({
        type: 'error',
        text: 'Không thể tải dữ liệu chi tiết: ' + (err.message || err)
      })
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [regCode, setPageData, setStatusMessage, currentColumns.length])

  useEffect(() => {
    fetchDetailData()
  }, [fetchDetailData])

  // ── GLIDE GRID CELL GETTER ──
  const getCellContent = useCallback(
    ([colIndex, rowIndex]) => {
      const col = currentColumns[colIndex]
      const row = displayList[rowIndex]
      if (!col || !row) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const val = row[col.id] ?? row[col.id.charAt(0).toLowerCase() + col.id.slice(1)]

      if (col.id === 'WorkingTag') {
        const tag = val ? String(val).trim() : ''
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: col.themeOverride
        }
      }

      if (col.kind === 'Boolean') {
        const boolVal =
          typeof val === 'boolean'
            ? val
            : val === 1 || val === '1' || val === 'true' || val === 'Có'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          readonly: true,
          allowOverlay: false
        }
      }

      if (col.kind === 'Number' || typeof val === 'number') {
        const numVal = typeof val === 'number' ? val : Number(val)
        const isValid = !isNaN(numVal) && val !== '' && val !== null && val !== undefined
        const finalNum = isValid ? numVal : 0
        const displayData = isValid ? finalNum.toLocaleString('vi-VN') : ''
        return {
          kind: GridCellKind.Number,
          data: finalNum,
          displayData,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'right'
        }
      }

      const strVal = val === null || val === undefined ? '' : String(val).trim()
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: true,
        allowOverlay: false
      }
    },
    [currentColumns, displayList]
  )

  // ── Sao chép bảng vào Clipboard (định dạng TSV cho Excel) ──
  const handleCopyTable = useCallback(() => {
    try {
      if (!displayList || displayList.length === 0) {
        alert('Không có dữ liệu để sao chép!')
        return
      }
      const validCols = currentColumns.filter((c) => c.id && c.id !== 'WorkingTag')
      const headerRow = validCols.map((c) => c.title || c.id).join('\t')
      const bodyRows = displayList
        .map((item) =>
          validCols
            .map((c) => {
              const k = c.id
              const v = item[k] ?? item[k.charAt(0).toLowerCase() + k.slice(1)] ?? ''
              return typeof v === 'number' ? v : v || ''
            })
            .join('\t')
        )
        .join('\n')
      const tsv = `${headerRow}\n${bodyRows}`
      navigator.clipboard.writeText(tsv)
      setStatusMessage?.({
        type: 'success',
        text: 'Đã sao chép toàn bộ bảng dữ liệu vào Clipboard'
      })
      alert('Đã sao chép dữ liệu bảng vào Clipboard (định dạng Excel/TSV)')
    } catch (err) {
      console.error('Copy error:', err)
    }
  }, [displayList, currentColumns, setStatusMessage])

  // ── Mở modal xuất Excel ──
  const handleOpenExportModal = useCallback(() => {
    if (!displayList || displayList.length === 0) {
      setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu để xuất file Excel' })
      return
    }
    setIsExportModalOpen(true)
  }, [displayList, setStatusMessage])

  // ── Thực hiện xuất file Excel chuẩn Quản Trị ERP ──
  const executeExportDetailExcel = useCallback(
    async ({
      scope,
      fileName,
      saveDirectory,
      overwriteExisting,
      includeHeaders,
      exportableCols
    }) => {
      try {
        let dataToExport = displayList
        if (scope === 'selected') {
          const selectedRows = selection?.rows?.items || []
          if (selectedRows.length > 0) {
            const indices = []
            selectedRows.forEach(([start, end]) => {
              for (let i = start; i < Math.min(displayList.length, end); i++) {
                indices.push(i)
              }
            })
            dataToExport = indices.map((idx) => displayList[idx]).filter(Boolean)
          } else if (selection?.current?.range) {
            const { y, height } = selection.current.range
            dataToExport = displayList.slice(y, Math.min(displayList.length, y + height))
          }
        }

        if (dataToExport.length === 0) {
          throw new Error('Không có dòng dữ liệu nào để xuất Excel!')
        }

        const plantDisplayName = factoryCode === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ' : 'NHÀ MÁY GS HÀ NỘI'
        const isPlan = reportType === 'plan' || !reportType?.includes('stat')
        const reportTitle = isPlan
          ? `BÁO CÁO LỆNH THEO TRẠNG THÁI ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT - ${plantDisplayName}`
          : `NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT - ${plantDisplayName}`

        const filterSummary = `Mã đợt ĐK: ${regCode || ''} | Nhà máy: ${plantDisplayName} | Ngày áp dụng: ${applyDate ? formatDate(applyDate) : ''}`

        const wb = generateExcelWorkbook({
          data: dataToExport,
          columns: exportableCols || rawBaseCols,
          sheetName: isPlan ? 'ChiTiet_KHSX' : 'ChiTiet_TKSX',
          reportTitle,
          filterInfo: filterSummary,
          includeHeaders: includeHeaders !== false,
          formatDateFn: formatDate
        })

        const saveResult = await saveWorkbookToFile(wb, fileName, saveDirectory, {
          overwriteExisting
        })

        setStatusMessage?.({
          type: 'success',
          text: `Đã xuất thành công ${dataToExport.length.toLocaleString('vi-VN')} dòng dữ liệu ra file [${saveResult?.filePath || fileName}]!`
        })
      } catch (err) {
        console.error('Export excel error:', err)
        setStatusMessage?.({
          type: 'error',
          text: 'Lỗi xuất file Excel: ' + (err?.message || err)
        })
        throw err
      }
    },
    [
      displayList,
      selection,
      factoryCode,
      reportType,
      regCode,
      applyDate,
      formatDate,
      rawBaseCols,
      setStatusMessage
    ]
  )

  usePageHotkeys({
    onSearch: fetchDetailData
  })

  // Tính toán nhanh số liệu tóm tắt cho Toolbar
  const isPlanType = reportType === 'plan' || !reportType?.includes('stat')

  const planSummary = useMemo(() => {
    if (!isPlanType) return null
    const totalPlan = displayList.reduce(
      (acc, d) => acc + (Number(d.TargetPassQty ?? d.TargetProdQty ?? d.planQty) || 0),
      0
    )
    const totalActual = displayList.reduce(
      (acc, d) => acc + (Number(d.StatPassQty ?? d.actualQty) || 0),
      0
    )
    const completionRate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : '100.0'
    const totalHours = displayList
      .reduce((acc, d) => acc + (Number(d.ActualProdTime) || 0), 0)
      .toFixed(1)
    return {
      totalRows: displayList.length,
      totalPlan,
      totalActual,
      completionRate,
      totalHours
    }
  }, [displayList, isPlanType])

  const statSummary = useMemo(() => {
    if (isPlanType) return null
    const totalProd = displayList.reduce(
      (acc, d) => acc + (Number(d.Quantity ?? d.StatQty ?? d.PassQty) || 0),
      0
    )
    const totalFail = displayList.reduce(
      (acc, d) => acc + (Number(d.FailQty ?? d.DefectQty) || 0),
      0
    )
    const defectRate = totalProd > 0 ? ((totalFail / totalProd) * 100).toFixed(2) : '0.00'
    const totalHours = displayList
      .reduce((acc, d) => acc + (Number(d.ActualProdTime ?? d.ProdHour) || 0), 0)
      .toFixed(1)
    return {
      totalRows: displayList.length,
      totalProd,
      totalFail,
      defectRate,
      totalHours
    }
  }, [displayList, isPlanType])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <div className="flex items-center justify-between w-full h-5  max-w-full">
            {/* Nút tác vụ chuẩn đồng bộ với Modal Đăng Ký */}
            <div className="flex items-center gap-1.5">
              <Button
                key="Reload"
                size="sm"
                variant="ghost"
                onClick={fetchDetailData}
                className="uppercase text-[10px] whitespace-nowrap  text-indigo-700 hover:text-indigo-800"
                title="Tải lại dữ liệu từ hệ thống"
              >
                <RotateCw size={12} className="text-indigo-500" />
                {t('Truy vấn')}
              </Button>

              <Button
                key="CopyTable"
                size="sm"
                variant="ghost"
                onClick={handleCopyTable}
                className="uppercase text-[10px] whitespace-nowrap  text-blue-700 hover:text-blue-800"
                title="Sao chép toàn bộ dữ liệu bảng vào Clipboard"
              >
                <Copy size={12} className="text-blue-600" />
                {t('SAO CHÉP')}
              </Button>

              <Button
                key="ExportExcel"
                size="sm"
                variant="ghost"
                onClick={handleOpenExportModal}
                className="uppercase text-[10px] whitespace-nowrap text-emerald-700 hover:text-emerald-800"
                title="Xuất dữ liệu chi tiết ra Excel"
              >
                <FileSpreadsheet size={12} className="text-emerald-600" />
                {t('Xuất excel')}
              </Button>
            </div>
          </div>
        }
        queryTitle="Thông tin đăng ký báo cáo"
        query={
          <div className="w-full bg-white">
            {/* 1. KHUNG THÔNG TIN MASTER ĐĂNG KÝ (GIỐNG 100% FORM ĐĂNG KÝ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 w-full border-b border-slate-200 bg-white">
              {/* Ô 1: Mã đăng ký báo cáo */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
                  <span>Mã đăng ký</span>
                </div>
                <div className="flex-1 h-full flex items-center px-2 bg-slate-50/40">
                  <span className="text-xs font-mono font-bold text-indigo-700 truncate">
                    {masterInfo?.RegCode || regCode}
                  </span>
                </div>
              </div>

              {/* Ô 2: Loại báo cáo */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[100px] select-none">
                  <span>Loại báo cáo</span>
                </div>
                <div className="flex-1 h-full flex items-center px-2">
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {reportType === 'statistics'
                      ? 'Thống kê sản xuất (TKSX)'
                      : 'Kế hoạch sản xuất (KHSX)'}
                  </span>
                </div>
              </div>

              {/* Ô 3: Nhà máy sản xuất */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                  <span>Nhà máy SX</span>
                </div>
                <div className="flex-1 h-full flex items-center px-2">
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {factoryCode === 'GS5' ? 'GS5 - GS5 Quế Võ 1B' : 'GS1 - GS1 Hà Nội'}
                  </span>
                </div>
              </div>

              {/* Ô 4: Ngày áp dụng / Ngày báo cáo */}
              <div className="flex items-center h-[28px] bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                  <span>Ngày báo cáo</span>
                </div>
                <div className="flex-1 h-full flex items-center px-1">
                  <input
                    type="date"
                    value={applyDate ? String(applyDate).slice(0, 10) : ''}
                    disabled={true}
                    className="w-full text-xs font-mono font-medium bg-transparent border-none outline-none cursor-default text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Hàng 2: Ghi chú mô tả (Toàn bộ chiều rộng) */}
            <div className="flex items-center h-[28px] border-b border-slate-200 bg-white min-w-0 w-full">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
                <span>Ghi chú</span>
              </div>
              <div className="flex-1 h-full flex items-center px-1.5">
                <input
                  type="text"
                  value={remark || ''}
                  disabled={true}
                  placeholder="Không có ghi chú"
                  className="w-full text-xs bg-transparent border-none outline-none cursor-default text-slate-700"
                />
              </div>
            </div>
          </div>
        }
        table={
          <div className="flex-1 w-full h-full min-h-0 bg-white flex flex-col overflow-hidden relative">
            {/* Header bảng dữ liệu chi tiết & Toolbar Thống kê */}
            <div
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '6px 12px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
              className="shrink-0"
            >
              {/* Tóm tắt số liệu nhanh */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  color: '#334155',
                  fontWeight: 700,
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}
              >
                <span className="text-[11px] uppercase font-bold text-emerald-800 flex items-center gap-1.5 mr-1">
                  <span className="w-1.5 h-3.5 bg-emerald-700 rounded-full inline-block shrink-0" />
                  {isPlanType
                    ? '6. LỆNH THEO TRẠNG THÁI ĐP – SX (CHI TIẾT TỪNG LỆNH)'
                    : '5. NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT'}
                </span>
              </div>
            </div>

            {/* Glide Data Grid Bảng dữ liệu */}
            <div className="flex-1 w-full h-full min-h-0 relative">
              <DataEditor
                ref={gridRef}
                columns={currentColumns}
                rows={displayList.length}
                getCellContent={getCellContent}
                gridSelection={selection}
                onGridSelectionChange={setSelection}
                onHeaderClicked={onHeaderClicked}
                onColumnResize={onColumnResize}
                getCellsForSelection={true}
                rangeSelect="rect"
                columnSelect="multi"
                rowSelect="multi"
                rowMarkers="both"
                headerHeight={23}
                rowHeight={23}
                smoothScrollX
                smoothScrollY
                showSearch={showSearch}
                onSearchClose={() => setShowSearch(false)}
                keybindings={{ search: true, copy: true, downFill: true, rightFill: true }}
                theme={executiveGridTheme}
                width="100%"
                height="100%"
              />
            </div>
          </div>
        }
      />

      {/* Modal xác nhận xuất Excel */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={t(
          reportType === 'plan' || !reportType?.includes('stat')
            ? 'XÁC NHẬN XUẤT EXCEL - CHI TIẾT ĐĂNG KÝ KHSX'
            : 'XÁC NHẬN XUẤT EXCEL - CHI TIẾT ĐĂNG KÝ TKSX'
        )}
        reportName={t(
          reportType === 'plan' || !reportType?.includes('stat')
            ? `Chi tiết ĐK Kế hoạch sản xuất (${regCode || ''})`
            : `Chi tiết ĐK Thống kê sản xuất (${regCode || ''})`
        )}
        totalRows={displayList.length}
        loadedCount={displayList.length}
        selectedCount={
          selection?.rows?.items?.reduce((acc, [s, e]) => acc + (e - s), 0) ||
          (selection?.current?.range?.height ? selection.current.range.height : 0)
        }
        columns={currentColumns}
        activeFilters={{
          RegCode: regCode,
          FactoryName: factoryName,
          ApplyDate: applyDate
        }}
        defaultFileName={`${reportType === 'plan' || !reportType?.includes('stat') ? 'KHSX_ChiTiet' : 'TKSX_ChiTiet'}_${regCode || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`}
        onConfirmExport={executeExportDetailExcel}
      />
    </>
  )
}
