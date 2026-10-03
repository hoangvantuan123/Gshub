import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  queryPlanMaster,
  queryProdStatsDetail,
  queryPlanDetail,
  queryProductionStatisticsReport
} from '../../../registration/services/planRegistrationService'
import { useStatisticsImportColumns } from '../../../registration/statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../../../registration/plan/columns/planImportColumns'
import { captureReportScreenshot } from '../../../common/screenshotHelper'
import { getCleanDate } from '../../../common/reportUtils'
import {
  parseSyncDelayToSeconds,
  formatSecondsToTime,
  getAutoExportType,
  isPassAutoIo,
  isMissingAutoIo,
  isNoMaterialAutoIo,
  isManualMachine
} from '../../hanoiGs1/stat/hooks/useProductionStatisticsLogic'

const parseCleanNumber = (val, defaultVal = 0) => {
  if (val === null || val === undefined || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val
  const cleanStr = String(val).replace(/,/g, '').trim()
  const n = Number(cleanStr)
  return isNaN(n) ? defaultVal : n
}

const parseDurationToMinutes = (val, start, end) => {
  const num = parseCleanNumber(val, 0)
  if (num > 0) return num
  if (start && end) {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const diffMs = e.getTime() - s.getTime()
      if (diffMs > 0) return Math.round(diffMs / 60000)
    } catch {
      // ignore
    }
  }
  return 0
}

const normalizeDateString = (dateVal) => {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }
  return getCleanDate(s) || s
}

const formatLocalDate = (d) => {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return ''
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useTimelineSummaryLogic() {
  const [factoryCode, setFactoryCode] = useState('GS1')
  const [reportType, setReportType] = useState('stat')
  // Mặc định: từ ngày 1 của tháng hiện tại đến hôm nay
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return [formatLocalDate(monthStart), formatLocalDate(now)]
  })
  const [selectedPreset, setSelectedPreset] = useState('this_month')
  const [selectedMasterKey, setSelectedMasterKey] = useState('')

  const [loading, setLoading] = useState(false)
  const [rawDataset, setRawDataset] = useState([])
  const [masterList, setMasterList] = useState([])

  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [detailSearchText, setDetailSearchText] = useState('')

  const [showMachineSummaryTable, setShowMachineSummaryTable] = useState(true)
  const [showTeamSummaryTable, setShowTeamSummaryTable] = useState(true)
  const [showSyncTable, setShowSyncTable] = useState(true)
  const [showAutoExportTable, setShowAutoExportTable] = useState(true)
  const [showDailySummaryTable, setShowDailySummaryTable] = useState(false)
  const [showManualMachines, setShowManualMachines] = useState(false)
  const [machineChartMode, setMachineChartMode] = useState('runtime')

  const [isHandbookModalOpen, setIsHandbookModalOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const reportRootRef = useRef(null)

  const rawStatCols = useStatisticsImportColumns()
  const rawPlanCols = usePlanImportColumns()
  const rawCols = useMemo(() => {
    return reportType === 'plan' ? rawPlanCols : rawStatCols
  }, [reportType, rawStatCols, rawPlanCols])

  const [detailColWidths, setDetailColWidths] = useState({})
  const [detailSortConfig, setDetailSortConfig] = useState({ key: '', direction: 'desc' })
  const [showDetailSearch, setShowDetailSearch] = useState(false)
  const detailGridRef = useRef(null)

  const factoryOptions = useMemo(
    () => [
      { value: 'GS1', label: 'Nhà máy GS Hà Nội' },
      { value: 'GS5', label: 'Nhà máy GS Quế Võ 1B' }
    ],
    []
  )

  const presets = useMemo(
    () => [
      { key: 'today', label: 'Hôm nay' },
      { key: '7d', label: '7 ngày' },
      { key: '30d', label: '30 ngày' },
      { key: 'this_month', label: 'Tháng này' },
      { key: 'last_month', label: 'Tháng trước' },
      { key: 'this_quarter', label: 'Quý này' },
      { key: 'this_year', label: 'Năm nay' },
      { key: 'all', label: 'Toàn lịch sử' }
    ],
    []
  )

  const handleApplyPreset = (key) => {
    setSelectedPreset(key)
    const now = new Date()
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (key === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (key === '7d') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (key === '30d') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (key === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (key === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (key === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      start = new Date(now.getFullYear(), qMonth, 1)
      end = new Date(now.getFullYear(), qMonth + 3, 0)
    } else if (key === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
    } else if (key === 'all') {
      start = new Date(2020, 0, 1)
      end = new Date(2030, 11, 31)
    }

    const newRange = [formatLocalDate(start), formatLocalDate(end)]
    setDateRange(newRange)
    setSelectedMasterKey('') // Reset master selection when user switches preset to prevent locking query
  }

  const handleCustomDateChange = (from, to) => {
    setSelectedPreset('custom')
    setSelectedMasterKey('') // Clear master key so custom date range queries all records
    setDateRange([from, to])
  }

function getMasterEffectiveDate(item) {
  if (!item) return 0
  if (item.ApplyDate) {
    const t = new Date(item.ApplyDate).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  const reg = String(item.RegCode || item.regCode || '')
  const match = reg.match(/_(\d{4})(\d{2})(\d{2})_/)
  if (match) {
    const t = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  if (item.Date) {
    const t = new Date(item.Date).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  if (item.CreatedAt) {
    const t = new Date(item.CreatedAt).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  return 0
}

  const fetchTimelineData = useCallback(async () => {
    setLoading(true)
    try {
      const mRes = await queryPlanMaster({
        FactoryCode: factoryCode,
        ReportType: reportType === 'plan' ? 'plan' : 'statistics',
        ApplyDateFrom: dateRange[0],
        ApplyDateTo: dateRange[1],
        Page: 1,
        Limit: 1000
      })
      const mList = Array.isArray(mRes?.data?.items)
        ? mRes.data.items
        : Array.isArray(mRes?.data)
          ? mRes.data
          : []
      mList.sort((a, b) => {
        const dateA = getMasterEffectiveDate(a)
        const dateB = getMasterEffectiveDate(b)
        if (dateB !== dateA) return dateB - dateA
        const createA = new Date(a.CreatedAt || 0).getTime()
        const createB = new Date(b.CreatedAt || 0).getTime()
        if (createB !== createA) return createB - createA
        return (b.IdSeq || b.MasterSeq || 0) - (a.IdSeq || a.MasterSeq || 0)
      })
      setMasterList(mList)

      const masterMap = new Map()
      mList.forEach((m) => {
        const k = m.RegCode || m.regCode || String(m.IdSeq || m.MasterSeq || '')
        if (k) masterMap.set(k, m)
      })

      const params = {
        FactoryCode: factoryCode,
        ReportType: reportType === 'plan' ? 'plan' : 'statistics',
        FromDate: dateRange[0],
        ToDate: dateRange[1],
        StatDateFrom: dateRange[0],
        StatDateTo: dateRange[1],
        Page: 1,
        Limit: 100000
      }
      if (selectedMasterKey) {
        params.MasterSeq = selectedMasterKey
        params.RegCode = selectedMasterKey
      }

      if (reportType === 'plan') {
        const detailRes = await queryPlanDetail(params)
        let rawRows = detailRes?.data?.items || detailRes?.data || []
        let rowsArray = Array.isArray(rawRows) ? rawRows : []

        if (rowsArray.length === 0 && mList.length > 0 && !selectedMasterKey) {
          // Fallback fetch each master
          const allBatchPromises = mList.slice(0, 50).map((m) =>
            queryPlanDetail({
              RegCode: m.RegCode || m.regCode,
              pageSize: '10000'
            }).catch(() => null)
          )
          const results = await Promise.all(allBatchPromises)
          results.forEach((r) => {
            const items = r?.data?.items || r?.data || []
            if (Array.isArray(items)) rowsArray.push(...items)
          })
        }

        const mappedItems = rowsArray.map((row, idx) => {
          const mKey = row.RegCode || row.regCode || String(row.MasterSeq || '')
          const mInfo = masterMap.get(mKey) || null
          const planQty = parseCleanNumber(row.PlanQty || row.TargetProdQty || 0)
          const actualQty = parseCleanNumber(row.ActualProdQty || row.ProdQty || 0) || planQty

          const regDateRaw =
            mInfo?.ApplyDate ||
            row.PlanDate ||
            row.RoutingDocDate ||
            row.StartDate ||
            row.OpDate ||
            '2026-09-29'
          const planDate = normalizeDateString(regDateRaw)

          return {
            ...row,
            id: row.IdSeq || String(idx + 1),
            docNo: row.OperationNo || row.RoutingDocNo || `LSX-${idx + 1}`,
            orderNo: row.RoutingDocNo || row.OrderNo || 'SO-2026',
            planNo: row.OperationNo || `KH-${idx + 1}`,
            regCode: row.RegCode || row.regCode || mInfo?.RegCode || '',
            pic: row.PicDp || row.Planner || 'Admin',
            date: planDate,
            team: String(row.OpTypeName || row.OperationName || row.TeamName || 'Tổ SX').trim(),
            machineCode: String(row.MachineCode || row.MachineName || 'CHUNG').trim(),
            machineName: String(row.MachineName || row.MachineCode || 'Thiết bị').trim(),
            itemCode: row.ItemCode || '',
            itemName: row.ItemName || '',
            planQty,
            actualQty,
            passQty: actualQty,
            defectQty: Math.max(0, planQty - actualQty),
            passRate:
              planQty > 0 ? Number(Math.min(100, (actualQty / planQty) * 100).toFixed(1)) : 100,
            runtimeHours: Number((parseCleanNumber(row.ActualProdTime, 0) / 60).toFixed(2)),
            durationMinutes: parseCleanNumber(row.ActualProdTime, 0),
            shift: row.ShiftName || row.Shift || 'Ca ngày',
            source: row.Source || 'KHSX',
            factoryCode: row.FactoryCode || mInfo?.FactoryCode || factoryCode || 'GS1',
            status: row.StatusDpSx || 'Khớp số lượng'
          }
        })
        setRawDataset(mappedItems)
      } else {
        let rowsArray = []
        try {
          const reportRes = await queryProductionStatisticsReport(params)
          const repData = reportRes?.data || reportRes
          if (
            repData &&
            repData.items &&
            Array.isArray(repData.items) &&
            repData.items.length > 0
          ) {
            rowsArray = repData.items
          }
        } catch (e) {
          console.warn('Backend GenerateProductionStatisticsReport fallback to detail query:', e)
        }

        if (rowsArray.length === 0) {
          const detailRes = await queryProdStatsDetail(params)
          const rawRows = detailRes?.data?.items || detailRes?.data || []
          rowsArray = Array.isArray(rawRows) ? rawRows : []
        }

        if (rowsArray.length === 0 && mList.length > 0 && !selectedMasterKey) {
          const allBatchPromises = mList.slice(0, 50).map((m) =>
            queryProdStatsDetail({
              RegCode: m.RegCode || m.regCode,
              pageSize: '10000'
            }).catch(() => null)
          )
          const results = await Promise.all(allBatchPromises)
          results.forEach((r) => {
            const items = r?.data?.items || r?.data || []
            if (Array.isArray(items)) rowsArray.push(...items)
          })
        }

        const mappedItems = rowsArray.map((row, idx) => {
          const mKey = row.RegCode || row.regCode || String(row.MasterSeq || '')
          const mInfo = masterMap.get(mKey) || null
          const planQty = parseCleanNumber(
            row.planQty ?? row.TargetProdQty ?? row.TargetPassQty ?? row.StandardMeters ?? 0
          )
          const actualQty =
            parseCleanNumber(
              row.actualQty ?? row.ProdQty ?? row.ActualMeters ?? row.StatPassQty ?? 0
            ) || planQty
          const passQty =
            parseCleanNumber(row.passQty ?? row.PassQty ?? row.StatPassQty ?? row.ProdQty ?? 0) ||
            actualQty
          const parsedDefect = parseCleanNumber(row.defectQty ?? row.DefectQty, 0)
          const defectQty = parsedDefect > 0 ? parsedDefect : Math.max(0, actualQty - passQty)
          const passRate =
            actualQty > 0
              ? Number(Math.min(100, Math.max(0, (passQty / actualQty) * 100)).toFixed(2))
              : 100

          const rawStart = row.startTime || row.StartTime || ''
          const rawEnd = row.endTime || row.EndTime || ''
          const durationMinutes = parseCleanNumber(
            row.durationMinutes ?? row.DurationMinutes,
            parseDurationToMinutes(row.ActualRunTime || row.ActualProdTime, rawStart, rawEnd)
          )
          const runtimeHours = Number((durationMinutes / 60).toFixed(2))

          const regDateRaw =
            row.prodDate ||
            row.ProdDate ||
            mInfo?.ApplyDate ||
            row.ApplyDate ||
            row.StatDate ||
            row.StartDate ||
            row.OpDate ||
            new Date().toISOString().slice(0, 10)
          const prodDate = getCleanDate(regDateRaw) || new Date().toISOString().slice(0, 10)

          const machineCode = String(
            row.machineCode || row.MachineCode || row.MachineId || row.RawLineCode || ''
          ).trim()
          const machineName = String(
            row.machineName ||
              row.MachineName ||
              row.RawLineName ||
              row.WorkCenter ||
              machineCode ||
              ''
          ).trim()
          const team = String(
            row.team ||
              row.teamName ||
              row.TeamName ||
              row.OpTypeName ||
              row.OperationName ||
              row.ProcessName ||
              'Tổ SX'
          ).trim()

          return {
            ...row,
            id: row.id || (row.IdSeq ? String(row.IdSeq) : row.StatTicketNo || String(idx + 1)),
            docNo: row.docNo || row.OperationNo || row.RoutingDocNo || `LSX-${idx + 1}`,
            ticketNo: row.ticketNo || row.StatTicketNo || row.RegCode || '',
            orderNo: row.orderNo || row.OrderNo || 'SO-2026',
            regCode: row.regCode || row.RegCode || mInfo?.RegCode || '',
            date: prodDate,
            team,
            machineCode,
            machineName,
            itemCode: row.itemCode || row.ItemCode || '',
            itemName: row.itemName || row.ItemName || '',
            planQty,
            actualQty,
            passQty,
            defectQty,
            passRate,
            durationMinutes,
            runtimeHours,
            shift: row.shift || row.ShiftName || row.Shift || 'Ca Ngày',
            source: row.createdSource || row.source || row.Source || 'MES',
            autoIoStatus: row.autoIoStatus || row.AutoIoStatus || '',
            factoryCode:
              row.factoryCode || row.FactoryCode || mInfo?.FactoryCode || factoryCode || 'GS1',
            status: row.status || (passRate >= 95 ? 'Đạt chuẩn KCS' : 'Cần kiểm tra')
          }
        })
        setRawDataset(mappedItems)
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu toàn trình:', err)
      setRawDataset([])
    } finally {
      setLoading(false)
    }
  }, [factoryCode, dateRange, selectedMasterKey, reportType])

  const hasFetchedInitialRef = useRef(false)
  useEffect(() => {
    if (!hasFetchedInitialRef.current) {
      hasFetchedInitialRef.current = true
      fetchTimelineData()
    }
  }, [fetchTimelineData])

  const filteredData = useMemo(() => {
    return rawDataset.filter((item) => {
      if (selectedTeam !== 'ALL' && item.team !== selectedTeam) return false
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false
      if (detailSearchText.trim()) {
        const q = detailSearchText.toLowerCase().trim()
        const match =
          String(item.docNo || '')
            .toLowerCase()
            .includes(q) ||
          String(item.ticketNo || '')
            .toLowerCase()
            .includes(q) ||
          String(item.orderNo || '')
            .toLowerCase()
            .includes(q) ||
          String(item.itemCode || '')
            .toLowerCase()
            .includes(q) ||
          String(item.itemName || '')
            .toLowerCase()
            .includes(q) ||
          String(item.team || '')
            .toLowerCase()
            .includes(q) ||
          String(item.machineCode || '')
            .toLowerCase()
            .includes(q) ||
          String(item.regCode || '')
            .toLowerCase()
            .includes(q)
        if (!match) return false
      }
      return true
    })
  }, [rawDataset, selectedTeam, selectedMachine, detailSearchText])

  const filterOptions = useMemo(() => {
    const teams = new Set()
    const machines = new Set()
    rawDataset.forEach((item) => {
      if (item.team) teams.add(item.team)
      if (item.machineCode) machines.add(item.machineCode)
    })
    return {
      teams: [
        { value: 'ALL', label: 'Tất cả tổ SX' },
        ...Array.from(teams)
          .sort()
          .map((t) => ({ value: t, label: t }))
      ],
      machines: Array.from(machines).sort()
    }
  }, [rawDataset])

  const masterOptions = useMemo(() => {
    const defaultLabel =
      reportType === 'plan'
        ? `Tất cả đợt KHSX (${masterList.length})`
        : `Tất cả đợt TKSX (${masterList.length})`
    return [
      { value: '', label: defaultLabel },
      ...masterList.map((m) => {
        const code = m.RegCode || m.regCode || String(m.IdSeq || m.MasterSeq || '')
        const date = m.ApplyDate || m.CreatedAt?.slice(0, 10) || ''
        return { value: code, label: `${code} ${date ? `(${date})` : ''}` }
      })
    ]
  }, [masterList, reportType])

  // KPI Metrics
  const kpiMetrics = useMemo(() => {
    const total = filteredData.length
    let actualQty = 0
    let passQty = 0
    let defectQty = 0
    let runtimeHours = 0
    let durationMinutes = 0

    let syncUnder10 = 0
    let sync11to30 = 0
    let sync31to60 = 0
    let syncOver60 = 0
    let syncEmpty = 0
    let totalSyncDelaySec = 0
    let syncDelayCount = 0
    let minSyncSec = Infinity
    let maxSyncSec = -Infinity

    let autoExportCount = 0
    let noAutoExportCount = 0
    let noMaterialAutoIoCount = 0
    const autoExportTypeMap = new Map()

    let mesCount = 0
    let over12hCount = 0
    let under5MinCount = 0

    filteredData.forEach((item) => {
      actualQty += Number(item.actualQty || item.ProdQty || 0) || 0
      passQty += Number(item.passQty || item.PassQty || 0) || 0
      defectQty += Number(item.defectQty || 0) || 0
      const rHours = Number(item.runtimeHours || 0) || 0
      runtimeHours += rHours
      const durMin = Number(item.durationMinutes || rHours * 60) || 0
      durationMinutes += durMin
      if (rHours > 12 || durMin > 720) over12hCount++
      if (durMin < 5 && durMin >= 0) under5MinCount++

      const orig = String(item.source || item.origin || '').toUpperCase()
      if (orig.includes('MES')) mesCount++

      const rawDelay =
        item.SyncDelayMinutes ?? item.syncDelayMinutes ?? item.SyncDelay ?? item.syncDelay
      const parsedSec = parseSyncDelayToSeconds(rawDelay, item)
      if (parsedSec === null || parsedSec === undefined || isNaN(parsedSec)) {
        syncEmpty++
      } else {
        totalSyncDelaySec += parsedSec
        syncDelayCount++
        if (parsedSec < minSyncSec) minSyncSec = parsedSec
        if (parsedSec > maxSyncSec) maxSyncSec = parsedSec

        if (parsedSec <= 10) syncUnder10++
        else if (parsedSec <= 30) sync11to30++
        else if (parsedSec <= 60) sync31to60++
        else syncOver60++
      }

      const typeKey = getAutoExportType(item)
      autoExportTypeMap.set(typeKey, (autoExportTypeMap.get(typeKey) || 0) + 1)
      if (isPassAutoIo(typeKey)) autoExportCount++
      else if (isMissingAutoIo(typeKey)) noAutoExportCount++
      else if (isNoMaterialAutoIo(typeKey)) noMaterialAutoIoCount++
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
        let color = '#01411b'
        if (isMissing) color = '#dc2626'
        else if (isNoMat) color = '#94a3b8'
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
        if (a.isMissing && !b.isMissing) return 1
        if (!a.isMissing && b.isMissing) return -1
        return b.count - a.count
      })

    const avgSyncSec = syncDelayCount > 0 ? totalSyncDelaySec / syncDelayCount : 0
    const syncLatencyFormatted = syncDelayCount > 0 ? formatSecondsToTime(avgSyncSec) : '00:00:00'
    const totalApplicableAutoIo = autoExportCount + noAutoExportCount
    const autoExportRate =
      totalApplicableAutoIo > 0
        ? Number(((autoExportCount / totalApplicableAutoIo) * 100).toFixed(1))
        : total > 0 && noAutoExportCount === 0
          ? 100
          : 0
    const noAutoExportRate =
      totalApplicableAutoIo > 0
        ? Number(((noAutoExportCount / totalApplicableAutoIo) * 100).toFixed(1))
        : 0

    return {
      totalTickets: total,
      totalActualQty: actualQty,
      totalPassQty: passQty,
      totalDefectQty: defectQty,
      overallPassRate: actualQty > 0 ? Number(((passQty / actualQty) * 100).toFixed(2)) : 100,
      totalRuntimeHours: Number(runtimeHours.toFixed(1)),
      totalDurationMinutes: Math.round(durationMinutes),
      avgRuntimeHours: total > 0 ? Number((runtimeHours / total).toFixed(2)) : 0,
      mesCreatedCount: mesCount,
      bravoCreatedCount: Math.max(0, total - mesCount),
      runtimeOver12hCheck: over12hCount,
      runtimeUnder5Min: under5MinCount,
      mesCount,
      mesRate: total > 0 ? Number(((mesCount / total) * 100).toFixed(1)) : 100,
      over12hCount,
      under5MinCount,
      under5MinRate: total > 0 ? Number(((under5MinCount / total) * 100).toFixed(1)) : 0,
      syncDelayCount,
      avgSyncDelaySeconds: Number(avgSyncSec.toFixed(1)),
      syncLatencyFormatted,
      maxSyncDelayFormatted: syncDelayCount > 0 ? formatSecondsToTime(maxSyncSec) : '00:00:00',
      syncSuccessRate: total > 0 ? `${(((total - syncEmpty) / total) * 100).toFixed(1)}%` : '100%',
      syncBreakdown,
      autoExportBreakdown,
      autoExportRate,
      noAutoExportRate,
      autoExportCount,
      noAutoExportCount,
      noMaterialAutoIoCount,
      totalApplicableAutoIo
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

  // Multi-day calculation
  const totalDays = useMemo(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const d1 = new Date(dateRange[0])
      const d2 = new Date(dateRange[1])
      const diff = Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (!isNaN(diff) && diff > 0) return diff
    }
    const distinctDates = new Set()
    filteredData.forEach((item) => {
      if (item.date) distinctDates.add(item.date)
    })
    if (distinctDates.size > 0) return distinctDates.size
    return 1
  }, [dateRange, filteredData])

  const standardCapacityHours = useMemo(() => totalDays * 24, [totalDays])

  // Machine Aggregates
  const machineAggregates = useMemo(() => {
    const map = new Map()
    filteredData.forEach((item) => {
      const code = item.machineCode || 'M-UNKNOWN'
      const name = item.machineName || code
      const group = item.machineGroup || item.team || 'Khác'
      const unit = item.unit || 'Chiếc'

      if (!map.has(code)) {
        map.set(code, {
          machineCode: code,
          machineName: name,
          machineGroup: group,
          team: item.team || group,
          unit: unit,
          ticketCount: 0,
          totalActualQty: 0,
          totalPassQty: 0,
          totalDefectQty: 0,
          totalRuntimeHours: 0,
          over12hCount: 0,
          mesCount: 0
        })
      }

      const rec = map.get(code)
      rec.ticketCount++
      rec.totalActualQty += Number(item.actualQty || item.ProdQty || 0) || 0
      rec.totalPassQty += Number(item.passQty || item.PassQty || 0) || 0
      rec.totalDefectQty += Number(item.defectQty || 0) || 0
      rec.totalRuntimeHours += Number(item.runtimeHours || 0) || 0
      if (Number(item.runtimeHours || 0) > 12) rec.over12hCount++
      const orig = String(item.source || item.origin || '').toUpperCase()
      if (orig.includes('MES')) rec.mesCount++
    })

    const list = Array.from(map.values()).map((m) => {
      const passRate = m.totalActualQty > 0 ? (m.totalPassQty / m.totalActualQty) * 100 : 100
      const runtimeVsCapacity = Number(
        ((m.totalRuntimeHours / standardCapacityHours) * 100).toFixed(1)
      )
      const avgDailyHours = Number((m.totalRuntimeHours / totalDays).toFixed(1))
      const speed = m.totalRuntimeHours > 0 ? Math.round(m.totalPassQty / m.totalRuntimeHours) : 0
      return {
        ...m,
        totalRuntimeHours: Number(m.totalRuntimeHours.toFixed(1)),
        runtimeHours: Number(m.totalRuntimeHours.toFixed(1)),
        runtimeVsCapacity,
        avgDailyHours,
        passRate: Number(passRate.toFixed(1)),
        speed,
        speedPerHour: speed,
        actualQty: m.totalActualQty,
        passQty: m.totalPassQty,
        defectQty: m.totalDefectQty,
        tickets: m.ticketCount,
        mesRate: m.ticketCount > 0 ? Number(((m.mesCount / m.ticketCount) * 100).toFixed(1)) : 0
      }
    })

    return list.sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
  }, [filteredData, totalDays, standardCapacityHours])

  const displayMachineList = useMemo(() => {
    let list = [...machineAggregates]
    if (!showManualMachines) {
      list = list.filter((m) => !isManualMachine(m))
    }
    return list
  }, [machineAggregates, showManualMachines])

  const machineGrandTotal = useMemo(() => {
    let tickets = 0,
      actualQty = 0,
      passQty = 0,
      defectQty = 0,
      runtimeHours = 0,
      over12hCount = 0
    displayMachineList.forEach((m) => {
      tickets += m.tickets
      actualQty += m.actualQty
      passQty += m.passQty
      defectQty += m.defectQty
      runtimeHours += m.runtimeHours
      over12hCount += m.over12hCount
    })
    const passRate = actualQty > 0 ? Number(((passQty / actualQty) * 100).toFixed(1)) : 100
    const speedPerHour = runtimeHours > 0 ? Math.round(actualQty / runtimeHours) : 0
    const avgRuntimeVsCapacity =
      displayMachineList.length > 0
        ? Number(
            ((runtimeHours / (displayMachineList.length * standardCapacityHours)) * 100).toFixed(1)
          )
        : 0
    return {
      machineCode: 'TỔNG CỘNG',
      machineName: '',
      team: '',
      tickets,
      totalTickets: tickets,
      runtimeHours: Number(runtimeHours.toFixed(1)),
      totalRuntime: Number(runtimeHours.toFixed(1)),
      runtimeVsCapacity: avgRuntimeVsCapacity,
      over12hCount,
      actualQty,
      totalActual: actualQty,
      passQty,
      totalPass: passQty,
      defectQty,
      totalDefect: defectQty,
      passRate,
      avgPassRate: passRate,
      speedPerHour,
      avgSpeed: speedPerHour
    }
  }, [displayMachineList, standardCapacityHours])

  // Team Aggregates
  const teamAggregates = useMemo(() => {
    const map = new Map()
    filteredData.forEach((item) => {
      const team = item.team || item.teamName || item.TeamName || 'Tổ Khác'
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
      const a = Number(item.actualQty || item.ProdQty || 0) || 0
      const pass = Number(item.passQty || item.PassQty || 0) || 0
      const parsedDef = Number(item.defectQty || 0) || 0
      const def = parsedDef > 0 ? parsedDef : Math.max(0, a - pass)
      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0

      rec.ticketCount++
      rec.totalActualQty += a
      rec.totalPassQty += pass
      rec.totalDefectQty += def
      rec.totalRuntimeHours += Number(item.runtimeHours || 0) || 0

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
      .sort((a, b) => b.totalActualQty - a.totalActualQty)
  }, [filteredData])

  const teamGrandTotal = useMemo(() => {
    const totalTickets = teamAggregates.reduce((acc, t) => acc + t.ticketCount, 0)
    const totalActual = teamAggregates.reduce((acc, t) => acc + t.totalActualQty, 0)
    const totalPass = teamAggregates.reduce((acc, t) => acc + t.totalPassQty, 0)
    const totalDefect = teamAggregates.reduce((acc, t) => acc + t.totalDefectQty, 0)
    const totalMes = teamAggregates.reduce((acc, t) => acc + t.mesCount, 0)
    const totalUnder5 = teamAggregates.reduce((acc, t) => acc + (t.under5Min || 0), 0)
    const totalAnomalies = teamAggregates.reduce((acc, t) => acc + (t.anomalies || 0), 0)
    const avgPassRate = totalActual > 0 ? Number(((totalPass / totalActual) * 100).toFixed(1)) : 100
    const avgMesRate = totalTickets > 0 ? Number(((totalMes / totalTickets) * 100).toFixed(1)) : 0
    return {
      teamCount: teamAggregates.length,
      totalTickets,
      totalActual,
      totalPass,
      totalDefect,
      totalUnder5,
      totalAnomalies,
      avgPassRate,
      avgMesRate
    }
  }, [teamAggregates])

  // Daily Aggregates for Timeline Evolution
  const dailyAggregates = useMemo(() => {
    const map = new Map()
    filteredData.forEach((item) => {
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          ticketCount: 0,
          planQty: 0,
          actualQty: 0,
          passQty: 0,
          defectQty: 0,
          runtimeHours: 0
        })
      }
      const rec = map.get(dateKey)
      rec.ticketCount++
      rec.planQty += Number(item.planQty || 0) || 0
      rec.actualQty += Number(item.actualQty || item.ProdQty || 0) || 0
      rec.passQty += Number(item.passQty || item.PassQty || 0) || 0
      rec.defectQty += Number(item.defectQty || 0) || 0
      rec.runtimeHours += Number(item.runtimeHours || 0) || 0
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })
  }, [filteredData])

  // Data Grid configuration for Section 5
  const detailGridCols = useMemo(() => {
    return (rawCols || [])
      .filter((c) => c.id && c.id !== 'WorkingTag')
      .map((col) => {
        let title = col.title
        if (detailSortConfig.key === col.id) {
          title += detailSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
        }
        const restCol = { ...col }
        delete restCol.themeOverride
        return {
          ...restCol,
          title,
          readonly: true,
          width: detailColWidths[col.id] || col.width || 130
        }
      })
  }, [rawCols, detailColWidths, detailSortConfig])

  const onDetailColumnResize = useCallback((column, newSize) => {
    setDetailColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const onDetailHeaderClicked = useCallback(
    (colIndex) => {
      const colObj = detailGridCols[colIndex]
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

  const displayDetailList = useMemo(() => {
    let list = [...filteredData]
    if (detailSearchText) {
      const q = detailSearchText.toLowerCase()
      list = list.filter((r) => {
        return (
          String(r.ticketNo || '')
            .toLowerCase()
            .includes(q) ||
          String(r.itemCode || '')
            .toLowerCase()
            .includes(q) ||
          String(r.itemName || '')
            .toLowerCase()
            .includes(q) ||
          String(r.machineCode || '')
            .toLowerCase()
            .includes(q) ||
          String(r.team || '')
            .toLowerCase()
            .includes(q) ||
          String(r.docNo || '')
            .toLowerCase()
            .includes(q) ||
          String(r.regCode || '')
            .toLowerCase()
            .includes(q)
        )
      })
    }

    if (detailSortConfig.key) {
      const { key, direction } = detailSortConfig
      list.sort((a, b) => {
        let valA = a[key] ?? a[key.charAt(0).toLowerCase() + key.slice(1)] ?? a.raw?.[key] ?? ''
        let valB = b[key] ?? b[key.charAt(0).toLowerCase() + key.slice(1)] ?? b.raw?.[key] ?? ''
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA
        }
        return direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      })
    }

    return list
  }, [filteredData, detailSearchText, detailSortConfig])

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

      let val = item[colId] ?? item[colId.charAt(0).toLowerCase() + colId.slice(1)] ?? ''
      if (val === '' && item.raw) {
        val = item.raw[colId] ?? item.raw[colId.charAt(0).toLowerCase() + colId.slice(1)] ?? ''
      }

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

  const handleCopyGrid = useCallback(() => {
    if (!displayDetailList || !displayDetailList.length) {
      alert('Không có dữ liệu để sao chép!')
      return
    }
    const colsToCopy = (detailGridCols || []).filter((c) => c.id && c.id !== 'WorkingTag')
    const headers = colsToCopy.map((c) => c.title || c.id)
    const keys = colsToCopy.map((c) => c.id)
    const headerRow = headers.join('\t')
    const rows = displayDetailList.map((row) =>
      keys
        .map((k) => {
          const val = row[k] ?? row[k.charAt(0).toLowerCase() + k.slice(1)] ?? ''
          return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ')
        })
        .join('\t')
    )
    const tsv = [headerRow, ...rows].join('\n')
    navigator.clipboard
      .writeText(tsv)
      .then(() => alert(`Đã sao chép ${displayDetailList.length} dòng vào Clipboard!`))
      .catch((err) => console.error('Lỗi sao chép:', err))
  }, [displayDetailList, detailGridCols])

  const detailTotalProd = useMemo(() => {
    return displayDetailList.reduce(
      (acc, d) => acc + (Number(d.actualQty ?? d.ProdQty ?? d.StatPassQty) || 0),
      0
    )
  }, [displayDetailList])

  const detailTotalPass = useMemo(() => {
    return displayDetailList.reduce((acc, d) => acc + (Number(d.passQty ?? d.PassQty) || 0), 0)
  }, [displayDetailList])

  const detailTotalMeters = useMemo(() => {
    return displayDetailList.reduce(
      (acc, d) => acc + (Number(d.ActualMeters ?? d.actualMeters) || 0),
      0
    )
  }, [displayDetailList])

  const detailTotalStdMeters = useMemo(() => {
    return displayDetailList.reduce(
      (acc, d) => acc + (Number(d.StandardMeters ?? d.standardMeters) || 0),
      0
    )
  }, [displayDetailList])

  const detailTotalRuntime = useMemo(() => {
    return displayDetailList.reduce((acc, d) => acc + (Number(d.runtimeHours) || 0), 0)
  }, [displayDetailList])

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      const wsMachine = XLSX.utils.json_to_sheet(
        displayMachineList.map((m) => ({
          'Mã máy': m.machineCode,
          'Tên máy': m.machineName,
          'Tổ phụ trách': m.team,
          'Số phiếu': m.tickets,
          'Tổng giờ chạy (h)': m.runtimeHours,
          'Tỷ lệ tải / 24h (%)': m.runtimeVs24h,
          'Lần > 12h': m.over12hCount,
          'Sản lượng SX': m.actualQty,
          'Sản lượng đạt': m.passQty,
          'Tỷ lệ đạt (%)': m.passRate,
          'Tốc độ (SP/h)': m.speedPerHour
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsMachine, 'Theo_May')

      const wsTeam = XLSX.utils.json_to_sheet(
        teamAggregates.map((t) => ({
          'Tổ sản xuất': t.team,
          'Số phiếu': t.tickets,
          'Sản lượng SX': t.actualQty,
          'Sản lượng đạt': t.passQty,
          'Phế phẩm': t.defectQty,
          'Tỷ lệ đạt (%)': t.passRate,
          'Giờ máy chạy (h)': t.runtimeHours,
          'Tốc độ (SP/h)': t.speedPerHour
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsTeam, 'Theo_To_SX')

      const wsSync = XLSX.utils.json_to_sheet(
        (kpiMetrics.syncBreakdown || []).map((s) => ({
          'Dải thời gian đồng bộ': s.group,
          'Số phiếu': s.count,
          'Tỷ lệ (%)': s.rate
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsSync, 'Do_Tre_Dong_Bo')

      const wsAuto = XLSX.utils.json_to_sheet(
        (kpiMetrics.autoExportBreakdown || []).map((a) => ({
          'Loại trạng thái': a.label,
          'Số phiếu': a.count,
          'Tỷ lệ (%)': a.rate
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsAuto, 'Chung_Tu_Tu_Dong')

      const wsDetail = XLSX.utils.json_to_sheet(
        filteredData.map((r, i) => ({
          STT: i + 1,
          'Mã đợt': r.regCode,
          'Ngày SX': r.date,
          'Lệnh SX / WO': r.docNo,
          'Số phiếu': r.ticketNo,
          'Mã hàng': r.itemCode,
          'Tên hàng': r.itemName,
          'Tổ SX': r.team,
          'Mã máy': r.machineCode,
          'Kế hoạch': r.planQty,
          'Thực tế': r.actualQty,
          'Đạt KCS': r.passQty,
          'Phế phẩm': r.defectQty,
          'Tỷ lệ đạt (%)': r.passRate,
          'Thời gian (phút)': r.durationMinutes,
          'Giờ chạy (h)': r.runtimeHours,
          'Nguồn ghi nhận': r.source,
          'Trạng thái': r.status
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_Toan_Trinh')

      const fName = `BaoCao_ToanTrinh_${reportType.toUpperCase()}_${factoryCode}_${dateRange[0]}_${dateRange[1]}.xlsx`
      XLSX.writeFile(wb, fName)
    } catch (err) {
      console.error('Lỗi xuất Excel:', err)
      alert('Không thể xuất file Excel: ' + err.message)
    }
  }

  const handleCaptureScreenshot = async () => {
    if (!reportRootRef.current) return
    setIsCapturing(true)
    try {
      const plantTitle = factoryCode === 'GS5' ? 'GS5_QueVo' : 'GS1_HaNoi'
      await captureReportScreenshot(
        reportRootRef.current,
        `BaoCao_ToanTrinh_${plantTitle}_${dateRange[0]}_${dateRange[1]}`
      )
    } catch (err) {
      console.error('Lỗi chụp ảnh:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  const currentPlantName = useMemo(() => {
    return factoryCode === 'GS5' ? 'Nhà máy GS Quế Võ 1B' : 'Nhà máy GS Hà Nội'
  }, [factoryCode])

  return {
    factoryCode,
    setFactoryCode,
    reportType,
    setReportType,
    dateRange,
    setDateRange,
    selectedPreset,
    setSelectedPreset,
    selectedMasterKey,
    setSelectedMasterKey,
    loading,
    rawDataset,
    masterList,
    selectedTeam,
    setSelectedTeam,
    selectedMachine,
    setSelectedMachine,
    detailSearchText,
    setDetailSearchText,
    showMachineSummaryTable,
    setShowMachineSummaryTable,
    showTeamSummaryTable,
    setShowTeamSummaryTable,
    showSyncTable,
    setShowSyncTable,
    showAutoExportTable,
    setShowAutoExportTable,
    showDailySummaryTable,
    setShowDailySummaryTable,
    showManualMachines,
    setShowManualMachines,
    machineChartMode,
    setMachineChartMode,
    isHandbookModalOpen,
    setIsHandbookModalOpen,
    isCapturing,
    reportRootRef,
    factoryOptions,
    presets,
    handleApplyPreset,
    handleCustomDateChange,
    filterOptions,
    masterOptions,
    kpiMetrics,
    dailyAggregates,
    machineAggregates,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    teamGrandTotal,
    missingAutoExportTickets,
    detailGridCols,
    onDetailColumnResize,
    onDetailHeaderClicked,
    displayDetailList,
    getDetailCellContent,
    handleCopyGrid,
    detailTotalProd,
    detailTotalPass,
    detailTotalMeters,
    detailTotalStdMeters,
    detailTotalRuntime,
    handleExportExcel,
    handleCaptureScreenshot,
    currentPlantName,
    fetchTimelineData,
    showDetailSearch,
    setShowDetailSearch,
    detailGridRef,
    totalDays,
    standardCapacityHours
  }
}
