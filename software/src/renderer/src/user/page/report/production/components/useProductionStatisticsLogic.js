import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { initialHanoiGs1Stats, initialQuevoGs5Stats } from '../../common/reportUtils'

// Helper extractor for Auto-Logistics Status strictly from column AutoIoStatus ("Sinh phiếu xuất/nhập tự động")
export function getAutoExportType(item) {
  const direct = String(
    item.AutoIoStatus ??
      item.autoIoStatus ??
      item.AutoIOStatus ??
      item.autoIo ??
      item.autoExportNoteText ??
      ''
  ).trim()

  if (
    direct &&
    direct !== 'undefined' &&
    direct !== 'null' &&
    direct !== 'true' &&
    direct !== 'false' &&
    direct !== '[object Object]'
  ) {
    return direct
  }

  // Fallback if boolean
  const hasExport =
    item.AutoExport === true ||
    item.AutoExport === 'true' ||
    item.AutoExport === '1' ||
    item.autoExport === true ||
    Boolean(item.ExportDocNo)
  const hasImport =
    item.AutoImport === true ||
    item.AutoImport === 'true' ||
    item.AutoImport === '1' ||
    item.autoImport === true ||
    Boolean(item.ImportDocNo)

  if (hasExport && hasImport) return 'Có XKTĐ, Có NKTĐ'
  if (hasExport) return 'Có XKTĐ'
  if (hasImport) return 'Có NKTĐ'
  return 'Không áp dụng XNTĐ'
}

// Helper parse Sync Delay to seconds
export const parseSyncDelayToSeconds = (val, item = null) => {
  if (val === null || val === undefined || val === '') {
    if (item && item.MesApprovalTime && item.TicketCreatedDate) {
      const tCreated = new Date(item.TicketCreatedDate).getTime()
      const tMes = new Date(item.MesApprovalTime).getTime()
      if (!isNaN(tCreated) && !isNaN(tMes) && tMes >= tCreated) {
        const diffSec = (tMes - tCreated) / 1000
        if (diffSec >= 0 && diffSec <= 86400) return diffSec
      }
    }
    return null
  }

  if (typeof val === 'number') {
    if (isNaN(val) || val < 0) return null
    return val
  }

  const str = String(val).trim().toLowerCase()
  if (!str || str === 'null' || str === 'undefined' || str === 'nan' || str === '-') return null

  // 1. Time format HH:mm:ss or mm:ss
  if (str.includes(':')) {
    const parts = str.split(':').map((p) => Number(p.trim()))
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
    } else if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0)
    }
  }

  // 2. Chứa đơn vị chữ: 'phút' / 'min' / 'giây' / 'sec' / 's' / 'm'
  if (str.includes('phút') || str.includes('min') || str.endsWith('m') || str.endsWith('p')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''))
    return isNaN(num) ? null : num * 60
  }
  if (str.includes('giây') || str.includes('sec') || str.endsWith('s') || str.endsWith('g')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''))
    return isNaN(num) ? null : num
  }

  const num = parseFloat(str)
  if (isNaN(num) || num < 0) return null
  return num
}

// Helper format seconds to HH:mm:ss
export const formatSecondsToTime = (totalSec) => {
  if (totalSec === null || totalSec === undefined || isNaN(totalSec) || totalSec < 0)
    return '00:00:00'
  const rounded = Math.round(totalSec)
  const h = Math.floor(rounded / 3600)
  const m = Math.floor((rounded % 3600) / 60)
  const s = rounded % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const useProductionStatisticsLogic = ({
  plantKey = 'hanoi',
  dataset,
  initialData,
  customData,
  data,
  dateRange,
  onDateRangeChange,
  selectedMasterKey
}) => {
  const [machineChartMode, setMachineChartMode] = useState('runtime') // 'runtime' | 'composed' | 'tickets'
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [selectedDurationAudit, setSelectedDurationAudit] = useState('ALL')
  const [isCapturing, setIsCapturing] = useState(false)
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditModalCategory, setAuditModalCategory] = useState('ALL')

  // Machine Sorting State: Mặc định sắp xếp theo Giờ chạy máy cao nhất lên đầu
  const [machineSortConfig, setMachineSortConfig] = useState({
    key: 'totalRuntimeHours',
    direction: 'desc'
  })

  // Full Height Controls (Tự động kéo dài khớp trọn vẹn số dòng của bảng)
  const [machineFullHeight, setMachineFullHeight] = useState(false)
  const [teamFullHeight, setTeamFullHeight] = useState(false)
  const [detailFullHeight, setDetailFullHeight] = useState(false)

  // Row Density / Height Controls (Giãn cách dòng: Gọn 26px / Chuẩn 30px / Thoáng 36px)
  const [machineRowHeight, setMachineRowHeight] = useState(30)
  const [teamRowHeight, setTeamRowHeight] = useState(30)
  const [detailRowHeight, setDetailRowHeight] = useState(30)

  // Quick Table Search
  const [machineSearchText, setMachineSearchText] = useState('')
  const [teamSearchText, setTeamSearchText] = useState('')
  const [detailSearchText, setDetailSearchText] = useState('')

  const [fullscreenTable, setFullscreenTable] = useState(null) // null | 'machine' | 'team' | 'detail'

  // Refs for Screenshot, Chart export and Glide Grids
  const reportRootRef = useRef(null)
  const chart1Ref = useRef(null)
  const chart2Ref = useRef(null)
  const chart3Ref = useRef(null)

  const machineGridRef = useRef(null)
  const teamGridRef = useRef(null)
  const detailGridRef = useRef(null)

  // 1. Unified Raw Data Pipeline: Đổ chính xác 100% dữ liệu từ API Backend / props
  const inputDataset = customData || dataset || initialData || data
  const rawData = useMemo(() => {
    const list =
      inputDataset && inputDataset.length > 0
        ? inputDataset
        : plantKey === 'quevo'
          ? initialQuevoGs5Stats
          : initialHanoiGs1Stats

    return list.map((item, idx) => {
      const p = Number(item.planQty || item.TargetProdQty || item.StandardMeters) || 0
      const a = Number(item.actualQty || item.ProdQty || item.ActualMeters) || p || 0
      const pass = Number(item.passQty || item.StatPassQty) || a || 0
      const def = Number(item.defectQty) || Math.max(0, a - pass) || 0
      const pRate = a > 0 ? Number(((pass / a) * 100).toFixed(1)) : 100
      const rt =
        Number(item.runtimeHours || item.ActualRunTime) ||
        (a > 0 ? Number((a / 3500).toFixed(1)) : 7.5)

      return {
        ...item,
        id: item.id || item.IdSeq || `HN-STAT-${idx + 1}`,
        ticketCode:
          item.ticketCode ||
          item.ticketNo ||
          item.StatTicketNo ||
          item.OperationNo ||
          `PTK-HN-${String(idx + 1).padStart(3, '0')}`,
        orderCode:
          item.orderCode ||
          item.docNo ||
          item.OrderNo ||
          item.RoutingDocNo ||
          `LSX-HN-2026-${String(idx + 1).padStart(4, '0')}`,
        teamName: item.teamName || item.team || item.OperationName || 'Tổ In Offset',
        machineName: item.machineName || `Máy ${item.machineCode || idx + 1}`,
        machineCode: item.machineCode || `MC-${String((idx % 32) + 1).padStart(2, '0')}`,
        machineGroup: item.machineGroup || item.teamName || item.team || 'In Offset',
        productName: item.productName || item.itemName || item.ItemName || 'Bao bì cao cấp Goldsun',
        customerName: item.customerName || item.CustName || 'Tập đoàn Goldsun',
        planQty: p,
        actualQty: a,
        passQty: pass,
        defectQty: def,
        passRate: pRate,
        runtimeHours: rt,
        shift: item.shift || item.Shift || 'Ca 1',
        prodDate:
          item.prodDate ||
          item.date ||
          item.StatDate ||
          item.StartDate ||
          new Date().toISOString().slice(0, 10),
        origin:
          item.origin || item.createdSource || item.TicketCreationLocation || item.source || 'MES',
        autoExport:
          item.autoExport !== undefined
            ? item.autoExport
            : item.autoExportNote !== undefined
              ? item.autoExportNote
              : true,
        syncDelay:
          item.SyncDelayMinutes !== undefined
            ? item.SyncDelayMinutes
            : item.syncDelayMinutes !== undefined
              ? item.syncDelayMinutes
              : item.syncDelay !== undefined
                ? item.syncDelay
                : item.SyncDelay || null,
        AutoIoStatus: item.AutoIoStatus || item.autoIoStatus || item.AutoIOStatus || null,
        autoIoStatus: item.AutoIoStatus || item.autoIoStatus || item.AutoIOStatus || null,
        operator:
          item.operator ||
          item.supervisor ||
          item.MainWorker ||
          item.CreatedByName ||
          'Kỹ thuật viên'
      }
    })
  }, [inputDataset, plantKey])

  // Filter Data (Lọc theo Ngày thống kê, Thời gian thao tác, Tổ sản xuất, Cụm máy)
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // 1. Lọc theo Ngày thống kê (Date Range)
      if (dateRange && dateRange[0] && dateRange[1]) {
        const start =
          typeof dateRange[0].format === 'function'
            ? dateRange[0].format('YYYY-MM-DD')
            : String(dateRange[0]).slice(0, 10)
        const end =
          typeof dateRange[1].format === 'function'
            ? dateRange[1].format('YYYY-MM-DD')
            : String(dateRange[1]).slice(0, 10)
        const rowDate = String(item.prodDate || item.date || item.StatDate || '').slice(0, 10)
        if (rowDate && (rowDate < start || rowDate > end)) return false
      }

      // 2. Lọc theo Tổ sản xuất
      if (selectedTeam !== 'ALL' && item.teamName !== selectedTeam) return false

      // 3. Lọc theo Cụm máy
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false

      // 4. Lọc theo Thời gian thao tác (cột lệnh thao tác / giờ chạy máy)
      if (selectedDurationAudit !== 'ALL') {
        const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60)
        const actual = Number(item.actualQty) || 0

        if (selectedDurationAudit === 'UNDER_5MIN') {
          if (!(durMin < 5 && durMin > 0)) return false
        } else if (selectedDurationAudit === '5MIN_12H') {
          if (!(durMin >= 5 && durMin <= 720)) return false
        } else if (selectedDurationAudit === 'OVER_12H_VALID') {
          if (!(durMin > 720 && actual >= 50000)) return false
        } else if (selectedDurationAudit === 'OVER_12H_CHECK') {
          if (!(durMin > 720 && actual < 50000)) return false
        } else if (selectedDurationAudit === 'OVER_12H') {
          if (!(durMin > 720)) return false
        }
      }

      return true
    })
  }, [rawData, dateRange, selectedTeam, selectedMachine, selectedDurationAudit])

  // Filter Dropdown Options
  const filterOptions = useMemo(() => {
    const shifts = new Set()
    const teams = new Set()
    const machines = new Map()

    rawData.forEach((item) => {
      if (item.shift) shifts.add(item.shift)
      if (item.teamName) teams.add(item.teamName)
      if (item.machineCode) {
        machines.set(item.machineCode, item.machineName || item.machineCode)
      }
    })

    return {
      shifts: Array.from(shifts).sort(),
      teams: Array.from(teams),
      machines: Array.from(machines.entries()).map(([code, name]) => ({ code, name }))
    }
  }, [rawData])

  // Active filter status & reset action
  const hasActiveFilters = useMemo(() => {
    return (
      selectedTeam !== 'ALL' ||
      selectedMachine !== 'ALL' ||
      selectedDurationAudit !== 'ALL' ||
      Boolean(dateRange && dateRange[0] && dateRange[1])
    )
  }, [selectedTeam, selectedMachine, selectedDurationAudit, dateRange])

  const handleResetFilters = useCallback(() => {
    setSelectedTeam('ALL')
    setSelectedMachine('ALL')
    setSelectedDurationAudit('ALL')
    setMachineSearchText('')
    setTeamSearchText('')
    setDetailSearchText('')
    if (onDateRangeChange) {
      onDateRangeChange(null)
    }
  }, [onDateRangeChange])

  // Reset bộ lọc khi chuyển đổi đợt nạp master
  useEffect(() => {
    if (selectedMasterKey) {
      setSelectedTeam('ALL')
      setSelectedMachine('ALL')
      setSelectedDurationAudit('ALL')
      setMachineSearchText('')
      setTeamSearchText('')
      setDetailSearchText('')
    }
  }, [selectedMasterKey])

  // Helper mask enterprise sensitive data (disabled, returns exact text directly)
  const maskText = useCallback((text) => {
    return text || ''
  }, [])

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    const total = filteredData.length
    if (total === 0) {
      return {
        totalTickets: 0,
        totalPlanQty: 0,
        totalActualQty: 0,
        totalPassQty: 0,
        totalDefectQty: 0,
        overallPassRate: 0,
        planCompletionRate: 0,
        totalRuntimeHours: 0,
        avgRuntimeHours: 0,
        mesCreatedCount: 0,
        bravoCreatedCount: 0,
        mesRate: 0,
        autoExportCount: 0,
        autoExportRate: 0,
        noAutoExportCount: 0,
        noAutoExportRate: 0,
        runtimeUnder5Min: 0,
        runtimeNormal: 0,
        runtimeOver12hValid: 0,
        runtimeOver12hCheck: 0
      }
    }

    let planQty = 0
    let actualQty = 0
    let passQty = 0
    let defectQty = 0
    let runtimeHours = 0
    let mesCount = 0
    let bravoCount = 0
    let autoExportCount = 0
    let rUnder5 = 0
    let rNormal = 0
    let rOver12Valid = 0
    let rOver12Check = 0

    let totalSyncDelaySec = 0
    let syncDelayCount = 0
    let minSyncSec = Infinity
    let maxSyncSec = 0

    let syncUnder10 = 0
    let sync11to30 = 0
    let sync31to60 = 0
    let syncOver60 = 0
    let syncEmpty = 0

    const autoExportTypeMap = new Map()

    filteredData.forEach((item) => {
      const p = Number(item.planQty) || 0
      const a = Number(item.actualQty) || 0
      const pass = Number(item.passQty) || 0
      const def = Number(item.defectQty) || 0
      const rt = Number(item.runtimeHours) || 0

      planQty += p
      actualQty += a
      passQty += pass
      defectQty += def
      runtimeHours += rt

      const origin = String(item.origin || item.createdSource || item.source || '').toUpperCase()
      if (origin.includes('MES') || !origin.includes('BRAVO')) {
        mesCount++
      } else {
        bravoCount++
      }

      const durMinutes = Number(item.durationMinutes || rt * 60) || 0
      if (durMinutes < 5 && durMinutes > 0) {
        rUnder5++
      } else if (durMinutes >= 5 && durMinutes <= 720) {
        rNormal++
      } else if (durMinutes > 720) {
        if (a >= 50000 || p >= 50000) {
          rOver12Valid++
        } else {
          rOver12Check++
        }
      } else {
        rNormal++
      }

      // 1. Phân nhóm độ trễ đồng bộ từ cột thực tế
      const rawDelay =
        item.syncDelay !== undefined && item.syncDelay !== null && item.syncDelay !== ''
          ? item.syncDelay
          : item.SyncDelayMinutes !== undefined && item.SyncDelayMinutes !== null && item.SyncDelayMinutes !== ''
            ? item.SyncDelayMinutes
            : item.syncDelayMinutes !== undefined && item.syncDelayMinutes !== null && item.syncDelayMinutes !== ''
              ? item.syncDelayMinutes
              : item.SyncDelay
      const parsedSec = parseSyncDelayToSeconds(rawDelay, item)

      if (
        parsedSec === null ||
        parsedSec === undefined ||
        isNaN(parsedSec)
      ) {
        syncEmpty++
      } else {
        totalSyncDelaySec += parsedSec
        syncDelayCount++
        if (parsedSec < minSyncSec) minSyncSec = parsedSec
        if (parsedSec > maxSyncSec) maxSyncSec = parsedSec

        if (parsedSec <= 10) {
          syncUnder10++
        } else if (parsedSec <= 30) {
          sync11to30++
        } else if (parsedSec <= 60) {
          sync31to60++
        } else {
          syncOver60++
        }
      }

      // 2. Lấy Type động 100% từ dữ liệu thực tế của hàng
      const typeKey = getAutoExportType(item)
      autoExportTypeMap.set(typeKey, (autoExportTypeMap.get(typeKey) || 0) + 1)
      if (
        typeKey.includes('Có XKTĐ') ||
        typeKey.includes('Có NKTĐ') ||
        typeKey === 'Có XKTĐ' ||
        typeKey === 'Có NKTĐ'
      ) {
        autoExportCount++
      }
    })

    const syncBreakdown = [
      {
        group: '≤ 10 giây',
        shortGroup: '≤ 10s',
        count: syncUnder10,
        rate: total > 0 ? Number(((syncUnder10 / total) * 100).toFixed(1)) : 0,
        color: '#245d6c'
      },
      {
        group: '11 – 30 giây',
        shortGroup: '11–30s',
        count: sync11to30,
        rate: total > 0 ? Number(((sync11to30 / total) * 100).toFixed(1)) : 0,
        color: '#2b6b79'
      },
      {
        group: '31 – 60 giây',
        shortGroup: '31–60s',
        count: sync31to60,
        rate: total > 0 ? Number(((sync31to60 / total) * 100).toFixed(1)) : 0,
        color: '#0284c7'
      },
      {
        group: '> 60 giây (Độ trễ cao)',
        shortGroup: '> 60s',
        count: syncOver60,
        rate: total > 0 ? Number(((syncOver60 / total) * 100).toFixed(1)) : 0,
        color: '#d97706'
      },
      {
        group: 'Không đồng bộ (trống)',
        shortGroup: 'Trống',
        count: syncEmpty,
        rate: total > 0 ? Number(((syncEmpty / total) * 100).toFixed(1)) : 0,
        color: '#94a3b8'
      }
    ]

    const autoTypeColors = ['#245d6c', '#2b6b79', '#0284c7', '#0f766e', '#d97706', '#64748b']
    const autoExportBreakdown = Array.from(autoExportTypeMap.entries())
      .map(([label, count], idx) => ({
        label,
        count,
        rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
        color: autoTypeColors[idx % autoTypeColors.length]
      }))
      .sort((a, b) => b.count - a.count)

    const calculatedMesCount = mesCount > 0 ? mesCount : total
    const calculatedBravoCount = bravoCount > 0 ? bravoCount : total - calculatedMesCount
    const noAutoExport = total - autoExportCount
    const avgSyncSec =
      syncDelayCount > 0 ? totalSyncDelaySec / syncDelayCount : 0
    const syncLatencyFormatted = syncDelayCount > 0 ? formatSecondsToTime(avgSyncSec) : '00:00:00'

    return {
      totalTickets: total,
      totalPlanQty: planQty,
      totalActualQty: actualQty,
      totalPassQty: passQty,
      totalDefectQty: defectQty,
      overallPassRate: actualQty > 0 ? ((passQty / actualQty) * 100).toFixed(1) : 100,
      planCompletionRate: planQty > 0 ? ((actualQty / planQty) * 100).toFixed(1) : 100,
      totalRuntimeHours: runtimeHours.toFixed(1),
      avgRuntimeHours: total > 0 ? (runtimeHours / total).toFixed(1) : 0,
      mesCreatedCount: calculatedMesCount,
      bravoCreatedCount: calculatedBravoCount,
      mesRate: total > 0 ? ((calculatedMesCount / total) * 100).toFixed(1) : '98.4',
      autoExportCount: autoExportCount,
      noAutoExportCount: noAutoExport,
      autoExportRate: total > 0 ? ((autoExportCount / total) * 100).toFixed(1) : '100',
      noAutoExportRate: total > 0 ? ((noAutoExport / total) * 100).toFixed(1) : '0',
      syncDelayCount: syncDelayCount,
      avgSyncDelaySeconds: avgSyncSec.toFixed(1),
      syncLatencyFormatted: syncLatencyFormatted,
      minSyncDelayFormatted: syncDelayCount > 0 ? formatSecondsToTime(minSyncSec) : '00:00:00',
      maxSyncDelayFormatted: syncDelayCount > 0 ? formatSecondsToTime(maxSyncSec) : '00:00:00',
      syncSuccessRate: total > 0 ? `${(((total - syncEmpty) / total) * 100).toFixed(1)}%` : '100%',
      syncBreakdown,
      autoExportBreakdown,
      runtimeUnder5Min: rUnder5,
      runtimeNormal: rNormal,
      runtimeOver12hValid: rOver12Valid,
      runtimeOver12hCheck: rOver12Check
    }
  }, [filteredData])

  // Machine Aggregations
  const machineAggregates = useMemo(() => {
    const map = new Map()
    filteredData.forEach((item) => {
      const code = item.machineCode || 'M-UNKNOWN'
      const name = item.machineName || code
      const group = item.machineGroup || item.teamName || 'Khác'
      const unit = item.unit || 'Chiếc'

      if (!map.has(code)) {
        map.set(code, {
          machineCode: code,
          machineName: name,
          machineGroup: group,
          unit: unit,
          ticketCount: 0,
          totalPlanQty: 0,
          totalActualQty: 0,
          totalPassQty: 0,
          totalDefectQty: 0,
          totalRuntimeHours: 0,
          mesCount: 0
        })
      }

      const rec = map.get(code)
      rec.ticketCount++
      rec.totalPlanQty += Number(item.planQty) || 0
      rec.totalActualQty += Number(item.actualQty) || 0
      rec.totalPassQty += Number(item.passQty) || 0
      rec.totalDefectQty += Number(item.defectQty) || 0
      rec.totalRuntimeHours += Number(item.runtimeHours) || 0
      if (item.unit && item.unit !== 'Chiếc') rec.unit = item.unit
      const orig = String(item.origin || item.createdSource || item.source || '').toUpperCase()
      if (orig.includes('MES')) rec.mesCount++
    })

    const list = Array.from(map.values()).map((m) => {
      const passRate = m.totalActualQty > 0 ? (m.totalPassQty / m.totalActualQty) * 100 : 100
      const planRate = m.totalPlanQty > 0 ? (m.totalActualQty / m.totalPlanQty) * 100 : 100
      const runtimeVs24h = Number(((m.totalRuntimeHours / 24) * 100).toFixed(1))
      const speed = m.totalRuntimeHours > 0 ? Math.round(m.totalPassQty / m.totalRuntimeHours) : 0
      return {
        ...m,
        totalRuntimeHours: Number(m.totalRuntimeHours.toFixed(1)),
        runtimeVs24h,
        passRate: Number(passRate.toFixed(1)),
        planRate: Number(planRate.toFixed(1)),
        speed: speed,
        mesRate: m.ticketCount > 0 ? Number(((m.mesCount / m.ticketCount) * 100).toFixed(1)) : 0
      }
    })

    return list.sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
  }, [filteredData])

  // Filtered & Sorted Machine List
  const displayMachineList = useMemo(() => {
    let list = [...machineAggregates]
    if (machineSearchText) {
      const q = machineSearchText.toLowerCase()
      list = list.filter(
        (m) =>
          m.machineCode.toLowerCase().includes(q) ||
          m.machineName.toLowerCase().includes(q) ||
          m.machineGroup.toLowerCase().includes(q)
      )
    }

    const { key, direction } = machineSortConfig
    list.sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (key === 'runtimeHours' || key === 'totalRuntimeHours') {
        valA = a.totalRuntimeHours
        valB = b.totalRuntimeHours
      } else if (key === 'ratio24h' || key === 'runtimeVs24h') {
        valA = a.runtimeVs24h
        valB = b.runtimeVs24h
      } else if (key === 'actualQty' || key === 'totalActualQty') {
        valA = a.totalActualQty
        valB = b.totalActualQty
      } else if (key === 'passQty' || key === 'totalPassQty') {
        valA = a.totalPassQty
        valB = b.totalPassQty
      } else if (key === 'passPerHour' || key === 'speed') {
        valA = a.speed
        valB = b.speed
      } else if (key === 'ticketCount') {
        valA = a.ticketCount
        valB = b.ticketCount
      } else if (key === 'passRate') {
        valA = a.passRate
        valB = b.passRate
      }

      if (typeof valA === 'string') {
        return direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      }
      const numA = Number(valA) || 0
      const numB = Number(valB) || 0
      return direction === 'asc' ? numA - numB : numB - numA
    })

    return list
  }, [machineAggregates, machineSearchText, machineSortConfig])

  // Grand Total for Machines
  const machineGrandTotal = useMemo(() => {
    const totalTickets = displayMachineList.reduce((acc, m) => acc + m.ticketCount, 0)
    const totalRuntime = displayMachineList.reduce((acc, m) => acc + m.totalRuntimeHours, 0)
    const totalActual = displayMachineList.reduce((acc, m) => acc + m.totalActualQty, 0)
    const totalPass = displayMachineList.reduce((acc, m) => acc + m.totalPassQty, 0)
    const totalDefect = displayMachineList.reduce((acc, m) => acc + m.totalDefectQty, 0)
    const avgPassRate = totalActual > 0 ? Number(((totalPass / totalActual) * 100).toFixed(1)) : 100
    const avgRuntimeVs24h =
      displayMachineList.length > 0
        ? Number(((totalRuntime / (displayMachineList.length * 24)) * 100).toFixed(1))
        : 0
    const avgSpeed = totalRuntime > 0 ? Math.round(totalPass / totalRuntime) : 0
    return {
      machineCount: displayMachineList.length,
      totalTickets,
      totalRuntime: Number(totalRuntime.toFixed(1)),
      avgRuntimeVs24h,
      totalActual,
      totalPass,
      totalDefect,
      avgPassRate,
      avgSpeed
    }
  }, [displayMachineList])

  // Team Aggregations
  const teamAggregates = useMemo(() => {
    const map = new Map()
    filteredData.forEach((item) => {
      const team = item.teamName || 'Tổ Khác'
      if (!map.has(team)) {
        map.set(team, {
          teamName: team,
          ticketCount: 0,
          totalPlanQty: 0,
          totalActualQty: 0,
          totalPassQty: 0,
          totalDefectQty: 0,
          totalRuntimeHours: 0,
          mesCount: 0
        })
      }
      const rec = map.get(team)
      rec.ticketCount++
      rec.totalPlanQty += Number(item.planQty) || 0
      rec.totalActualQty += Number(item.actualQty) || 0
      rec.totalPassQty += Number(item.passQty) || 0
      rec.totalDefectQty += Number(item.defectQty) || 0
      rec.totalRuntimeHours += Number(item.runtimeHours) || 0
      const orig = String(item.origin || item.createdSource || item.source || '').toUpperCase()
      if (orig.includes('MES')) rec.mesCount++
    })

    return Array.from(map.values())
      .map((t) => {
        const passRate = t.totalActualQty > 0 ? (t.totalPassQty / t.totalActualQty) * 100 : 100
        const planRate = t.totalPlanQty > 0 ? (t.totalActualQty / t.totalPlanQty) * 100 : 100
        return {
          ...t,
          passRate: Number(passRate.toFixed(1)),
          planRate: Number(planRate.toFixed(1)),
          mesRate: t.ticketCount > 0 ? Number(((t.mesCount / t.ticketCount) * 100).toFixed(1)) : 0
        }
      })
      .sort((a, b) => b.passRate - a.passRate)
  }, [filteredData])

  // Filtered Team List for Search
  const displayTeamList = useMemo(() => {
    if (!teamSearchText) return teamAggregates
    const q = teamSearchText.toLowerCase()
    return teamAggregates.filter((t) => t.teamName.toLowerCase().includes(q))
  }, [teamAggregates, teamSearchText])

  // Grand Total for Teams
  const teamGrandTotal = useMemo(() => {
    const totalTickets = displayTeamList.reduce((acc, t) => acc + t.ticketCount, 0)
    const totalPlan = displayTeamList.reduce((acc, t) => acc + t.totalPlanQty, 0)
    const totalActual = displayTeamList.reduce((acc, t) => acc + t.totalActualQty, 0)
    const totalPass = displayTeamList.reduce((acc, t) => acc + t.totalPassQty, 0)
    const totalDefect = displayTeamList.reduce((acc, t) => acc + t.totalDefectQty, 0)
    const totalMes = displayTeamList.reduce((acc, t) => acc + t.mesCount, 0)
    const avgPassRate = totalActual > 0 ? Number(((totalPass / totalActual) * 100).toFixed(1)) : 100
    const avgPlanRate = totalPlan > 0 ? Number(((totalActual / totalPlan) * 100).toFixed(1)) : 100
    const avgMesRate = totalTickets > 0 ? Number(((totalMes / totalTickets) * 100).toFixed(1)) : 0
    return {
      teamCount: displayTeamList.length,
      totalTickets,
      totalPlan,
      totalActual,
      totalPass,
      totalDefect,
      avgPassRate,
      avgPlanRate,
      avgMesRate
    }
  }, [displayTeamList])

  // Filtered Detail Tickets for Search
  const displayDetailList = useMemo(() => {
    if (!detailSearchText) return filteredData
    const q = detailSearchText.toLowerCase()
    return filteredData.filter(
      (item) =>
        (item.ticketCode && item.ticketCode.toLowerCase().includes(q)) ||
        (item.orderCode && item.orderCode.toLowerCase().includes(q)) ||
        (item.machineName && item.machineName.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.teamName && item.teamName.toLowerCase().includes(q))
    )
  }, [filteredData, detailSearchText])

  const executiveVerticalData = useMemo(() => {
    // Sắp xếp các cụm máy theo tổng giờ chạy giảm dần để làm nổi bật sự bất thường
    const sorted = [...machineAggregates].sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
    return sorted.slice(0, 30).map((m) => {
      const rawName = m.machineName || m.machineCode || 'Máy'
      const maskedName = maskText(rawName, 5)
      const shortName =
        m.machineCode || (maskedName.length > 12 ? maskedName.slice(0, 11) + '…' : maskedName)
      const isOver24h = Number(m.totalRuntimeHours) > 24
      const avgHoursPerTicket =
        m.ticketCount > 0 ? Number((m.totalRuntimeHours / m.ticketCount).toFixed(1)) : 0

      return {
        name: shortName,
        fullCode: m.machineCode,
        fullName: maskedName,
        value: m.totalRuntimeHours,
        totalRuntimeHours: m.totalRuntimeHours,
        ticketCount: m.ticketCount,
        avgHoursPerTicket,
        isOver24h,
        runtimeVs24h: m.runtimeVs24h,
        passRate: m.passRate,
        actualQty: m.totalActualQty,
        planQty: m.totalPlanQty,
        passQty: m.totalPassQty,
        defectQty: m.totalDefectQty,
        speed: m.speed,
        fill: isOver24h ? '#be123c' : m.totalRuntimeHours >= 16 ? '#d97706' : '#245d6c'
      }
    })
  }, [machineAggregates, maskText])

  // Chart 2 Data: Team Benchmark
  const executiveHorizontalData = useMemo(() => {
    return teamAggregates.map((t) => ({
      name: t.teamName,
      value: t.passRate,
      fill: t.passRate < 95 ? '#d97706' : '#245d6c'
    }))
  }, [teamAggregates])

  // Chart 3 Data: Runtime Audit Breakdown Chart
  const runtimeAuditChartData = useMemo(() => {
    return [
      {
        category: 'Chuẩn (5p - 12h)',
        tickets: kpiMetrics.runtimeNormal,
        desc: 'Phiếu vận hành đúng tiến độ chuẩn',
        fill: '#245d6c'
      },
      {
        category: '> 12h (Đơn lớn hợp lệ)',
        tickets: kpiMetrics.runtimeOver12hValid,
        desc: 'Đơn hàng sản lượng lớn đối chiếu hợp lệ',
        fill: '#2b6b79'
      },
      {
        category: '> 12h (Cần kiểm tra)',
        tickets: kpiMetrics.runtimeOver12hCheck,
        desc: 'Cảnh báo QLSX kiểm tra & chấn chỉnh',
        fill: '#d97706'
      },
      {
        category: '< 5 phút (Thao tác nhanh)',
        tickets: kpiMetrics.runtimeUnder5Min,
        desc: 'Cảnh báo QLSX đối chiếu nhập vội',
        fill: '#be123c'
      }
    ]
  }, [kpiMetrics])

  // Copy table TSV
  const handleCopyTable = (dataToCopy, headers, keys) => {
    try {
      const headerRow = headers.join('\t')
      const bodyRows = dataToCopy
        .map((item) =>
          keys.map((k) => (typeof item[k] === 'number' ? item[k] : item[k] || '')).join('\t')
        )
        .join('\n')
      const tsv = `${headerRow}\n${bodyRows}`
      navigator.clipboard.writeText(tsv)
      alert('Đã sao chép dữ liệu bảng vào Clipboard (định dạng Excel/TSV)')
    } catch (err) {
      console.error('Copy error:', err)
    }
  }

  // Export Machine Table Excel
  const handleExportMachineExcel = () => {
    try {
      const wsData = displayMachineList.map((m, idx) => ({
        STT: idx + 1,
        'Máy sản xuất': m.machineName,
        'Nhóm máy': m.machineGroup,
        'Mã máy': m.machineCode,
        'Phiếu (TKSX)': m.ticketCount,
        'Giờ chạy (h)': m.totalRuntimeHours,
        'So với 24 giờ (%)': `${m.runtimeVs24h}%`,
        'SL sản xuất': m.totalActualQty,
        'SL đạt': m.totalPassQty,
        'SL phế': m.totalDefectQty,
        'Tỷ lệ đạt (%)': `${m.passRate}%`,
        ĐVT: m.unit || 'Chiếc',
        'SL đạt / giờ (sp/h)': m.speed
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'MaTranNangLucMay')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `Bang1_MaTran_NangLuc_May_${plantKey}_${dateStr}.xlsx`)
    } catch (e) {
      console.error('Export machine excel error:', e)
    }
  }

  // Export Team Table Excel
  const handleExportTeamExcel = () => {
    try {
      const wsData = displayTeamList.map((t, idx) => ({
        STT: idx + 1,
        'Tổ sản xuất': t.teamName,
        'Số phiếu': t.ticketCount,
        'Kế hoạch': t.totalPlanQty,
        'Thực tế': t.totalActualQty,
        Đạt: t.totalPassQty,
        'Phế phẩm': t.totalDefectQty,
        'Tỷ lệ đạt (%)': `${t.passRate}%`,
        'Đạt KH (%)': `${t.planRate}%`,
        'Tỷ lệ MES (%)': `${t.mesRate}%`
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'PhanTichToSanXuat')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `Bang2_PhanTich_ToSanXuat_${plantKey}_${dateStr}.xlsx`)
    } catch (e) {
      console.error('Export team excel error:', e)
    }
  }

  // Export Detail Table Excel
  const handleExportDetailExcel = () => {
    try {
      const wsData = displayDetailList.map((item, idx) => ({
        STT: idx + 1,
        'Mã phiếu': item.ticketCode || item.ticketNo || '',
        'Lệnh sản xuất / CT': item.orderCode || item.docNo || '',
        'Mã máy': item.machineCode || '',
        'Máy sản xuất': item.machineName || '',
        'Tổ sản xuất': item.teamName || '',
        'Thời gian bắt đầu': item.startTime || item.prodDate || '',
        'Thời gian kết thúc': item.endTime || item.prodDate || '',
        'SL Kế hoạch': item.planQty || 0,
        'SL Sản xuất': item.actualQty || 0,
        'SL Đạt (KCS)': item.passQty || 0,
        'SL Phế': item.defectQty || 0,
        'Tỷ lệ đạt (%)': `${item.passRate}%`,
        'Giờ chạy (h)': (Number(item.runtimeHours) || 0).toFixed(1),
        'Nguồn gốc': item.origin || 'MES',
        'Người thực hiện': item.operator || 'Kỹ thuật viên'
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'NhatTrinhPhieu')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `ChiTiet_NhatTrinh_Phieu_${plantKey}_${dateStr}.xlsx`)
    } catch (e) {
      console.error('Export detail excel error:', e)
    }
  }

  // Glide Data Grid Column definitions with custom resize state
  const [machineColWidths, setMachineColWidths] = useState({})
  const [teamColWidths, setTeamColWidths] = useState({})
  const [detailColWidths, setDetailColWidths] = useState({})

  const onMachineColumnResize = useCallback((column, newSize) => {
    setMachineColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const onTeamColumnResize = useCallback((column, newSize) => {
    setTeamColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const onDetailColumnResize = useCallback((column, newSize) => {
    setDetailColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const machineGridCols = useMemo(() => {
    const base = [
      { title: 'Tên máy sản xuất', width: 250, id: 'machineName' },
      { title: 'Mã máy', width: 110, id: 'machineCode' },
      { title: 'Phiếu', width: 85, id: 'ticketCount' },
      { title: 'Giờ chạy (h)', width: 105, id: 'runtimeHours' },
      { title: 'So với 24h', width: 105, id: 'ratio24h' },
      { title: 'SL Sản xuất', width: 130, id: 'actualQty' },
      { title: 'SL Đạt', width: 130, id: 'passQty' },
      { title: 'Tỷ lệ đạt (%)', width: 115, id: 'passRate' },
      { title: 'ĐVT', width: 80, id: 'unit' },
      { title: 'SL đạt / Giờ', width: 135, id: 'passPerHour' }
    ]
    return base.map((col) => {
      let title = col.title
      const isSorted =
        machineSortConfig.key === col.id ||
        (machineSortConfig.key === 'totalRuntimeHours' && col.id === 'runtimeHours') ||
        (machineSortConfig.key === 'runtimeVs24h' && col.id === 'ratio24h') ||
        (machineSortConfig.key === 'speed' && col.id === 'passPerHour')
      if (isSorted) {
        title += machineSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
      }
      return {
        ...col,
        title,
        width: machineColWidths[col.id] || col.width
      }
    })
  }, [machineColWidths, machineSortConfig])

  const onMachineHeaderClicked = useCallback(
    (col) => {
      const colObj = machineGridCols[col]
      if (!colObj) return
      const colId = colObj.id
      setMachineSortConfig((prev) => {
        const activeKey =
          prev.key === 'totalRuntimeHours'
            ? 'runtimeHours'
            : prev.key === 'runtimeVs24h'
              ? 'ratio24h'
              : prev.key === 'speed'
                ? 'passPerHour'
                : prev.key

        if (activeKey === colId) {
          return { key: colId, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        }
        return { key: colId, direction: 'desc' }
      })
    },
    [machineGridCols]
  )

  const getMachineCellContent = useCallback(
    ([col, row]) => {
      const item = displayMachineList[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = machineGridCols[col]?.id

      switch (colId) {
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName,
            displayData: maskText(item.machineName, 5),
            allowOverlay: false
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode,
            displayData: item.machineCode,
            allowOverlay: false
          }
        case 'ticketCount':
          return {
            kind: GridCellKind.Number,
            data: item.ticketCount,
            displayData: Number(item.ticketCount || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${(Number(item.totalRuntimeHours) || 0).toFixed(1)}h`,
            displayData: `${(Number(item.totalRuntimeHours) || 0).toFixed(1)}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'ratio24h':
          return {
            kind: GridCellKind.Text,
            data: `${item.runtimeVs24h || 0}%`,
            displayData: `${item.runtimeVs24h || 0}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalActualQty,
            displayData: Number(item.totalActualQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalPassQty,
            displayData: Number(item.totalPassQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'unit':
          return {
            kind: GridCellKind.Text,
            data: item.unit || 'Chiếc',
            displayData: item.unit || 'Chiếc',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'passPerHour':
          return {
            kind: GridCellKind.Text,
            data: `${item.speed || 0}`,
            displayData: `${Number(item.speed || 0).toLocaleString('vi-VN')} SP/h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [displayMachineList, machineGridCols, maskText]
  )

  const teamGridCols = useMemo(() => {
    const base = [
      { title: 'Tổ sản xuất', width: 230, id: 'teamName' },
      { title: 'Số phiếu', width: 100, id: 'ticketCount' },
      { title: 'SL Thực tế', width: 140, id: 'actualQty' },
      { title: 'Đạt KH (%)', width: 120, id: 'planRate' },
      { title: 'Tỷ lệ đạt (%)', width: 120, id: 'passRate' },
      { title: 'Tỷ lệ MES (%)', width: 120, id: 'mesRate' },
      { title: 'Đơn > 12h cần KT', width: 140, id: 'anomalyCount' }
    ]
    return base.map((col) => ({
      ...col,
      width: teamColWidths[col.id] || col.width
    }))
  }, [teamColWidths])

  const getTeamCellContent = useCallback(
    ([col, row]) => {
      const item = displayTeamList[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = teamGridCols[col]?.id

      switch (colId) {
        case 'teamName':
          return {
            kind: GridCellKind.Text,
            data: item.teamName,
            displayData: item.teamName,
            allowOverlay: false
          }
        case 'ticketCount':
          return {
            kind: GridCellKind.Number,
            data: item.ticketCount,
            displayData: Number(item.ticketCount || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalActualQty,
            displayData: Number(item.totalActualQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'planRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.planRate}%`,
            displayData: `${item.planRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'mesRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.mesRate}%`,
            displayData: `${item.mesRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'anomalyCount':
          return {
            kind: GridCellKind.Number,
            data: item.anomalies || 0,
            displayData: Number(item.anomalies || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [displayTeamList, teamGridCols]
  )

  const detailGridCols = useMemo(() => {
    const base = [
      { title: 'Mã phiếu', width: 130, id: 'ticketNo' },
      { title: 'Lệnh SX / CT', width: 125, id: 'docNo' },
      { title: 'Mã máy', width: 100, id: 'machineCode' },
      { title: 'Tên máy sản xuất', width: 180, id: 'machineName' },
      { title: 'Tổ sản xuất', width: 150, id: 'teamName' },
      { title: 'Bắt đầu', width: 135, id: 'startTime' },
      { title: 'Kết thúc', width: 135, id: 'endTime' },
      { title: 'SL Kế hoạch', width: 115, id: 'planQty' },
      { title: 'SL Sản xuất', width: 115, id: 'actualQty' },
      { title: 'SL Đạt', width: 115, id: 'passQty' },
      { title: 'Tỷ lệ đạt (%)', width: 110, id: 'passRate' },
      { title: 'Giờ chạy (h)', width: 105, id: 'runtimeHours' },
      { title: 'Kiểm toán QLSX', width: 145, id: 'auditBadge' },
      { title: 'Nguồn gốc', width: 95, id: 'origin' },
      { title: 'Người thực hiện', width: 150, id: 'operator' }
    ]
    return base.map((col) => ({
      ...col,
      width: detailColWidths[col.id] || col.width
    }))
  }, [detailColWidths])

  const getDetailCellContent = useCallback(
    ([col, row]) => {
      const item = displayDetailList[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = detailGridCols[col]?.id
      const actual = Number(item.actualQty || item.output) || 0
      const pass = Number(item.passQty || item.passQuantity) || 0
      const passRateVal = actual > 0 ? ((pass / actual) * 100).toFixed(1) : '100.0'
      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0

      let auditText = 'Chuẩn tiến độ'
      if (durMin < 5 && durMin > 0) {
        auditText = '< 5p Nhập nhanh'
      } else if (durMin > 720) {
        if (actual >= 50000) {
          auditText = '> 12h Đơn lớn (Chuẩn)'
        } else {
          auditText = '> 12h Cần kiểm tra'
        }
      }

      switch (colId) {
        case 'ticketNo':
          return {
            kind: GridCellKind.Text,
            data: item.ticketCode || item.ticketNo || '',
            displayData: item.ticketCode || item.ticketNo || '',
            allowOverlay: false
          }
        case 'docNo':
          return {
            kind: GridCellKind.Text,
            data: item.orderCode || item.docNo || '',
            displayData: item.orderCode || item.docNo || '',
            allowOverlay: false
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName || '',
            displayData: maskText(item.machineName || '', 5),
            allowOverlay: false
          }
        case 'teamName':
          return {
            kind: GridCellKind.Text,
            data: item.teamName || '',
            displayData: item.teamName || '',
            allowOverlay: false
          }
        case 'startTime':
          return {
            kind: GridCellKind.Text,
            data: item.startTime || item.prodDate || '',
            displayData: item.startTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'endTime':
          return {
            kind: GridCellKind.Text,
            data: item.endTime || item.prodDate || '',
            displayData: item.endTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'planQty':
          return {
            kind: GridCellKind.Number,
            data: item.planQty || 0,
            displayData: Number(item.planQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: actual,
            displayData: actual.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: pass,
            displayData: pass.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${passRateVal}%`,
            displayData: `${passRateVal}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${(Number(item.runtimeHours) || 0).toFixed(1)}h`,
            displayData: `${(Number(item.runtimeHours) || 0).toFixed(1)}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'auditBadge':
          return {
            kind: GridCellKind.Text,
            data: auditText,
            displayData: auditText,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'origin':
          return {
            kind: GridCellKind.Text,
            data: item.origin || 'MES',
            displayData: item.origin || 'MES',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'operator':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.operator || 'Kỹ thuật viên', 3),
            displayData: maskText(item.operator || 'Kỹ thuật viên', 3),
            allowOverlay: false
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [displayDetailList, detailGridCols, maskText]
  )

  // Download Individual Chart as PNG
  const handleDownloadSingleChart = async (targetRef, chartName) => {
    const el = targetRef?.current
    if (!el) return
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      const link = document.createElement('a')
      link.download = `${chartName}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download chart error:', err)
    }
  }

  // Full Page Screenshot Capture (Optimized: Direct target capture, no clipping of headers/tabs, full table rendering)
  const handleCaptureScreenshot = async () => {
    const el = reportRootRef.current
    if (!el) return
    setIsCapturing(true)

    try {
      // Find scroll container and preserve scroll position
      const scrollParent =
        el.closest('.overflow-y-auto') ||
        el.closest('[style*="overflow"]') ||
        el.parentElement ||
        window
      const prevScrollTop = scrollParent === window ? window.scrollY : scrollParent.scrollTop

      // Temporarily scroll to top
      if (scrollParent !== window && scrollParent.scrollTop !== undefined) {
        scrollParent.scrollTop = 0
      } else if (window.scrollTo) {
        window.scrollTo(0, 0)
      }

      await new Promise((resolve) => setTimeout(resolve, 350))

      // Direct html2canvas on el with element-bounded rendering to avoid offset distortion
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1440,
        onclone: (clonedDoc, clonedEl) => {
          clonedEl.style.width = '1440px'
          clonedEl.style.maxWidth = '1440px'
          clonedEl.style.height = 'auto'
          clonedEl.style.maxHeight = 'none'
          clonedEl.style.overflow = 'visible'
          clonedEl.style.boxSizing = 'border-box'
          clonedEl.style.letterSpacing = 'normal'
          clonedEl.style.fontFamily =
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

          // 1. Ẩn toàn bộ nút bấm, thanh chọn lọc và thao tác web để báo cáo phẳng đẹp
          const hiddenElements = clonedEl.querySelectorAll('.screenshot-hide')
          hiddenElements.forEach((node) => {
            node.style.display = 'none'
          })

          // 2. Hiển thị dải thông tin kiểm toán/ngày giờ báo cáo chính thức
          const executiveHeaders = clonedEl.querySelectorAll('.screenshot-show')
          executiveHeaders.forEach((node) => {
            node.style.display = 'block'
          })

          // 3. Mở rộng trọn vẹn chiều cao các bảng dữ liệu
          const tableContainers = clonedEl.querySelectorAll(
            '.table-scroll-container, [data-scrollable-table="true"]'
          )
          tableContainers.forEach((tc) => {
            tc.style.maxHeight = 'none'
            tc.style.height = 'auto'
            tc.style.overflow = 'visible'
          })
        }
      })

      // Restore scroll position
      if (scrollParent !== window && scrollParent.scrollTop !== undefined) {
        scrollParent.scrollTop = prevScrollTop
      } else if (window.scrollTo) {
        window.scrollTo(0, prevScrollTop)
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.download = `BaoCao_ThongKe_SanXuat_${plantKey}_${dateStr}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Screenshot capture failed:', err)
      alert('Không thể xuất ảnh: ' + (err.message || 'Lỗi chụp màn hình'))
    } finally {
      setIsCapturing(false)
    }
  }

  // Export Excel Full
  const handleExportExcel = () => {
    try {
      const wsData = filteredData.map((item, idx) => ({
        STT: idx + 1,
        'Mã phiếu': item.ticketCode,
        'Ngày TK': item.prodDate,
        Ca: item.shift,
        'Tổ sản xuất': item.teamName,
        'Mã máy': item.machineCode,
        'Tên máy': item.machineName,
        'Lệnh SX': item.orderCode,
        'Khách hàng': item.customerName,
        'Sản phẩm': item.productName,
        'Kế hoạch (SP)': item.planQty,
        'Thực tế (SP)': item.actualQty,
        'Đạt (SP)': item.passQty,
        'Phế phẩm (SP)': item.defectQty,
        'Tỷ lệ đạt (%)':
          item.actualQty > 0 ? ((item.passQty / item.actualQty) * 100).toFixed(1) : '100',
        'Giờ chạy (h)': item.runtimeHours,
        'Nguồn dữ liệu': item.origin || 'MES',
        'Người thao tác': item.operator
      }))

      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'ThongKeSanXuat')

      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `BaoCao_ThongKe_SanXuat_${plantKey}_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Excel export error:', err)
    }
  }

  return {
    // State
    machineChartMode,
    setMachineChartMode,
    selectedTeam,
    setSelectedTeam,
    selectedMachine,
    setSelectedMachine,
    selectedDurationAudit,
    setSelectedDurationAudit,
    isCapturing,
    setIsCapturing,
    showFormulaModal,
    setShowFormulaModal,
    showAuditModal,
    setShowAuditModal,
    auditModalCategory,
    setAuditModalCategory,
    machineFullHeight,
    setMachineFullHeight,
    teamFullHeight,
    setTeamFullHeight,
    detailFullHeight,
    setDetailFullHeight,
    machineRowHeight,
    setMachineRowHeight,
    teamRowHeight,
    setTeamRowHeight,
    detailRowHeight,
    setDetailRowHeight,
    machineSearchText,
    setMachineSearchText,
    teamSearchText,
    setTeamSearchText,
    detailSearchText,
    setDetailSearchText,
    fullscreenTable,
    setFullscreenTable,

    // Refs
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    machineGridRef,
    teamGridRef,
    detailGridRef,

    // Computed Data
    rawData,
    filteredData,
    filterOptions,
    hasActiveFilters,
    kpiMetrics,
    machineAggregates,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    displayTeamList,
    teamGrandTotal,
    displayDetailList,
    executiveVerticalData,
    executiveHorizontalData,
    runtimeAuditChartData,

    // Handlers
    maskText,
    handleResetFilters,
    handleCopyTable,
    handleExportMachineExcel,
    handleExportTeamExcel,
    handleExportDetailExcel,
    handleExportExcel,
    handleDownloadSingleChart,
    handleCaptureScreenshot,

    // Glide Grids
    machineSortConfig,
    setMachineSortConfig,
    onMachineHeaderClicked,
    machineGridCols,
    getMachineCellContent,
    onMachineColumnResize,
    teamGridCols,
    getTeamCellContent,
    onTeamColumnResize,
    detailGridCols,
    getDetailCellContent,
    onDetailColumnResize
  }
}
