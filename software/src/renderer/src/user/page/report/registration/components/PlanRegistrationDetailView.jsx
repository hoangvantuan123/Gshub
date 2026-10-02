/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input, Select, DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import viVN from 'antd/es/date-picker/locale/vi_VN'

dayjs.locale('vi')
import {
  ReloadOutlined,
  FileExcelOutlined,
  SearchOutlined,
  CopyOutlined
} from '@ant-design/icons'
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
  AlertCircle
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
  const { setStatusMessage, setPageData } = usePageData() || {}
  const loadingBarRef = useRef(null)

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
      masterInfo?.ReportType ||
      (regCode?.toLowerCase()?.includes('tksx') ? 'statistics' : 'plan')
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
        setReportType(currentMaster.ReportType || (regCode.includes('TKSX') ? 'statistics' : 'plan'))
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
        createdAt: currentMaster?.CreatedAt ? new Date(currentMaster.CreatedAt).toLocaleDateString('vi-VN') : '',
        updatedBy: currentMaster?.UpdatedByName || currentMaster?.UpdatedBy || '',
        updatedAt: currentMaster?.UpdatedAt ? new Date(currentMaster.UpdatedAt).toLocaleDateString('vi-VN') : ''
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

  // ── Xuất file Excel chuẩn Quản Trị với Multi-level Group Headers ──
  const handleExportExcel = useCallback(() => {
    try {
      if (!displayList || displayList.length === 0) {
        setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu để xuất file Excel' })
        return
      }

      const plantDisplayName = factoryCode === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ' : 'NHÀ MÁY GS HÀ NỘI'
      const isPlan = reportType === 'plan' || !reportType?.includes('stat')
      const reportTitle = isPlan
        ? `BÁO CÁO LỆNH THEO TRẠNG THÁI ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT - ${plantDisplayName}`
        : `NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT - ${plantDisplayName}`

      const validCols = rawBaseCols.filter((c) => c.id && c.id !== 'WorkingTag')

      const row1_Title = [reportTitle]
      const row2_Group = ['STT']
      const row3_ColName = ['STT']

      const merges = []
      const totalCols = validCols.length + 1 // +1 cho cột STT

      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })

      let currentGroup = null
      let groupStartIndex = -1

      validCols.forEach((col, idx) => {
        const colIdx = idx + 1
        const groupName = col.group || ''
        const colTitle = col.title || col.id

        row2_Group.push(groupName)
        row3_ColName.push(colTitle)

        if (groupName) {
          if (groupName !== currentGroup) {
            if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
              merges.push({
                s: { r: 1, c: groupStartIndex },
                e: { r: 1, c: colIdx - 1 }
              })
            }
            currentGroup = groupName
            groupStartIndex = colIdx
          }
        } else {
          if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
            merges.push({
              s: { r: 1, c: groupStartIndex },
              e: { r: 1, c: colIdx - 1 }
            })
          }
          currentGroup = null
          groupStartIndex = -1
          merges.push({
            s: { r: 1, c: colIdx },
            e: { r: 2, c: colIdx }
          })
        }
      })

      if (currentGroup && groupStartIndex !== -1 && totalCols - 1 > groupStartIndex) {
        merges.push({
          s: { r: 1, c: groupStartIndex },
          e: { r: 1, c: totalCols - 1 }
        })
      }

      merges.push({
        s: { r: 1, c: 0 },
        e: { r: 2, c: 0 }
      })

      const dataRows = displayList.map((item, rowIdx) => {
        const row = [rowIdx + 1]
        validCols.forEach((col) => {
          const colId = col.id
          const rawVal =
            item[colId] ??
            item[colId.charAt(0).toLowerCase() + colId.slice(1)] ??
            ''

          if (col.kind === 'Boolean') {
            const b =
              typeof rawVal === 'boolean'
                ? rawVal
                : rawVal === 1 || rawVal === '1' || rawVal === 'true' || rawVal === 'Có'
            row.push(b ? 'Có' : '')
          } else if (col.kind === 'Number') {
            if (rawVal !== '' && rawVal !== null && rawVal !== undefined) {
              const num = typeof rawVal === 'number' ? rawVal : Number(rawVal)
              row.push(!isNaN(num) ? num : rawVal)
            } else {
              row.push('')
            }
          } else {
            row.push(rawVal !== null && rawVal !== undefined ? rawVal : '')
          }
        })
        return row
      })

      const aoa = [row1_Title, row2_Group, row3_ColName, ...dataRows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!merges'] = merges

      const colWidths = [
        { wch: 8 },
        ...validCols.map((col) => ({
          wch: Math.max(12, Math.min(50, Math.round((col.width || 120) / 7.5)))
        }))
      ]
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      const sheetName = isPlan ? 'ChiTiet_DieuPhoi_KHSX' : 'ChiTiet_ThongKe_TKSX'
      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      const filePrefix = isPlan ? 'KHSX_ChiTiet' : 'TKSX_ChiTiet'
      const fileName = `${filePrefix}_${regCode || 'export'}_${Date.now()}.xlsx`
      XLSX.writeFile(wb, fileName)

      setStatusMessage?.({
        type: 'success',
        text: `Đã xuất ${displayList.length.toLocaleString('vi-VN')} dòng ra tệp ${fileName}`
      })
    } catch (err) {
      console.error('Export excel error:', err)
      setStatusMessage?.({
        type: 'error',
        text: 'Lỗi xuất file Excel: ' + (err?.message || err)
      })
    }
  }, [displayList, rawBaseCols, reportType, factoryCode, regCode, setStatusMessage])

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
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <div className="flex items-center justify-between w-full h-6 min-h-[24px] overflow-x-auto max-w-full">
          {/* Nút tác vụ chuẩn đồng bộ với Modal Đăng Ký */}
          <div className="flex items-center gap-1">
            <Button
              key="Reload"
              icon={<ReloadOutlined className="text-indigo-500" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={fetchDetailData}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-indigo-700 hover:text-indigo-800"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Tải lại dữ liệu từ hệ thống"
            >
              {t('TẢI LẠI')}
            </Button>

            <Button
              key="CopyTable"
              icon={<CopyOutlined className="text-blue-600" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={handleCopyTable}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-blue-700 hover:text-blue-800"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Sao chép toàn bộ dữ liệu bảng vào Clipboard"
            >
              {t('SAO CHÉP')}
            </Button>

            <Button
              key="ExportExcel"
              icon={<FileExcelOutlined className="text-emerald-600" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={handleExportExcel}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-800"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Xuất dữ liệu chi tiết ra Excel"
            >
              {t('XUẤT EXCEL')}
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
              <div className="flex-1 h-full flex items-center px-1">
                <Select
                  size="small"
                  variant="borderless"
                  value={reportType}
                  disabled={true}
                  className="w-full text-xs font-medium"
                  options={[
                    { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' },
                    { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' }
                  ]}
                />
              </div>
            </div>

            {/* Ô 3: Nhà máy sản xuất */}
            <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                <span>Nhà máy SX</span>
              </div>
              <div className="flex-1 h-full flex items-center px-1">
                <Select
                  size="small"
                  variant="borderless"
                  value={factoryCode}
                  disabled={true}
                  className="w-full text-xs font-medium"
                  options={[
                    { value: 'GS1', label: 'GS1 - GS1 Hà Nội' },
                    { value: 'GS5', label: 'GS5 - GS5 Quế Võ 1B' }
                  ]}
                />
              </div>
            </div>

            {/* Ô 4: Ngày áp dụng / Ngày báo cáo */}
            <div className="flex items-center h-[28px] bg-white min-w-0">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                <span>Ngày báo cáo</span>
              </div>
              <div className="flex-1 h-full flex items-center px-1">
                <DatePicker
                  locale={viVN}
                  size="small"
                  variant="borderless"
                  format="DD/MM/YYYY"
                  placeholder="Ngày/Tháng/Năm"
                  value={applyDate ? dayjs(applyDate) : null}
                  disabled={true}
                  className="w-full text-xs font-mono font-medium !p-0"
                  allowClear={false}
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
              <Input
                size="small"
                variant="borderless"
                value={remark}
                disabled={true}
                placeholder=""
                className="text-xs !p-0 text-slate-700"
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

              {isPlanType && planSummary && (
                <>
                  <span>
                    Tổng số lệnh:{' '}
                    <b style={{ color: '#0f172a' }}>
                      {planSummary.totalRows.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tổng SL Kế hoạch:{' '}
                    <b style={{ color: '#0f172a' }}>
                      {planSummary.totalPlan.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tổng SL Thực tế:{' '}
                    <b style={{ color: '#01411b' }}>
                      {planSummary.totalActual.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tỷ lệ hoàn thành:{' '}
                    <b style={{ color: '#01411b' }}>{planSummary.completionRate}%</b>
                  </span>
                  <span>
                    Tổng giờ SX thực tế:{' '}
                    <b style={{ color: '#01411b' }}>{planSummary.totalHours}h</b>
                  </span>
                </>
              )}

              {!isPlanType && statSummary && (
                <>
                  <span>
                    Tổng số phiếu:{' '}
                    <b style={{ color: '#0f172a' }}>
                      {statSummary.totalRows.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tổng SL Sản xuất:{' '}
                    <b style={{ color: '#0f172a' }}>
                      {statSummary.totalProd.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tổng SL Hỏng:{' '}
                    <b style={{ color: '#dc2626' }}>
                      {statSummary.totalFail.toLocaleString('vi-VN')}
                    </b>
                  </span>
                  <span>
                    Tỷ lệ hỏng:{' '}
                    <b style={{ color: '#dc2626' }}>{statSummary.defectRate}%</b>
                  </span>
                  <span>
                    Tổng giờ SX:{' '}
                    <b style={{ color: '#01411b' }}>{statSummary.totalHours}h</b>
                  </span>
                </>
              )}
            </div>

            {/* Các nút công cụ trong bảng */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                icon={<Search size={12} />}
                size="small"
                onClick={() => setShowSearch((prev) => !prev)}
                title="Mở tìm kiếm nhanh trong bảng (Ctrl + F)"
                style={{
                  fontSize: '11px',
                  borderColor: showSearch ? '#01411b' : '#cbd5e1',
                  color: showSearch ? '#01411b' : '#334155',
                  background: showSearch ? '#f0fdf4' : '#ffffff',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Tìm kiếm (Ctrl+F)
              </Button>
              <Button
                icon={<Copy size={12} />}
                size="small"
                onClick={handleCopyTable}
                title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
                style={{
                  fontSize: '11px',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  background: '#ffffff',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Sao chép
              </Button>
              <Button
                icon={<Download size={12} />}
                size="small"
                onClick={handleExportExcel}
                title="Xuất bảng chi tiết ra file Excel"
                style={{
                  fontSize: '11px',
                  borderColor: '#cbd5e1',
                  color: '#01411b',
                  background: '#ffffff',
                  fontWeight: 600,
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Excel
              </Button>
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
  )
}

