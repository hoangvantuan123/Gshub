import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { getCleanDate } from '../../../../common/reportUtils'
import { captureReportScreenshot, downloadSingleChart } from '../../../../common/screenshotHelper'
import { useStatisticsImportColumns } from '../../../../registration/statistics/columns/statisticsImportColumns'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../../../utils/exportExcelUtils'

// Helper extractor for Auto-Logistics Status strictly from column AutoIoStatus ("Sinh phiếu xuất/nhập tự động")
export function isNoMaterialAutoIo(label) {
  if (!label) return false
  const s = String(label).toLowerCase().trim()
  return (
    s.includes('không sử dụng nvl') ||
    s.includes('khong su dung nvl') ||
    s.includes('không dùng nvl') ||
    s.includes('khong dung nvl') ||
    s.includes('không sd nvl') ||
    s.includes('khong sd nvl') ||
    s.includes('không sử dụng nguyên vật liệu') ||
    s.includes('khong su dung nguyen vat lieu')
  )
}

export function isMissingAutoIo(label) {
  if (!label) return false
  if (isNoMaterialAutoIo(label)) return false
  const s = String(label).toLowerCase().trim()
  return (
    s.includes('không có xktđ') ||
    s.includes('khong co xktd') ||
    s.includes('không có nktđ') ||
    s.includes('khong co nktd') ||
    s.includes('thiếu xktđ') ||
    s.includes('thieu xktd') ||
    s.includes('thiếu nktđ') ||
    s.includes('thieu nktd') ||
    s.includes('chưa có xktđ') ||
    s.includes('chua co xktd') ||
    s.includes('chưa có nktđ') ||
    s.includes('chua co nktd') ||
    (s.includes('không có') &&
      (s.includes('xktđ') || s.includes('nktđ') || s.includes('xuất') || s.includes('nhập'))) ||
    (s.includes('chưa sinh') && (s.includes('xktđ') || s.includes('nktđ') || s.includes('phiếu')))
  )
}

export function isPassAutoIo(label) {
  if (!label) return false
  if (isNoMaterialAutoIo(label)) return false
  if (isMissingAutoIo(label)) return false
  const s = String(label).toLowerCase().trim()
  return (
    s.includes('có xktđ') ||
    s.includes('co xktd') ||
    s.includes('có nktđ') ||
    s.includes('co nktd') ||
    s.includes('đã sinh') ||
    s.includes('da sinh')
  )
}

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

export const parseSyncDelayToSeconds = (val, item = null) => {
  if (item) {
    const tCre = item.TicketCreatedDate || item.ticketCreatedDate
    const tMes = item.MesApprovalTime || item.mesApprovalTime
    if (tCre && tMes) {
      const dCre = new Date(tCre).getTime()
      const dMes = new Date(tMes).getTime()
      if (!isNaN(dCre) && !isNaN(dMes) && dMes >= dCre) {
        const diffSec = (dMes - dCre) / 1000
        if (diffSec >= 0 && diffSec <= 86400) return diffSec
      }
    }
  }

  if (val === null || val === undefined || val === '') {
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

/**
 * Trích xuất timestamp chính xác từ cặp Ngày (dVal) và Giờ (tVal)
 * Hỗ trợ đa định dạng: YYYY-MM-DD, YYYY-DD-MM, DD/MM/YYYY, HH:mm, HH:mm:ss, ISO
 */
export function parseFullDateTimeTimestamp(dVal, tVal) {
  let dStr = String(dVal || '').trim()
  let tStr = String(tVal || '').trim()
  if (tStr.includes(' ') && !dStr) {
    const parts = tStr.split(' ')
    dStr = parts[0]
    tStr = parts.slice(1).join(' ')
  }
  let y, m, d
  if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
    const parts = dStr.slice(0, 10).split('-').map(Number)
    y = parts[0]
    if (parts[2] === 10 && parts[1] <= 31) {
      d = parts[1]
      m = parts[2]
    } else {
      m = parts[1]
      d = parts[2]
    }
  } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(dStr)) {
    const parts = dStr.split(' ')[0].split('/').map(Number)
    d = parts[0]
    m = parts[1]
    y = parts[2] < 100 ? 2000 + parts[2] : parts[2]
  }
  let hh = 0
  let mm = 0
  let ss = 0
  if (tStr.includes(':')) {
    const tp = tStr.split(':').map(Number)
    hh = tp[0] || 0
    mm = tp[1] || 0
    ss = tp[2] || 0
  }
  if (y && m && d) {
    return new Date(y, m - 1, d, hh, mm, ss).getTime()
  }
  return null
}

// Helper format date & time chuẩn xác cho báo cáo (giữ nguyên vẹn text gốc từ DB)
export function formatReportTimeOrDateTime(rawVal, defaultDate = '', fallbackTime = '') {
  if (rawVal === undefined || rawVal === null) return fallbackTime || defaultDate || ''
  if (rawVal instanceof Date) {
    if (isNaN(rawVal.getTime())) return ''
    const Y = rawVal.getFullYear()
    const M = String(rawVal.getMonth() + 1).padStart(2, '0')
    const D = String(rawVal.getDate()).padStart(2, '0')
    const h = String(rawVal.getHours()).padStart(2, '0')
    const m = String(rawVal.getMinutes()).padStart(2, '0')
    const s = String(rawVal.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }

  const str = String(rawVal).trim()
  if (!str || str === 'null' || str === 'undefined') return fallbackTime || defaultDate || ''

  // ISO string chứa 'T' (ví dụ 2026-09-28T07:45:10Z)
  if (str.includes('T')) {
    return str.slice(0, 19).replace('T', ' ')
  }

  // Giữ nguyên vẹn text gốc như DB trả về (ví dụ '9/29/26 9:57:19', '2026-09-29 09:57:19', '09:57:19')
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
  dateRange: externalDateRange,
  onDateRangeChange: externalOnDateRangeChange,
  selectedMasterKey
}) => {
  const [internalDateRange, setInternalDateRange] = useState(null)
  const dateRange = externalDateRange !== undefined ? externalDateRange : internalDateRange
  const onDateRangeChange = externalOnDateRangeChange || setInternalDateRange

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
  const [showDetailSearch, setShowDetailSearch] = useState(false)

  // Refs for Screenshot, Chart export and Glide Grids
  const reportRootRef = useRef(null)
  const chart1Ref = useRef(null)
  const chart2Ref = useRef(null)
  const chart3Ref = useRef(null)
  const syncChartRef = useRef(null)
  const autoExportChartRef = useRef(null)

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

    const list = Array.isArray(inputDataset) ? inputDataset : []

    return list.map((item, idx) => {
      const p = Number(item.planQty || item.TargetProdQty || item.StandardMeters) || 0
      const a = Number(item.actualQty || item.ProdQty || item.ActualMeters) || p || 0
      const pass = Number(item.passQty || item.StatPassQty) || a || 0
      const def = Number(item.defectQty) || Math.max(0, a - pass) || 0
      const pRate = a > 0 ? Number(((pass / a) * 100).toFixed(1)) : 100

      const rawStartDate =
        item.startDate || item.StartDate || item.prodDate || item.StatDate || item.statDate || ''
      const rawEndDate =
        item.endDate || item.EndDate || item.prodDate || item.StatDate || item.statDate || ''
      const rawStart =
        item.startTime || item.StartTime || item.TicketCreatedDate || item.createdTime
      const rawEnd = item.endTime || item.EndTime || item.MesApprovalTime || item.syncTime

      let durMinutes = undefined

      // 1. Ưu tiên tính theo mốc Ngày + Giờ đầy đủ (Full DateTime thông ngày)
      const startTs = parseFullDateTimeTimestamp(rawStartDate, rawStart)
      const endTs = parseFullDateTimeTimestamp(rawEndDate, rawEnd)

      if (startTs !== null && endTs !== null && endTs >= startTs) {
        const diffMin = (endTs - startTs) / (1000 * 60)
        durMinutes = Number(diffMin.toFixed(1))
      } else if (rawStart && rawEnd) {
        const sStr = String(rawStart).trim()
        const eStr = String(rawEnd).trim()

        if (sStr.includes(':') && eStr.includes(':')) {
          const sParts = sStr
            .split(' ')
            .pop()
            .split(':')
            .map((v) => parseFloat(v) || 0)
          const eParts = eStr
            .split(' ')
            .pop()
            .split(':')
            .map((v) => parseFloat(v) || 0)
          const sMin = (sParts[0] || 0) * 60 + (sParts[1] || 0) + (sParts[2] || 0) / 60
          const eMin = (eParts[0] || 0) * 60 + (eParts[1] || 0) + (eParts[2] || 0) / 60
          let diff = eMin - sMin
          if (diff < 0) diff += 1440 // Chạy xuyên đêm qua ngày hôm sau
          durMinutes = Number(diff.toFixed(1))
        }
      }

      // 2. Nếu không có đủ 2 mốc hoặc không tính được, đọc DurationMinutes / ActualRunTime
      if (durMinutes === undefined) {
        if (
          item.DurationMinutes !== undefined &&
          item.DurationMinutes !== null &&
          item.DurationMinutes !== ''
        ) {
          durMinutes = Number(item.DurationMinutes)
        } else if (
          item.durationMinutes !== undefined &&
          item.durationMinutes !== null &&
          item.durationMinutes !== ''
        ) {
          durMinutes = Number(item.durationMinutes)
        }
      }

      if (durMinutes === undefined) {
        const rawRt =
          item.ActualRunTime !== undefined &&
          item.ActualRunTime !== null &&
          item.ActualRunTime !== ''
            ? item.ActualRunTime
            : item.ActualProdTime !== undefined &&
                item.ActualProdTime !== null &&
                item.ActualProdTime !== ''
              ? item.ActualProdTime
              : item.runtimeHours !== undefined &&
                  item.runtimeHours !== null &&
                  item.runtimeHours !== ''
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
              durMinutes = Number(val.toFixed(1))
            }
          }
        }
      }

      if (durMinutes === undefined) {
        durMinutes = 0
      }

      let rt = Number((durMinutes / 60).toFixed(2))

      const prodDate =
        getCleanDate(
          item.prodDate ||
            item.StatDate ||
            item.statDate ||
            item.date ||
            item.StartDate ||
            item.startDate ||
            item.OpDate ||
            item.opDate ||
            item.TicketCreatedDate ||
            item.ticketCreatedDate
        ) || new Date().toISOString().slice(0, 10)

      const finalStart = rawStart ? formatReportTimeOrDateTime(rawStart) : ''
      const finalEnd = rawEnd ? formatReportTimeOrDateTime(rawEnd) : ''

      const rawTeam =
        item.teamName ||
        item.team ||
        item.TeamName ||
        item.OpTypeName ||
        item.opTypeName ||
        item.OperationName ||
        item.operationName ||
        item.ProcessName ||
        item.processName ||
        item.SectionName ||
        item.DeptName ||
        ''

      const rawMachineCode =
        item.machineCode ||
        item.MachineCode ||
        item.MachineId ||
        item.machineId ||
        item.RawLineCode ||
        item.rawLineCode ||
        ''

      const rawMachineName =
        item.machineName ||
        item.MachineName ||
        item.RawLineName ||
        item.rawLineName ||
        item.WorkCenter ||
        item.workCenter ||
        ''

      let finalTeam = rawTeam ? String(rawTeam).trim() : ''
      let finalMachineCode = rawMachineCode ? String(rawMachineCode).trim() : ''
      let finalMachineName = rawMachineName ? String(rawMachineName).trim() : finalMachineCode || ''

      const rawItemCode = item.ItemCode || item.itemCode || item.partNo || item.PartNo || ''
      const rawItemName =
        item.ItemName || item.itemName || item.productName || item.ProductName || ''
      const rawCustomer = item.Customer || item.customer || item.customerName || item.CustName || ''
      const rawProcess =
        item.ProcessName ||
        item.processName ||
        item.operationName ||
        item.OperationName ||
        item.OpTypeName ||
        item.opTypeName ||
        ''
      const rawMainWorker =
        item.MainWorker || item.mainWorker || item.operator || item.supervisor || item.PicDp || ''
      const rawStatStaff = item.StatStaff || item.statStaff || ''
      const rawSalesStaff = item.SalesStaff || item.salesStaff || ''
      const rawUnit = item.Unit || item.unit || item.RoutingUnit || ''
      const rawShift = item.Shift || item.shift || ''
      const rawTicketNo =
        item.StatTicketNo ||
        item.statTicketNo ||
        item.ticketCode ||
        item.ticketNo ||
        item.RegCode ||
        ''
      const rawOpNo =
        item.OperationNo ||
        item.operationNo ||
        item.RoutingDocNo ||
        item.routingDocNo ||
        item.docNo ||
        item.orderCode ||
        ''
      const rawOrderNo = item.OrderNo || item.orderNo || ''
      const rawOrigin =
        item.origin || item.createdSource || item.TicketCreationLocation || item.source || ''

      return {
        ...item,
        ActualRunTime: item.ActualRunTime ?? durMinutes,
        durationMinutes: durMinutes,
        runtimeHours: rt,
        id: item.id || item.IdSeq || rawTicketNo || String(idx + 1),
        ticketCode: rawTicketNo,
        orderCode: rawOpNo,
        // ── Khung đăng ký chuẩn Thống kê sản xuất (statisticsImportColumns.js) ──
        StatTicketNo: rawTicketNo,
        OperationNo: rawOpNo,
        OrderNo: rawOrderNo,
        ItemCode: rawItemCode,
        ItemName: rawItemName,
        Customer: rawCustomer,
        ProcessName: rawProcess,
        TeamName: finalTeam,
        MachineCode: finalMachineCode,
        MachineName: finalMachineName,
        OpTypeCode: item.OpTypeCode || item.opTypeCode || '',
        OpTypeName: item.OpTypeName || item.opTypeName || rawProcess || finalTeam,
        Shift: rawShift,
        StatDate: prodDate,
        StartDate: item.StartDate || item.startDate || prodDate,
        StartTime: finalStart,
        EndDate: item.EndDate || item.endDate || prodDate,
        EndTime: finalEnd,
        ProdQty: a,
        PassQty: pass,
        PassRate: pRate,
        StandardMeters: Number(item.StandardMeters || item.standardMeters || p) || 0,
        ActualMeters: Number(item.ActualMeters || item.actualMeters || a) || 0,
        Unit: rawUnit,
        MainWorker: rawMainWorker,
        SubWorker1: item.SubWorker1 || item.subWorker1 || '',
        SubWorker2: item.SubWorker2 || item.subWorker2 || '',
        StatStaff: rawStatStaff,
        SalesStaff: rawSalesStaff,
        BreakdownReason: item.BreakdownReason || item.breakdownReason || '',

        // Aliases & backwards compatibility
        teamName: finalTeam,
        team: finalTeam,
        machineName: finalMachineName,
        machineCode: finalMachineCode,
        machineGroup: item.machineGroup || finalTeam,
        itemCode: rawItemCode,
        itemName: rawItemName,
        productName: rawItemName,
        customer: rawCustomer,
        customerName: rawCustomer,
        orderNo: rawOrderNo,
        unit: rawUnit,
        planQty: p,
        actualQty: a,
        passQty: pass,
        defectQty: def,
        passRate: pRate,
        shift: rawShift,
        prodDate,
        startTime: finalStart,
        endTime: finalEnd,
        origin: rawOrigin,
        autoExport:
          item.autoExport !== undefined
            ? item.autoExport
            : item.autoExportNote !== undefined
              ? item.autoExportNote
              : true,
        operator: rawMainWorker,
        AuditCategory: durMinutes < 5 ? 'UNDER_5MIN' : durMinutes > 720 ? 'OVER_12H' : '5MIN_12H',
        auditCategory: durMinutes < 5 ? 'UNDER_5MIN' : durMinutes > 720 ? 'OVER_12H' : '5MIN_12H'
      }
    })
  }, [inputDataset, plantKey])

  // Tự động đồng bộ dateRange theo min/max của "Ngày thống kê" (prodDate / StatDate) trong dataset
  useEffect(() => {
    if (!rawData || rawData.length === 0) return
    let minD = ''
    let maxD = ''
    rawData.forEach((item) => {
      const d = getCleanDate(item.prodDate || item.StatDate || item.date || item.StartDate)
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        if (!minD || d < minD) minD = d
        if (!maxD || d > maxD) maxD = d
      }
    })
    if (minD && maxD) {
      if (externalOnDateRangeChange) {
        externalOnDateRangeChange([minD, maxD])
      } else {
        setInternalDateRange([minD, maxD])
      }
    }
  }, [rawData, externalOnDateRangeChange])

  // Filter Data (Lọc theo Tổ sản xuất, Cụm máy, Thời gian thao tác)
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // 1. Lọc theo Tổ sản xuất
      if (selectedTeam !== 'ALL' && item.teamName !== selectedTeam && item.team !== selectedTeam)
        return false

      // 2. Lọc theo Cụm máy
      if (
        selectedMachine !== 'ALL' &&
        item.machineCode !== selectedMachine &&
        item.machineName !== selectedMachine
      )
        return false

      // 3. Lọc theo Thời gian thao tác
      if (selectedDurationAudit !== 'ALL') {
        const durMin = Number(item.durationMinutes ?? item.ActualRunTime ?? 0)

        if (selectedDurationAudit === 'UNDER_5MIN') {
          if (durMin >= 5) return false
        } else if (selectedDurationAudit === '5MIN_12H') {
          if (!(durMin >= 5 && durMin <= 720)) return false
        } else if (
          selectedDurationAudit === 'OVER_12H' ||
          selectedDurationAudit === 'OVER_12H_CHECK' ||
          selectedDurationAudit === 'OVER_12H_VALID'
        ) {
          if (!(durMin > 720)) return false
        }
      }

      return true
    })
  }, [rawData, selectedTeam, selectedMachine, selectedDurationAudit])

  // Filter Dropdown Options
  const filterOptions = useMemo(() => {
    const shifts = new Set()
    const teams = new Set()
    const machines = new Map()

    rawData.forEach((item) => {
      if (item.shift) shifts.add(item.shift)
      if (item.teamName) teams.add(item.teamName)
      if (item.machineCode) {
        const mName = item.machineName || item.machineCode
        machines.set(item.machineCode, mName)
      }
    })

    return {
      shifts: Array.from(shifts).sort(),
      teams: Array.from(teams).filter(Boolean).sort(),
      machines: Array.from(machines.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.code.localeCompare(b.code))
    }
  }, [rawData])

  // Active filter status & reset action
  const hasActiveFilters = useMemo(() => {
    return selectedTeam !== 'ALL' || selectedMachine !== 'ALL' || selectedDurationAudit !== 'ALL'
  }, [selectedTeam, selectedMachine, selectedDurationAudit])

  const handleResetFilters = useCallback(() => {
    setSelectedTeam('ALL')
    setSelectedMachine('ALL')
    setSelectedDurationAudit('ALL')
    setMachineSearchText('')
    setTeamSearchText('')
    setDetailSearchText('')
  }, [])

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
    let noAutoExportCount = 0
    let noMaterialAutoIoCount = 0
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

      const durMinutes = Number(item.durationMinutes ?? rt * 60) || 0
      if (durMinutes < 5) {
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

      // Không tính hạng mục "Không sử dụng NVL" vào việc tính tổng phiếu pass.
      // Chỉ tính các phiếu có "Có XKTĐ, Có NKTĐ" (hoặc Có XKTĐ, Có NKTĐ) vào Đã sinh.
      // Điều kiện cuối "Không có XKTĐ và Không có NKTĐ" (hoặc thiếu) tính vào Chưa sinh.
      if (isPassAutoIo(typeKey)) {
        autoExportCount++
      } else if (isMissingAutoIo(typeKey)) {
        noAutoExportCount++
      } else if (isNoMaterialAutoIo(typeKey)) {
        noMaterialAutoIoCount++
      }
    })

    const syncBreakdown = [
      {
        group: '≤ 10 giây',
        shortGroup: '≤ 10s',
        count: syncUnder10,
        rate: total > 0 ? Number(((syncUnder10 / total) * 100).toFixed(1)) : 0,
        color: '#01411b'
      },
      {
        group: '11 – 30 giây',
        shortGroup: '11–30s',
        count: sync11to30,
        rate: total > 0 ? Number(((sync11to30 / total) * 100).toFixed(1)) : 0,
        color: '#166534'
      },
      {
        group: '31 – 60 giây',
        shortGroup: '31–60s',
        count: sync31to60,
        rate: total > 0 ? Number(((sync31to60 / total) * 100).toFixed(1)) : 0,
        color: '#475569'
      },
      {
        group: '> 60 giây (Độ trễ cao)',
        shortGroup: '> 60s',
        count: syncOver60,
        rate: total > 0 ? Number(((syncOver60 / total) * 100).toFixed(1)) : 0,
        color: '#64748b'
      },
      {
        group: 'Không đồng bộ (trống)',
        shortGroup: 'Trống',
        count: syncEmpty,
        rate: total > 0 ? Number(((syncEmpty / total) * 100).toFixed(1)) : 0,
        color: '#94a3b8'
      }
    ]

    const autoExportBreakdown = Array.from(autoExportTypeMap.entries())
      .map(([label, count]) => {
        const isMissing = isMissingAutoIo(label)
        const isNoMat = isNoMaterialAutoIo(label)
        const isPass = isPassAutoIo(label)

        // Điều kiện cuối Không có XKTĐ và Không có NKTĐ là màu ĐỎ (#dc2626)
        // Không sử dụng NVL là màu xám (#94a3b8)
        // Có XKTĐ, Có NKTĐ (Hợp lệ / Tích cực) là màu xanh lá hy vọng (#01411b)
        let color = '#01411b'
        if (isMissing) {
          color = '#dc2626'
        } else if (isNoMat) {
          color = '#94a3b8'
        } else {
          color = '#01411b'
        }

        return {
          label,
          count,
          rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
          isMissing,
          isNoMaterial: isNoMat,
          isPass,
          color
        }
      })
      .sort((a, b) => {
        // Có XKTĐ, Có NKTĐ trước -> Không sử dụng NVL -> Điều kiện cuối: đỏ Không có XKTĐ và Không có NKTĐ ở cuối
        if (a.isMissing && !b.isMissing) return 1
        if (!a.isMissing && b.isMissing) return -1
        if (a.isNoMaterial && b.isPass) return 1
        if (a.isPass && b.isNoMaterial) return -1
        return b.count - a.count
      })

    const calculatedMesCount = mesCount > 0 ? mesCount : total
    const calculatedBravoCount = bravoCount > 0 ? bravoCount : total - calculatedMesCount
    const totalApplicableAutoIo = autoExportCount + noAutoExportCount
    const autoExportRate =
      totalApplicableAutoIo > 0
        ? ((autoExportCount / totalApplicableAutoIo) * 100).toFixed(1)
        : total > 0 && noAutoExportCount === 0
          ? '100'
          : '0'
    const noAutoExportRate =
      totalApplicableAutoIo > 0
        ? ((noAutoExportCount / totalApplicableAutoIo) * 100).toFixed(1)
        : '0'
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
      noAutoExportCount: noAutoExportCount,
      noMaterialAutoIoCount: noMaterialAutoIoCount,
      autoExportRate: autoExportRate,
      noAutoExportRate: noAutoExportRate,
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

  const missingAutoExportTickets = useMemo(() => {
    return filteredData
      .filter((item) => {
        const typeKey = getAutoExportType(item)
        return isMissingAutoIo(typeKey)
      })
      .map((item, idx) => ({
        stt: idx + 1,
        ...item,
        autoExportType: getAutoExportType(item)
      }))
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
      if (durMin < 5) {
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
  // Filtered & Sorted Detail Tickets for Search and Column Header Sorting
  const displayDetailList = useMemo(() => {
    let list = [...filteredData]
    if (detailSearchText) {
      const q = detailSearchText.toLowerCase()
      list = list.filter(
        (item) =>
          (item.StatTicketNo && String(item.StatTicketNo).toLowerCase().includes(q)) ||
          (item.ticketCode && String(item.ticketCode).toLowerCase().includes(q)) ||
          (item.ticketNo && String(item.ticketNo).toLowerCase().includes(q)) ||
          (item.OperationNo && String(item.OperationNo).toLowerCase().includes(q)) ||
          (item.orderCode && String(item.orderCode).toLowerCase().includes(q)) ||
          (item.docNo && String(item.docNo).toLowerCase().includes(q)) ||
          (item.OrderNo && String(item.OrderNo).toLowerCase().includes(q)) ||
          (item.orderNo && String(item.orderNo).toLowerCase().includes(q)) ||
          (item.ItemCode && String(item.ItemCode).toLowerCase().includes(q)) ||
          (item.itemCode && String(item.itemCode).toLowerCase().includes(q)) ||
          (item.ItemName && String(item.ItemName).toLowerCase().includes(q)) ||
          (item.itemName && String(item.itemName).toLowerCase().includes(q)) ||
          (item.Customer && String(item.Customer).toLowerCase().includes(q)) ||
          (item.customer && String(item.customer).toLowerCase().includes(q)) ||
          (item.ProcessName && String(item.ProcessName).toLowerCase().includes(q)) ||
          (item.TeamName && String(item.TeamName).toLowerCase().includes(q)) ||
          (item.teamName && String(item.teamName).toLowerCase().includes(q)) ||
          (item.MachineCode && String(item.MachineCode).toLowerCase().includes(q)) ||
          (item.machineCode && String(item.machineCode).toLowerCase().includes(q)) ||
          (item.MachineName && String(item.MachineName).toLowerCase().includes(q)) ||
          (item.machineName && String(item.machineName).toLowerCase().includes(q)) ||
          (item.OpTypeName && String(item.OpTypeName).toLowerCase().includes(q)) ||
          (item.Shift && String(item.Shift).toLowerCase().includes(q)) ||
          (item.StatDate && String(item.StatDate).toLowerCase().includes(q)) ||
          (item.MainWorker && String(item.MainWorker).toLowerCase().includes(q)) ||
          (item.SubWorker1 && String(item.SubWorker1).toLowerCase().includes(q)) ||
          (item.SubWorker2 && String(item.SubWorker2).toLowerCase().includes(q)) ||
          (item.StatStaff && String(item.StatStaff).toLowerCase().includes(q)) ||
          (item.SalesStaff && String(item.SalesStaff).toLowerCase().includes(q)) ||
          (item.BreakdownReason && String(item.BreakdownReason).toLowerCase().includes(q))
      )
    }

    const { key, direction } = detailSortConfig
    list.sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (key === 'StatTicketNo' || key === 'ticketNo' || key === 'ticketCode') {
        valA = a.StatTicketNo || a.ticketCode || a.ticketNo || ''
        valB = b.StatTicketNo || b.ticketCode || b.ticketNo || ''
      } else if (key === 'OperationNo' || key === 'docNo' || key === 'orderCode') {
        valA = a.OperationNo || a.orderCode || a.docNo || ''
        valB = b.OperationNo || b.orderCode || b.docNo || ''
      } else if (key === 'OrderNo' || key === 'orderNo') {
        valA = a.OrderNo || a.orderNo || ''
        valB = b.OrderNo || b.orderNo || ''
      } else if (key === 'ItemCode' || key === 'itemCode') {
        valA = a.ItemCode || a.itemCode || ''
        valB = b.ItemCode || b.itemCode || ''
      } else if (key === 'ItemName' || key === 'itemName') {
        valA = a.ItemName || a.itemName || a.productName || ''
        valB = b.ItemName || b.itemName || b.productName || ''
      } else if (key === 'Customer' || key === 'customer') {
        valA = a.Customer || a.customer || a.customerName || ''
        valB = b.Customer || b.customer || b.customerName || ''
      } else if (key === 'ProcessName' || key === 'processName') {
        valA = a.ProcessName || a.processName || ''
        valB = b.ProcessName || b.processName || ''
      } else if (key === 'TeamName' || key === 'teamName') {
        valA = a.TeamName || a.teamName || a.team || ''
        valB = b.TeamName || b.teamName || b.team || ''
      } else if (key === 'MachineCode' || key === 'machineCode') {
        valA = a.MachineCode || a.machineCode || ''
        valB = b.MachineCode || b.machineCode || ''
      } else if (key === 'MachineName' || key === 'machineName') {
        valA = a.MachineName || a.machineName || ''
        valB = b.MachineName || b.machineName || ''
      } else if (key === 'OpTypeName' || key === 'opTypeName') {
        valA = a.OpTypeName || a.opTypeName || ''
        valB = b.OpTypeName || b.opTypeName || ''
      } else if (key === 'Shift' || key === 'shift') {
        valA = a.Shift || a.shift || ''
        valB = b.Shift || b.shift || ''
      } else if (key === 'StatDate' || key === 'statDate' || key === 'prodDate') {
        valA = a.StatDate || a.prodDate || a.statDate || ''
        valB = b.StatDate || b.prodDate || b.statDate || ''
      } else if (key === 'StartDate' || key === 'startDate') {
        valA = a.StartDate || a.startDate || ''
        valB = b.StartDate || b.startDate || ''
      } else if (key === 'StartTime' || key === 'startTime') {
        valA = a.StartTime || a.startTime || ''
        valB = b.StartTime || b.startTime || ''
      } else if (key === 'EndDate' || key === 'endDate') {
        valA = a.EndDate || a.endDate || ''
        valB = b.EndDate || b.endDate || ''
      } else if (key === 'EndTime' || key === 'endTime') {
        valA = a.EndTime || a.endTime || ''
        valB = b.EndTime || b.endTime || ''
      } else if (key === 'ProdQty' || key === 'actualQty') {
        valA = Number(a.ProdQty || a.actualQty || a.output) || 0
        valB = Number(b.ProdQty || b.actualQty || b.output) || 0
      } else if (key === 'PassQty' || key === 'passQty') {
        valA = Number(a.PassQty || a.passQty || a.passQuantity) || 0
        valB = Number(b.PassQty || b.passQty || b.passQuantity) || 0
      } else if (key === 'PassRate' || key === 'passRate') {
        valA = Number(a.PassRate || a.passRate) || 0
        valB = Number(b.PassRate || b.passRate) || 0
      } else if (key === 'ActualMeters' || key === 'actualMeters') {
        valA = Number(a.ActualMeters || a.actualMeters) || 0
        valB = Number(b.ActualMeters || b.actualMeters) || 0
      } else if (key === 'StandardMeters' || key === 'standardMeters') {
        valA = Number(a.StandardMeters || a.standardMeters) || 0
        valB = Number(b.StandardMeters || b.standardMeters) || 0
      } else if (key === 'Unit' || key === 'unit') {
        valA = a.Unit || a.unit || ''
        valB = b.Unit || b.unit || ''
      } else if (key === 'MainWorker' || key === 'mainWorker' || key === 'operator') {
        valA = a.MainWorker || a.operator || ''
        valB = b.MainWorker || b.operator || ''
      } else if (key === 'SubWorker1' || key === 'subWorker1') {
        valA = a.SubWorker1 || a.subWorker1 || ''
        valB = b.SubWorker1 || b.subWorker1 || ''
      } else if (key === 'SubWorker2' || key === 'subWorker2') {
        valA = a.SubWorker2 || a.subWorker2 || ''
        valB = b.SubWorker2 || b.subWorker2 || ''
      } else if (key === 'StatStaff' || key === 'statStaff') {
        valA = a.StatStaff || a.statStaff || ''
        valB = b.StatStaff || b.statStaff || ''
      } else if (key === 'SalesStaff' || key === 'salesStaff') {
        valA = a.SalesStaff || a.salesStaff || ''
        valB = b.SalesStaff || b.salesStaff || ''
      } else if (key === 'BreakdownReason' || key === 'breakdownReason') {
        valA = a.BreakdownReason || a.breakdownReason || ''
        valB = b.BreakdownReason || b.breakdownReason || ''
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
        fill: isOver24h ? '#dc2626' : index === 0 ? '#01411b' : index < 5 ? '#025c27' : '#166534'
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
        fill: '#01411b'
      },
      {
        category: '> 12h (Đơn lớn hợp lệ)',
        tickets: kpiMetrics.runtimeOver12hValid,
        desc: 'Đơn hàng sản lượng lớn đối chiếu hợp lệ',
        fill: '#025c27'
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
            themeOverride: { textDark: '#01411b', baseFontStyle: '700 12px' }
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
              : { textDark: '#01411b', baseFontStyle: '700 12px' }
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
            themeOverride: { textDark: '#01411b', baseFontStyle: '700 12px' }
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
            rate >= 95
              ? { textDark: '#01411b', baseFontStyle: '700 12px' }
              : rate >= 80
                ? { textDark: '#d97706', baseFontStyle: '700 12px' }
                : { textDark: '#dc2626', baseFontStyle: '700 12px' }
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
            themeOverride: { textDark: '#01411b', baseFontStyle: '700 12px' }
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
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.totalPassQty,
            displayData: Number(item.totalPassQty || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'defectQty': {
          const def = Number(item.totalDefectQty) || 0
          return {
            kind: GridCellKind.Number,
            data: def,
            displayData: def.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        }
        case 'passRate': {
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        }
        case 'mesRate': {
          return {
            kind: GridCellKind.Text,
            data: `${item.mesRate}%`,
            displayData: `${item.mesRate}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        }
        case 'under5Min': {
          const cnt = Number(item.under5Min) || 0
          return {
            kind: GridCellKind.Number,
            data: cnt,
            displayData: cnt.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        }
        case 'anomalyCount': {
          const anom = Number(item.anomalies) || 0
          return {
            kind: GridCellKind.Number,
            data: anom,
            displayData: anom.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [displayTeamList, teamGridCols]
  )

  const rawStatCols = useStatisticsImportColumns()

  // ── Danh sách cột khớp chuẩn 100% Khung Đăng Ký Thống Kê Sản Xuất (/sub/report/data/detail) ──
  const detailGridCols = useMemo(() => {
    return (rawStatCols || [])
      .filter(
        (c) =>
          c.id && c.id !== 'WorkingTag' && !['RegCode', 'FactoryName', 'ApplyDate'].includes(c.id)
      )
      .map((col) => {
        let title = col.title
        const isSorted = detailSortConfig.key === col.id
        if (isSorted) {
          title += detailSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
        }
        const { themeOverride, ...restCol } = col
        return {
          ...restCol,
          title,
          readonly: true,
          width: detailColWidths[col.id] || col.width || 130
        }
      })
  }, [rawStatCols, detailColWidths, detailSortConfig])

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
      const colObj = detailGridCols[col]
      if (!item || !colObj) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = colObj.id
      if (!colId) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }

      const val = item[colId] ?? item[colId.charAt(0).toLowerCase() + colId.slice(1)] ?? ''

      if (colObj.kind === 'Boolean') {
        const boolVal =
          typeof val === 'boolean'
            ? val
            : val === 1 || val === '1' || val === 'true' || val === 'Có'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          allowOverlay: false
        }
      }

      if (colObj.kind === 'Number' || typeof val === 'number') {
        const numVal = typeof val === 'number' ? val : Number(val)
        const isValid = !isNaN(numVal) && val !== '' && val !== null && val !== undefined
        const finalNum = isValid ? numVal : 0
        const displayData = isValid ? finalNum.toLocaleString('vi-VN') : ''
        return {
          kind: GridCellKind.Number,
          data: finalNum,
          displayData,
          allowOverlay: false,
          contentAlign: 'right'
        }
      }

      const strVal = String(val ?? '')
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        allowOverlay: false
      }
    },
    [displayDetailList, detailGridCols]
  )

  // Download Individual Chart as PNG
  const handleDownloadSingleChart = async (targetRef, chartName) => {
    await downloadSingleChart(targetRef, chartName)
  }

  // Full Page Screenshot Capture (Optimized: Direct target capture, no clipping of headers/tabs, full table rendering)
  const handleCaptureScreenshot = async () => {
    const el = reportRootRef.current
    if (!el) return
    const dateStr = new Date().toISOString().slice(0, 10)
    await captureReportScreenshot({
      targetEl: el,
      fileName: `BaoCao_ThongKe_SanXuat_${plantKey}_${dateStr}`,
      onStart: () => setIsCapturing(true),
      onEnd: () => setIsCapturing(false),
      onError: (err) => alert('Không thể xuất ảnh: ' + (err?.message || 'Lỗi chụp màn hình'))
    })
  }

  // ── Quản lý Modal Xuất Excel ──
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleOpenExportModal = useCallback(() => {
    if (!displayDetailList || displayDetailList.length === 0) {
      alert('Không có dữ liệu báo cáo để xuất!')
      return
    }
    setIsExportModalOpen(true)
  }, [displayDetailList])

  const executeExportStatExcel = useCallback(
    async ({ fileName, saveDirectory, overwriteExisting, includeHeaders, exportableCols }) => {
      const validCols = exportableCols || rawStatCols.filter((c) => c.id && c.id !== 'WorkingTag')
      const plantDisplayName = plantKey === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ' : 'NHÀ MÁY GS HÀ NỘI'
      const reportTitle = `BÁO CÁO NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT - ${plantDisplayName}`
      const dateStr = dateRange?.[0] && dateRange?.[1] ? `${dateRange[0]} - ${dateRange[1]}` : ''
      const filterSummary = `Nhà máy: ${plantDisplayName}${dateStr ? ` | Thời gian: ${dateStr}` : ''}`

      const wb = generateExcelWorkbook({
        data: displayDetailList,
        columns: validCols,
        sheetName: 'NhatTrinh_ChiTiet_TKSX',
        reportTitle,
        filterInfo: filterSummary,
        includeHeaders: includeHeaders !== false,
        formatDateFn: getCleanDate
      })

      await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
    },
    [displayDetailList, rawStatCols, plantKey, dateRange]
  )

  const handleExportDetailExcel = handleOpenExportModal
  const handleExportExcel = handleOpenExportModal

  return {
    // State
    dateRange,
    onDateRangeChange,
    setDateRange: onDateRangeChange,
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
    showDetailSearch,
    setShowDetailSearch,

    // Refs
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    syncChartRef,
    autoExportChartRef,
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
    missingAutoExportTickets,
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
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportStatExcel,
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
