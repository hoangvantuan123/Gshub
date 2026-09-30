import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { initialHanoiGs1Stats, initialQuevoGs5Stats } from '../../../../common/reportUtils'

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

// Helper format date & time chuẩn xác cho báo cáo (YYYY-MM-DD HH:mm:ss)
export function formatReportTimeOrDateTime(rawVal, defaultDate = '', fallbackTime = '') {
  if (!rawVal && !fallbackTime) return defaultDate ? `${defaultDate} 07:30:00` : ''
  const val = rawVal || fallbackTime
  if (!val) return ''

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const Y = val.getFullYear()
    const M = String(val.getMonth() + 1).padStart(2, '0')
    const D = String(val.getDate()).padStart(2, '0')
    const h = String(val.getHours()).padStart(2, '0')
    const m = String(val.getMinutes()).padStart(2, '0')
    const s = String(val.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }

  const str = String(val).trim()
  if (!str || str === 'null' || str === 'undefined') return ''

  // ISO string like 2026-09-28T07:45:10Z or 2026-09-28T07:45:10
  if (str.includes('T')) {
    return str.slice(0, 19).replace('T', ' ')
  }

  // Already standard format YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str.length === 16 ? `${str}:00` : str
  }

  // Just HH:mm:ss or HH:mm
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const padTime = str.length <= 5 ? `${str}:00` : str
    return defaultDate ? `${defaultDate} ${padTime}` : padTime
  }

  // Try parse as standard date
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime()) && str.length >= 10) {
    const Y = parsed.getFullYear()
    const M = String(parsed.getMonth() + 1).padStart(2, '0')
    const D = String(parsed.getDate()).padStart(2, '0')
    const h = String(parsed.getHours()).padStart(2, '0')
    const m = String(parsed.getMinutes()).padStart(2, '0')
    const s = String(parsed.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }

  return str
}

// Helper check if machine is manual / contains 'thủ công'
export const isManualMachine = (itemOrName) => {
  if (!itemOrName) return false
  const text =
    typeof itemOrName === 'string'
      ? itemOrName
      : `${itemOrName.machineName || ''} ${itemOrName.machineCode || ''} ${itemOrName.machineGroup || ''} ${itemOrName.name || ''}`

  const lower = text.toLowerCase()
  if (lower.includes('thủ công')) return true
  const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized.includes('thu cong')
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
  const [showManualMachines, setShowManualMachines] = useState(false) // Mặc định ẩn máy thủ công, tích chọn để hiện
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

  // Team Sorting State: Mặc định sắp xếp theo Tỷ lệ đạt cao nhất lên đầu
  const [teamSortConfig, setTeamSortConfig] = useState({
    key: 'passRate',
    direction: 'desc'
  })

  // Detail Sorting State: Mặc định sắp xếp theo Thời gian bắt đầu mới nhất
  const [detailSortConfig, setDetailSortConfig] = useState({
    key: 'startTime',
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
    const isQuevoPlant =
      plantKey === 'quevo' ||
      plantKey === 'quevo_gs5' ||
      String(plantKey).toLowerCase().includes('quevo') ||
      String(plantKey).toLowerCase().includes('gs5')

    const list =
      inputDataset && inputDataset.length > 0
        ? inputDataset
        : isQuevoPlant
          ? initialQuevoGs5Stats
          : initialHanoiGs1Stats

    return list.map((item, idx) => {
      const p = Number(item.planQty || item.TargetProdQty || item.StandardMeters) || 0
      const a = Number(item.actualQty || item.ProdQty || item.ActualMeters) || p || 0
      const pass = Number(item.passQty || item.StatPassQty) || a || 0
      const def = Number(item.defectQty) || Math.max(0, a - pass) || 0
      const pRate = a > 0 ? Number(((pass / a) * 100).toFixed(1)) : 100

      // Ưu tiên tuyệt đối trường DurationMinutes đã được chuẩn hóa theo phút
      let durMinutes =
        item.DurationMinutes !== undefined && item.DurationMinutes !== null && item.DurationMinutes !== ''
          ? Number(item.DurationMinutes)
          : item.durationMinutes !== undefined && item.durationMinutes !== null && item.durationMinutes !== ''
            ? Number(item.durationMinutes)
            : undefined

      // Nếu chưa có durMinutes, tính trực tiếp theo phút từ StartTime và EndTime
      const rawStart = item.startTime || item.StartTime || item.TicketCreatedDate || item.createdTime
      const rawEnd = item.endTime || item.EndTime || item.MesApprovalTime || item.syncTime

      if (durMinutes === undefined && rawStart && rawEnd) {
        const sStr = String(rawStart).trim()
        const eStr = String(rawEnd).trim()

        if (sStr.includes(':') && eStr.includes(':')) {
          // Xử lý cả dạng HH:mm:ss hoặc ngày giờ YYYY-MM-DD HH:mm:ss
          const sDate = new Date(sStr.includes('T') ? sStr : sStr.replace(' ', 'T')).getTime()
          const eDate = new Date(eStr.includes('T') ? eStr : eStr.replace(' ', 'T')).getTime()

          if (!isNaN(sDate) && !isNaN(eDate) && eDate >= sDate) {
            const diffMin = (eDate - sDate) / (1000 * 60)
            if (diffMin >= 0 && diffMin <= 1440) {
              durMinutes = Number(diffMin.toFixed(1))
            }
          }

          if (durMinutes === undefined) {
            const sParts = sStr.split(' ').pop().split(':').map((v) => parseFloat(v) || 0)
            const eParts = eStr.split(' ').pop().split(':').map((v) => parseFloat(v) || 0)
            const sMin = (sParts[0] || 0) * 60 + (sParts[1] || 0) + (sParts[2] || 0) / 60
            const eMin = (eParts[0] || 0) * 60 + (eParts[1] || 0) + (eParts[2] || 0) / 60
            let diff = eMin - sMin
            if (diff < 0) diff += 1440
            if (diff >= 0 && diff <= 1440) {
              durMinutes = Number(diff.toFixed(1))
            }
          }
        }
      }

      // Nếu chưa có, tính từ ActualRunTime (Đơn vị trong hệ thống luôn là PHÚT)
      if (durMinutes === undefined) {
        const rawRt =
          item.ActualRunTime !== undefined && item.ActualRunTime !== null && item.ActualRunTime !== ''
            ? item.ActualRunTime
            : item.ActualProdTime !== undefined && item.ActualProdTime !== null && item.ActualProdTime !== ''
              ? item.ActualProdTime
              : item.runtimeHours !== undefined && item.runtimeHours !== null && item.runtimeHours !== ''
                ? item.runtimeHours
                : undefined

        if (rawRt !== undefined && rawRt !== null && rawRt !== '') {
          const str = String(rawRt).trim().replace(',', '.')
          if (str.includes(':')) {
            const parts = str.split(':').map((v) => parseFloat(v) || 0)
            const totalMin = parts[0] * 60 + (parts[1] || 0) + (parts[2] || 0) / 60
            durMinutes = Number(totalMin.toFixed(1))
          } else {
            const val = parseFloat(str)
            if (!isNaN(val) && val >= 0) {
              // ActualRunTime trong hệ thống ERP luôn là số PHÚT
              durMinutes = Number(val.toFixed(1))
            }
          }
        }
      }

      if (durMinutes === undefined) {
        durMinutes = 0
      }

      let rt =
        item.RuntimeHours !== undefined && item.RuntimeHours !== null && item.RuntimeHours !== ''
          ? Number(item.RuntimeHours)
          : Number((durMinutes / 60).toFixed(2))

      const prodDate =
        item.prodDate ||
        item.date ||
        item.StatDate ||
        item.StartDate ||
        new Date().toISOString().slice(0, 10)

      const finalStart = formatReportTimeOrDateTime(rawStart || item.CreatedAt, prodDate, `${prodDate} 07:30:00`)

      let finalEnd = ''
      if (rawEnd && rawEnd !== rawStart) {
        finalEnd = formatReportTimeOrDateTime(rawEnd, prodDate, '')
      }

      // Nếu thiếu endTime hoặc trùng startTime, suy diễn endTime = startTime + duration
      if (!finalEnd || finalEnd === finalStart) {
        try {
          const startDateObj = new Date(finalStart.replace(' ', 'T'))
          if (!isNaN(startDateObj.getTime())) {
            const addMs = (durMinutes || rt * 60 || 450) * 60 * 1000
            const endDateObj = new Date(startDateObj.getTime() + addMs)
            finalEnd = formatReportTimeOrDateTime(endDateObj, prodDate)
          }
        } catch (_) {
          finalEnd = `${prodDate} 15:30:00`
        }
      }
      if (!finalEnd) {
        finalEnd = `${prodDate} 15:30:00`
      }

      return {
        ...item,
        ActualRunTime: item.ActualRunTime ?? durMinutes,
        durationMinutes: durMinutes,
        runtimeHours: rt,
        id: item.id || item.IdSeq || (isQuevoPlant ? `QV-STAT-${idx + 1}` : `HN-STAT-${idx + 1}`),
        ticketCode:
          item.ticketCode ||
          item.ticketNo ||
          item.StatTicketNo ||
          item.OperationNo ||
          (isQuevoPlant
            ? `PTK-GS5-${String(idx + 1).padStart(3, '0')}`
            : `PTK-HN-${String(idx + 1).padStart(3, '0')}`),
        orderCode:
          item.orderCode ||
          item.docNo ||
          item.OrderNo ||
          item.RoutingDocNo ||
          (isQuevoPlant
            ? `LSX-GS5-2026-${String(idx + 1).padStart(4, '0')}`
            : `LSX-HN-2026-${String(idx + 1).padStart(4, '0')}`),
        teamName:
          item.teamName ||
          item.team ||
          item.TeamName ||
          item.OperationName ||
          (isQuevoPlant ? 'Tổ Máy Sóng GS5' : 'Tổ In Offset'),
        machineName:
          item.machineName ||
          item.MachineName ||
          `Máy ${item.machineCode || item.MachineCode || (isQuevoPlant ? `SONG-TCY-${String((idx % 24) + 1).padStart(2, '0')}` : `MC-${String((idx % 32) + 1).padStart(2, '0')}`)}`,
        machineCode:
          item.machineCode ||
          item.MachineCode ||
          (isQuevoPlant
            ? `SONG-TCY-${String((idx % 24) + 1).padStart(2, '0')}`
            : `MC-${String((idx % 32) + 1).padStart(2, '0')}`),
        machineGroup:
          item.machineGroup ||
          item.teamName ||
          item.team ||
          item.TeamName ||
          (isQuevoPlant ? 'Máy Sóng GS5' : 'In Offset'),
        productName:
          item.productName ||
          item.itemName ||
          item.ItemName ||
          (isQuevoPlant ? 'Thùng Carton Sóng Goldsun' : 'Bao bì cao cấp Goldsun'),
        customerName:
          item.customerName ||
          item.customer ||
          item.Customer ||
          item.CustName ||
          'Tập đoàn Goldsun',
        planQty: p,
        actualQty: a,
        passQty: pass,
        defectQty: def,
        passRate: pRate,
        shift: item.shift || item.Shift || 'Ca 1',
        prodDate,
        startTime: finalStart,
        endTime: finalEnd,
        StartTime: finalStart,
        EndTime: finalEnd,
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
          'Kỹ thuật viên',
        AuditCategory:
          durMinutes < 5
            ? 'UNDER_5MIN'
            : durMinutes > 720
              ? 'OVER_12H'
              : '5MIN_12H',
        auditCategory:
          durMinutes < 5
            ? 'UNDER_5MIN'
            : durMinutes > 720
              ? 'OVER_12H'
              : '5MIN_12H'
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

      // 4. Lọc theo Thời gian thao tác
      if (selectedDurationAudit !== 'ALL') {
        const durMin = Number(item.durationMinutes ?? item.ActualRunTime ?? 0)

        if (selectedDurationAudit === 'UNDER_5MIN') {
          if (!(durMin < 5 && durMin >= 0)) return false
        } else if (selectedDurationAudit === '5MIN_12H') {
          if (!(durMin >= 5 && durMin <= 720)) return false
        } else if (selectedDurationAudit === 'OVER_12H' || selectedDurationAudit === 'OVER_12H_CHECK' || selectedDurationAudit === 'OVER_12H_VALID') {
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
      if (durMinutes < 5 && durMinutes >= 0) {
        rUnder5++
      } else if (durMinutes >= 5 && durMinutes <= 720) {
        rNormal++
      } else if (durMinutes > 720) {
        rOver12Check++
      } else {
        rNormal++
      }

      // 1. Phân nhóm độ trễ đồng bộ từ cột thực tế
      const rawDelay =
        item.syncDelay !== undefined && item.syncDelay !== null && item.syncDelay !== ''
          ? item.syncDelay
          : item.SyncDelayMinutes !== undefined &&
              item.SyncDelayMinutes !== null &&
              item.SyncDelayMinutes !== ''
            ? item.SyncDelayMinutes
            : item.syncDelayMinutes !== undefined &&
                item.syncDelayMinutes !== null &&
                item.syncDelayMinutes !== ''
              ? item.syncDelayMinutes
              : item.SyncDelay
      const parsedSec = parseSyncDelayToSeconds(rawDelay, item)

      if (parsedSec === null || parsedSec === undefined || isNaN(parsedSec)) {
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
    const avgSyncSec = syncDelayCount > 0 ? totalSyncDelaySec / syncDelayCount : 0
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
    if (!showManualMachines) {
      list = list.filter((m) => !isManualMachine(m))
    }
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
  }, [machineAggregates, showManualMachines, machineSearchText, machineSortConfig])

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
          totalActualQty: 0,
          totalPassQty: 0,
          totalDefectQty: 0,
          totalRuntimeHours: 0,
          mesCount: 0,
          under5Min: 0,
          anomalies: 0
        })
      }
      const rec = map.get(team)
      const a = Number(item.actualQty) || 0
      const pass = Number(item.passQty) || 0
      const parsedDef = Number(item.defectQty) || 0
      const def = parsedDef > 0 ? parsedDef : Math.max(0, a - pass)
      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0

      rec.ticketCount++
      rec.totalActualQty += a
      rec.totalPassQty += pass
      rec.totalDefectQty += def
      rec.totalRuntimeHours += Number(item.runtimeHours) || 0

      if (durMin > 720) {
        rec.anomalies++
      }
      if (durMin < 5 && durMin >= 0) {
        rec.under5Min++
      }

      const orig = String(item.origin || item.createdSource || item.source || '').toUpperCase()
      if (orig.includes('MES')) rec.mesCount++
    })

    return Array.from(map.values())
      .map((t) => {
        const passRate = t.totalActualQty > 0 ? (t.totalPassQty / t.totalActualQty) * 100 : 100
        return {
          ...t,
          passRate: Number(passRate.toFixed(1)),
          mesRate: t.ticketCount > 0 ? Number(((t.mesCount / t.ticketCount) * 100).toFixed(1)) : 0
        }
      })
      .sort((a, b) => b.passRate - a.passRate)
  }, [filteredData])

  // Filtered & Sorted Team List for Search and Column Header Sorting
  const displayTeamList = useMemo(() => {
    let list = [...teamAggregates]
    if (teamSearchText) {
      const q = teamSearchText.toLowerCase()
      list = list.filter((t) => t.teamName.toLowerCase().includes(q))
    }

    const { key, direction } = teamSortConfig
    list.sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (key === 'actualQty') {
        valA = a.totalActualQty
        valB = b.totalActualQty
      } else if (key === 'passQty') {
        valA = a.totalPassQty
        valB = b.totalPassQty
      } else if (key === 'defectQty') {
        valA = a.totalDefectQty
        valB = b.totalDefectQty
      } else if (key === 'anomalyCount' || key === 'anomalies') {
        valA = a.anomalies
        valB = b.anomalies
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
  }, [teamAggregates, teamSearchText, teamSortConfig])

  // Grand Total for Teams
  const teamGrandTotal = useMemo(() => {
    const totalTickets = displayTeamList.reduce((acc, t) => acc + t.ticketCount, 0)
    const totalActual = displayTeamList.reduce((acc, t) => acc + t.totalActualQty, 0)
    const totalPass = displayTeamList.reduce((acc, t) => acc + t.totalPassQty, 0)
    const totalDefect = displayTeamList.reduce((acc, t) => acc + t.totalDefectQty, 0)
    const totalMes = displayTeamList.reduce((acc, t) => acc + t.mesCount, 0)
    const totalUnder5 = displayTeamList.reduce((acc, t) => acc + (t.under5Min || 0), 0)
    const totalAnomalies = displayTeamList.reduce((acc, t) => acc + (t.anomalies || 0), 0)
    const avgPassRate = totalActual > 0 ? Number(((totalPass / totalActual) * 100).toFixed(1)) : 100
    const avgMesRate = totalTickets > 0 ? Number(((totalMes / totalTickets) * 100).toFixed(1)) : 0
    return {
      teamCount: displayTeamList.length,
      totalTickets,
      totalActual,
      totalPass,
      totalDefect,
      totalUnder5,
      totalAnomalies,
      avgPassRate,
      avgMesRate
    }
  }, [displayTeamList])

  // Filtered & Sorted Detail Tickets for Search and Column Header Sorting
  const displayDetailList = useMemo(() => {
    let list = [...filteredData]
    if (detailSearchText) {
      const q = detailSearchText.toLowerCase()
      list = list.filter(
        (item) =>
          (item.ticketCode && item.ticketCode.toLowerCase().includes(q)) ||
          (item.ticketNo && item.ticketNo.toLowerCase().includes(q)) ||
          (item.orderCode && item.orderCode.toLowerCase().includes(q)) ||
          (item.docNo && item.docNo.toLowerCase().includes(q)) ||
          (item.machineName && item.machineName.toLowerCase().includes(q)) ||
          (item.machineCode && item.machineCode.toLowerCase().includes(q)) ||
          (item.productName && item.productName.toLowerCase().includes(q)) ||
          (item.customerName && item.customerName.toLowerCase().includes(q)) ||
          (item.teamName && item.teamName.toLowerCase().includes(q)) ||
          (item.operator && item.operator.toLowerCase().includes(q))
      )
    }

    const { key, direction } = detailSortConfig
    list.sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (key === 'ticketNo' || key === 'ticketCode') {
        valA = a.ticketCode || a.ticketNo || ''
        valB = b.ticketCode || b.ticketNo || ''
      } else if (key === 'docNo' || key === 'orderCode') {
        valA = a.orderCode || a.docNo || ''
        valB = b.orderCode || b.docNo || ''
      } else if (key === 'startTime' || key === 'StartTime') {
        valA = a.startTime || a.StartTime || a.prodDate || ''
        valB = b.startTime || b.StartTime || b.prodDate || ''
      } else if (key === 'endTime' || key === 'EndTime') {
        valA = a.endTime || a.EndTime || a.prodDate || ''
        valB = b.endTime || b.EndTime || b.prodDate || ''
      } else if (key === 'actualQty') {
        valA = Number(a.actualQty || a.output) || 0
        valB = Number(b.actualQty || b.output) || 0
      } else if (key === 'passQty') {
        valA = Number(a.passQty || a.passQuantity) || 0
        valB = Number(b.passQty || b.passQuantity) || 0
      } else if (key === 'defectQty') {
        const actA = Number(a.actualQty || a.output) || 0
        const passA = Number(a.passQty || a.passQuantity) || 0
        const defA = a.defectQty !== undefined && a.defectQty !== null ? Number(a.defectQty) : 0
        valA = defA > 0 ? defA : Math.max(0, actA - passA)

        const actB = Number(b.actualQty || b.output) || 0
        const passB = Number(b.passQty || b.passQuantity) || 0
        const defB = b.defectQty !== undefined && b.defectQty !== null ? Number(b.defectQty) : 0
        valB = defB > 0 ? defB : Math.max(0, actB - passB)
      } else if (key === 'passRate') {
        valA = Number(a.passRate) || 0
        valB = Number(b.passRate) || 0
      } else if (key === 'runtimeHours') {
        valA = Number(a.runtimeHours) || 0
        valB = Number(b.runtimeHours) || 0
      } else if (key === 'auditBadge') {
        valA = Number(a.durationMinutes || (Number(a.runtimeHours) || 0) * 60) || 0
        valB = Number(b.durationMinutes || (Number(b.runtimeHours) || 0) * 60) || 0
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
  }, [filteredData, detailSearchText, detailSortConfig])

  const executiveVerticalData = useMemo(() => {
    let source = machineAggregates
    if (!showManualMachines) {
      source = source.filter((m) => !isManualMachine(m))
    }
    // Sắp xếp các cụm máy theo tổng giờ chạy giảm dần để làm nổi bật sự bất thường
    const sorted = [...source].sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
    return sorted.slice(0, 30).map((m, index) => {
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
        fill: isOver24h ? '#dc2626' : index === 0 ? '#245d6c' : index < 5 ? '#2b6b79' : '#0284c7'
      }
    })
  }, [machineAggregates, showManualMachines, maskText])

  // Chart 2 Data: Team Production & Pass Comparison
  const executiveHorizontalData = useMemo(() => {
    return teamAggregates.map((t) => ({
      name: t.teamName,
      actualQty: t.totalActualQty,
      passQty: t.totalPassQty,
      defectQty: t.totalDefectQty,
      ticketCount: t.ticketCount
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
        'SL Sản xuất': t.totalActualQty,
        'SL Đạt': t.totalPassQty,
        'SL Lỗi': t.totalDefectQty,
        'Tỷ lệ đạt (%)': `${t.passRate}%`,
        'Tỷ lệ MES (%)': `${t.mesRate}%`,
        'Đơn < 5p (Nhập nhanh)': t.under5Min || 0,
        'Đơn > 12h cần KT': t.anomalies || 0
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
      const wsData = displayDetailList.map((item, idx) => {
        const actual = Number(item.actualQty || item.output) || 0
        const pass = Number(item.passQty || item.passQuantity) || 0
        const parsedDef = Number(item.defectQty) || 0
        const defect = parsedDef > 0 ? parsedDef : Math.max(0, actual - pass)
        return {
          STT: idx + 1,
          'Mã phiếu': item.ticketCode || item.ticketNo || '',
          'Lệnh sản xuất / CT': item.orderCode || item.docNo || '',
          'Mã máy': item.machineCode || '',
          'Máy sản xuất': item.machineName || '',
          'Tổ sản xuất': item.teamName || '',
          'Thời gian bắt đầu': item.startTime || item.StartTime || item.prodDate || '',
          'Thời gian kết thúc': item.endTime || item.EndTime || item.prodDate || '',
          'SL Sản xuất': actual,
          'SL Đạt': pass,
          'SL Lỗi': defect,
          'Tỷ lệ đạt (%)': `${item.passRate}%`,
          'Giờ chạy (h)': (Number(item.runtimeHours) || 0).toFixed(1),
          'Nguồn gốc': item.origin || 'MES',
          'Người thực hiện': item.operator || 'Kỹ thuật viên'
        }
      })
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
      { title: 'Giờ chạy (h)', width: 115, id: 'runtimeHours' },
      { title: 'SL Sản xuất', width: 130, id: 'actualQty' },
      { title: 'SL Đạt', width: 130, id: 'passQty' },
      { title: 'SL Lỗi', width: 110, id: 'defectQty' },
      { title: 'Tỷ lệ đạt (%)', width: 115, id: 'passRate' },
      { title: 'ĐVT', width: 80, id: 'unit' },
      { title: 'SL đạt / Giờ', width: 135, id: 'passPerHour' }
    ]
    return base.map((col) => {
      let title = col.title
      const isSorted =
        machineSortConfig.key === col.id ||
        (machineSortConfig.key === 'totalRuntimeHours' && col.id === 'runtimeHours') ||
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
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '700 12px' }
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode,
            displayData: item.machineCode,
            allowOverlay: false,
            themeOverride: { textDark: '#245d6c', baseFontStyle: '700 12px' }
          }
        case 'ticketCount':
          return {
            kind: GridCellKind.Number,
            data: item.ticketCount,
            displayData: Number(item.ticketCount || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#1e293b', baseFontStyle: '600 12px' }
          }
        case 'runtimeHours': {
          const hours = Number(item.totalRuntimeHours) || 0
          const isOver = hours > 24
          return {
            kind: GridCellKind.Text,
            data: `${hours.toFixed(1)}h`,
            displayData: `${hours.toFixed(1)}h`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: isOver
              ? { textDark: '#dc2626', baseFontStyle: '700 12px' }
              : { textDark: '#0284c7', baseFontStyle: '700 12px' }
          }
        }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalActualQty,
            displayData: Number(item.totalActualQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f172a', baseFontStyle: '700 12px' }
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalPassQty,
            displayData: Number(item.totalPassQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f766e', baseFontStyle: '700 12px' }
          }
        case 'defectQty': {
          const def = Number(item.totalDefectQty) || 0
          return {
            kind: GridCellKind.Number,
            data: def,
            displayData: def.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              def > 0
                ? { textDark: '#dc2626', baseFontStyle: '700 12px' }
                : { textDark: '#94a3b8', baseFontStyle: '500 12px' }
          }
        }
        case 'passRate': {
          const rate = Number(item.passRate) || 0
          const rateTheme =
            rate >= 98
              ? { textDark: '#15803d', baseFontStyle: '700 12px' }
              : rate >= 95
                ? { textDark: '#0f766e', baseFontStyle: '700 12px' }
                : { textDark: '#b45309', baseFontStyle: '700 12px' }
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: rateTheme
          }
        }
        case 'unit':
          return {
            kind: GridCellKind.Text,
            data: item.unit || 'Chiếc',
            displayData: item.unit || 'Chiếc',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#64748b', baseFontStyle: '500 12px' }
          }
        case 'passPerHour':
          return {
            kind: GridCellKind.Text,
            data: `${item.speed || 0}`,
            displayData: `${Number(item.speed || 0).toLocaleString('vi-VN')} SP/h`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#245d6c', baseFontStyle: '700 12px' }
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [displayMachineList, machineGridCols, maskText]
  )

  const teamGridCols = useMemo(() => {
    const base = [
      { title: 'Tổ sản xuất', width: 220, id: 'teamName' },
      { title: 'Số phiếu', width: 85, id: 'ticketCount' },
      { title: 'SL Sản xuất', width: 125, id: 'actualQty' },
      { title: 'SL Đạt', width: 125, id: 'passQty' },
      { title: 'SL Lỗi', width: 110, id: 'defectQty' },
      { title: 'Tỷ lệ đạt (%)', width: 115, id: 'passRate' },
      { title: 'Tỷ lệ MES (%)', width: 110, id: 'mesRate' },
      { title: 'Đơn < 5p (Nhập nhanh)', width: 145, id: 'under5Min' },
      { title: 'Đơn > 12h cần KT', width: 130, id: 'anomalyCount' }
    ]
    return base.map((col) => {
      let title = col.title
      const isSorted = teamSortConfig.key === col.id
      if (isSorted) {
        title += teamSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
      }
      return {
        ...col,
        title,
        width: teamColWidths[col.id] || col.width
      }
    })
  }, [teamColWidths, teamSortConfig])

  const onTeamHeaderClicked = useCallback(
    (col) => {
      const colObj = teamGridCols[col]
      if (!colObj) return
      const colId = colObj.id
      setTeamSortConfig((prev) => {
        if (prev.key === colId) {
          return { key: colId, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        }
        return { key: colId, direction: 'desc' }
      })
    },
    [teamGridCols]
  )

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
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '700 12px' }
          }
        case 'ticketCount':
          return {
            kind: GridCellKind.Number,
            data: item.ticketCount,
            displayData: Number(item.ticketCount || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#1e293b', baseFontStyle: '600 12px' }
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalActualQty,
            displayData: Number(item.totalActualQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f172a', baseFontStyle: '700 12px' }
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalPassQty,
            displayData: Number(item.totalPassQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f766e', baseFontStyle: '700 12px' }
          }
        case 'defectQty': {
          const def = Number(item.totalDefectQty) || 0
          return {
            kind: GridCellKind.Number,
            data: def,
            displayData: def.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              def > 0
                ? { textDark: '#dc2626', baseFontStyle: '700 12px' }
                : { textDark: '#94a3b8', baseFontStyle: '500 12px' }
          }
        }
        case 'passRate': {
          const rate = Number(item.passRate) || 0
          const rateTheme =
            rate >= 98
              ? { textDark: '#15803d', baseFontStyle: '700 12px' }
              : rate >= 95
                ? { textDark: '#0f766e', baseFontStyle: '700 12px' }
                : { textDark: '#b45309', baseFontStyle: '700 12px' }
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: rateTheme
          }
        }
        case 'mesRate': {
          const mes = Number(item.mesRate) || 0
          return {
            kind: GridCellKind.Text,
            data: `${item.mesRate}%`,
            displayData: `${item.mesRate}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              mes >= 95
                ? { textDark: '#2563eb', baseFontStyle: '700 12px' }
                : { textDark: '#d97706', baseFontStyle: '700 12px' }
          }
        }
        case 'under5Min': {
          const cnt = Number(item.under5Min) || 0
          return {
            kind: GridCellKind.Number,
            data: cnt,
            displayData: cnt.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              cnt > 0
                ? { textDark: '#be123c', baseFontStyle: '700 12px' }
                : { textDark: '#94a3b8', baseFontStyle: '500 12px' }
          }
        }
        case 'anomalyCount': {
          const anom = Number(item.anomalies) || 0
          return {
            kind: GridCellKind.Number,
            data: anom,
            displayData: anom.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              anom > 0
                ? { textDark: '#d97706', baseFontStyle: '700 12px' }
                : { textDark: '#94a3b8', baseFontStyle: '500 12px' }
          }
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
      { title: 'SL Sản xuất', width: 120, id: 'actualQty' },
      { title: 'SL Đạt', width: 120, id: 'passQty' },
      { title: 'SL Lỗi', width: 110, id: 'defectQty' },
      { title: 'Tỷ lệ đạt (%)', width: 110, id: 'passRate' },
      { title: 'Giờ chạy (h)', width: 105, id: 'runtimeHours' },
      { title: 'Kiểm toán QLSX', width: 145, id: 'auditBadge' },
      { title: 'Nguồn gốc', width: 95, id: 'origin' },
      { title: 'Người thực hiện', width: 150, id: 'operator' }
    ]
    return base.map((col) => {
      let title = col.title
      const isSorted = detailSortConfig.key === col.id
      if (isSorted) {
        title += detailSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
      }
      return {
        ...col,
        title,
        width: detailColWidths[col.id] || col.width
      }
    })
  }, [detailColWidths, detailSortConfig])

  const onDetailHeaderClicked = useCallback(
    (col) => {
      const colObj = detailGridCols[col]
      if (!colObj) return
      const colId = colObj.id
      setDetailSortConfig((prev) => {
        if (prev.key === colId) {
          return { key: colId, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        }
        return { key: colId, direction: 'desc' }
      })
    },
    [detailGridCols]
  )

  const getDetailCellContent = useCallback(
    ([col, row]) => {
      const item = displayDetailList[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = detailGridCols[col]?.id
      const actual = Number(item.actualQty || item.output) || 0
      const pass = Number(item.passQty || item.passQuantity) || 0
      const parsedDef = Number(item.defectQty) || 0
      const defect = parsedDef > 0 ? parsedDef : Math.max(0, actual - pass)
      const passRateVal = actual > 0 ? ((pass / actual) * 100).toFixed(1) : '100.0'
      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0

      let auditText = 'Chuẩn tiến độ'
      if (durMin < 5 && durMin >= 0) {
        auditText = '< 5p Nhập nhanh'
      } else if (durMin > 720) {
        auditText = '> 12h Cần kiểm tra'
      }

      switch (colId) {
        case 'ticketNo':
          return {
            kind: GridCellKind.Text,
            data: item.ticketCode || item.ticketNo || '',
            displayData: item.ticketCode || item.ticketNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#2563eb', baseFontStyle: '700 12px' }
          }
        case 'docNo':
          return {
            kind: GridCellKind.Text,
            data: item.orderCode || item.docNo || '',
            displayData: item.orderCode || item.docNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '600 12px' }
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#245d6c', baseFontStyle: '700 12px' }
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName || '',
            displayData: maskText(item.machineName || '', 5),
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
          }
        case 'teamName':
          return {
            kind: GridCellKind.Text,
            data: item.teamName || '',
            displayData: item.teamName || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        case 'startTime':
          return {
            kind: GridCellKind.Text,
            data: item.startTime || item.StartTime || item.prodDate || '',
            displayData: item.startTime || item.StartTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#0f766e', baseFontStyle: '600 11.5px' }
          }
        case 'endTime':
          return {
            kind: GridCellKind.Text,
            data: item.endTime || item.EndTime || item.prodDate || '',
            displayData: item.endTime || item.EndTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#0284c7', baseFontStyle: '600 11.5px' }
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: actual,
            displayData: actual.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f172a', baseFontStyle: '700 12px' }
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: pass,
            displayData: pass.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f766e', baseFontStyle: '700 12px' }
          }
        case 'defectQty':
          return {
            kind: GridCellKind.Number,
            data: defect,
            displayData: defect.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride:
              defect > 0
                ? { textDark: '#dc2626', baseFontStyle: '700 12px' }
                : { textDark: '#94a3b8', baseFontStyle: '500 12px' }
          }
        case 'passRate': {
          const rate = parseFloat(passRateVal) || 0
          const rateTheme =
            rate >= 98
              ? { textDark: '#15803d', baseFontStyle: '700 12px' }
              : rate >= 95
                ? { textDark: '#0f766e', baseFontStyle: '700 12px' }
                : { textDark: '#b45309', baseFontStyle: '700 12px' }
          return {
            kind: GridCellKind.Text,
            data: `${passRateVal}%`,
            displayData: `${passRateVal}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: rateTheme
          }
        }
        case 'runtimeHours': {
          const rh = Number(item.runtimeHours) || 0
          const isOver = rh > 24
          return {
            kind: GridCellKind.Text,
            data: `${rh.toFixed(1)}h`,
            displayData: `${rh.toFixed(1)}h`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: isOver
              ? { textDark: '#dc2626', baseFontStyle: '700 12px' }
              : { textDark: '#0284c7', baseFontStyle: '600 12px' }
          }
        }
        case 'auditBadge': {
          let badgeTheme = { textDark: '#15803d', baseFontStyle: '600 12px' }
          if (auditText.includes('< 5p')) {
            badgeTheme = { textDark: '#be123c', baseFontStyle: '700 12px' }
          } else if (auditText.includes('Cần kiểm tra')) {
            badgeTheme = { textDark: '#b45309', baseFontStyle: '700 12px' }
          } else if (auditText.includes('Đơn lớn')) {
            badgeTheme = { textDark: '#0f766e', baseFontStyle: '700 12px' }
          }
          return {
            kind: GridCellKind.Text,
            data: auditText,
            displayData: auditText,
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: badgeTheme
          }
        }
        case 'origin': {
          const isMes = String(item.origin || item.createdSource || '')
            .toUpperCase()
            .includes('MES')
          return {
            kind: GridCellKind.Text,
            data: item.origin || 'MES',
            displayData: item.origin || 'MES',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: isMes
              ? { textDark: '#2563eb', baseFontStyle: '700 12px' }
              : { textDark: '#d97706', baseFontStyle: '600 12px' }
          }
        }
        case 'operator':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.operator || 'Kỹ thuật viên', 3),
            displayData: maskText(item.operator || 'Kỹ thuật viên', 3),
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
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
    showManualMachines,
    setShowManualMachines,
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
    teamSortConfig,
    setTeamSortConfig,
    onTeamHeaderClicked,
    teamGridCols,
    getTeamCellContent,
    onTeamColumnResize,
    detailSortConfig,
    setDetailSortConfig,
    onDetailHeaderClicked,
    detailGridCols,
    getDetailCellContent,
    onDetailColumnResize
  }
}
