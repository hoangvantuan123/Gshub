import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  queryPlanMaster,
  queryProductionStatisticsReport,
  queryProductionPlanReport
} from '../../../registration/services/planRegistrationService'
import { useStatisticsImportColumns } from '../../../registration/statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../../../registration/plan/columns/planImportColumns'
import { captureReportScreenshot } from '../../../common/screenshotHelper'
import { getCleanDate } from '../../../common/reportUtils'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../../utils/exportExcelUtils'
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

const build3TierDetailSheet = (reportTitle, validCols, list) => {
  const row1_Title = [reportTitle]
  const row2_Group = ['STT']
  const row3_ColName = ['STT']

  const merges = []
  const totalCols = validCols.length + 1 // +1 cho cột STT

  // Dòng 1 merge toàn bộ độ rộng các cột
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })

  let currentGroup = null
  let groupStartIndex = -1

  validCols.forEach((col, idx) => {
    const colIdx = idx + 1 // +1 do col 0 là STT
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

  const dataRows = list.map((item, rowIdx) => {
    const row = [rowIdx + 1]
    validCols.forEach((col) => {
      const colId = col.id
      const rawVal =
        item[colId] ??
        item[colId.charAt(0).toLowerCase() + colId.slice(1)] ??
        (item.raw
          ? (item.raw[colId] ?? item.raw[colId.charAt(0).toLowerCase() + colId.slice(1)])
          : '') ??
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
  ws['!cols'] = [
    { wch: 8 },
    ...validCols.map((col) => ({
      wch: Math.max(12, Math.min(50, Math.round((col.width || 120) / 7.5)))
    }))
  ]
  return ws
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
  const [backendReportData, setBackendReportData] = useState(null)
  const [rawDataset, setRawDataset] = useState([])
  const [masterList, setMasterList] = useState([])

  const [selectedTeam, setSelectedTeam] = useState([])
  const [selectedMachine, setSelectedMachine] = useState([])
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
        factoryCode: factoryCode,
        ReportType: reportType === 'plan' ? 'plan' : 'statistics',
        reportType: reportType === 'plan' ? 'plan' : 'statistics',
        FromDate: dateRange[0],
        ToDate: dateRange[1],
        fromDate: dateRange[0],
        toDate: dateRange[1],
        StatDateFrom: dateRange[0],
        StatDateTo: dateRange[1],
        Page: 1,
        Limit: 100000,
        pageSize: '10000'
      }
      if (selectedMasterKey) {
        params.MasterSeq = selectedMasterKey
        params.RegCode = selectedMasterKey
        params.regCode = selectedMasterKey
      }

      if (reportType === 'plan') {
        const planAggRes = await queryProductionPlanReport(params)
        const repData = planAggRes?.data || planAggRes || {}
        setBackendReportData(repData)

        let rowsArray = []
        if (repData.items && Array.isArray(repData.items) && repData.items.length > 0) {
          rowsArray = repData.items
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
        const reportRes = await queryProductionStatisticsReport(params)
        const repData = reportRes?.data || reportRes || {}
        setBackendReportData(repData)

        let rowsArray = []
        if (repData.items && Array.isArray(repData.items) && repData.items.length > 0) {
          rowsArray = repData.items
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
          const rawDurationMinutes = parseCleanNumber(
            row.durationMinutes ?? row.DurationMinutes,
            parseDurationToMinutes(row.ActualRunTime || row.ActualProdTime, rawStart, rawEnd)
          )
          const rawWaste =
            row.TotalWasteMinutes ??
            row.totalWasteMinutes ??
            row.TotalDowntimeMinutes ??
            row.totalDowntimeMinutes
          let wasteMin = 0
          if (rawWaste !== undefined && rawWaste !== null && rawWaste !== '') {
            wasteMin = parseFloat(String(rawWaste).replace(',', '.')) || 0
          } else {
            const bd =
              parseFloat(String(row.BreakdownMinutes ?? row.breakdownMinutes ?? 0).replace(',', '.')) || 0
            const wm =
              parseFloat(
                String(row.WaitingMaterialMinutes ?? row.waitingMaterialMinutes ?? 0).replace(',', '.')
              ) || 0
            const st =
              parseFloat(String(row.SetupMinutes ?? row.setupMinutes ?? 0).replace(',', '.')) || 0
            const rp =
              parseFloat(String(row.RepairMinutes ?? row.repairMinutes ?? 0).replace(',', '.')) || 0
            wasteMin = bd + wm + st + rp
          }
          const durationMinutes =
            wasteMin > 0 && rawDurationMinutes > 0
              ? Math.max(0, Number((rawDurationMinutes - wasteMin).toFixed(1)))
              : rawDurationMinutes
          const runtimeHours = Number((durationMinutes / 60).toFixed(2))

          const regDateRaw =
            mInfo?.ApplyDate ||
            row.ApplyDate ||
            row.prodDate ||
            row.ProdDate ||
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
    const hasTeamFilter = Array.isArray(selectedTeam)
      ? selectedTeam.length > 0 && !selectedTeam.includes('ALL')
      : selectedTeam && selectedTeam !== 'ALL'
    const teamSet = hasTeamFilter
      ? new Set(Array.isArray(selectedTeam) ? selectedTeam : [selectedTeam])
      : null

    const hasMachineFilter = Array.isArray(selectedMachine)
      ? selectedMachine.length > 0 && !selectedMachine.includes('ALL')
      : selectedMachine && selectedMachine !== 'ALL'
    const machineSet = hasMachineFilter
      ? new Set(Array.isArray(selectedMachine) ? selectedMachine : [selectedMachine])
      : null

    return rawDataset.filter((item) => {
      if (teamSet && !teamSet.has(item.team)) return false
      if (machineSet && !machineSet.has(item.machineCode)) return false
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
          String(item.machineName || '')
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
    if (rawDataset.length === 0 && backendReportData?.filterOptions) {
      const bFo = backendReportData.filterOptions
      return {
        teams: (bFo.teams || []).map((t) => ({ value: t, label: t, searchKey: t })),
        machines: (bFo.machines || []).map((m) => ({
          value: m,
          label: m,
          machineCode: m,
          machineName: m,
          searchKey: m
        }))
      }
    }
    const teams = new Set()
    const machineMap = new Map()
    rawDataset.forEach((item) => {
      if (item.team) teams.add(item.team)
      const code = item.machineCode
      const name = item.machineName || ''
      if (code) {
        if (!machineMap.has(code) || (!machineMap.get(code) && name)) {
          machineMap.set(code, name || code)
        }
      }
    })
    return {
      teams: Array.from(teams)
        .sort()
        .map((t) => ({ value: t, label: t, searchKey: t })),
      machines: Array.from(machineMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, name]) => {
          const hasDiffName = name && name !== code
          return {
            value: code,
            label: hasDiffName ? `${code} - ${name}` : code,
            machineCode: code,
            machineName: name,
            searchKey: `${code} ${name}`
          }
        })
    }
  }, [rawDataset, backendReportData])

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
    if (
      filteredData.length === 0 &&
      (backendReportData?.summary || backendReportData?.data?.summary)
    ) {
      const s = backendReportData?.summary || backendReportData?.data?.summary || {}
      const autoCount = s.autoExportCount ?? 0
      const noAutoCount = s.noAutoExportCount ?? 0
      const noMatCount = s.noMaterialCount ?? s.noMaterialAutoIoCount ?? 0
      const autoRate =
        s.autoExportRate ??
        (autoCount + noAutoCount > 0
          ? Number(((autoCount / (autoCount + noAutoCount)) * 100).toFixed(2))
          : 0)
      const noAutoRate =
        s.noAutoExportRate ??
        (autoCount + noAutoCount > 0
          ? Number(((noAutoCount / (autoCount + noAutoCount)) * 100).toFixed(2))
          : 0)

      const syncList =
        backendReportData?.syncDelayBreakdown || backendReportData?.data?.syncDelayBreakdown || []
      const under10Item = syncList.find((x) => (x.group || x.label || '').includes('10'))
      const instantRateVal =
        under10Item?.rate ??
        (s.totalTickets > 0 && under10Item?.count
          ? Number(((under10Item.count / s.totalTickets) * 100).toFixed(1))
          : 100)

      return {
        totalTickets: s.totalTickets || s.totalOrders || 0,
        totalActualQty: s.totalActualQty || 0,
        totalPassQty: s.totalPassQty || 0,
        totalDefectQty: s.totalDefectQty || 0,
        overallPassRate: s.overallPassRate ?? s.avgPassRate ?? 0,
        totalRuntimeHours: s.totalRuntimeHours || 0,
        totalDurationMinutes: s.totalDurationMinutes || 0,
        avgRuntimeHours: s.avgRuntimeHours || 0,
        mesCreatedCount: s.mesCreatedCount ?? s.mesCount ?? 0,
        bravoCreatedCount: s.bravoCreatedCount ?? 0,
        runtimeOver12hCheck: s.runtimeOver12hCheck ?? s.over12hCount ?? 0,
        runtimeUnder5Min: s.runtimeUnder5Min ?? s.under5MinCount ?? 0,
        mesCount: s.mesCount ?? 0,
        mesRate: s.mesRate ?? 100,
        over12hCount: s.over12hCount ?? 0,
        under5MinCount: s.under5MinCount ?? 0,
        under5MinRate: s.under5MinRate ?? 0,
        syncDelayCount: s.syncDelayCount ?? 0,
        avgSyncDelaySeconds: s.avgSyncDelaySeconds ?? 0,
        syncLatencyFormatted: s.syncLatencyFormatted || s.avgSyncDelayFormatted || '00:00:00',
        maxSyncDelayFormatted: s.maxSyncDelayFormatted || '00:00:00',
        instantRate: instantRateVal,
        syncSuccessRate: `${instantRateVal}%`,
        syncBreakdown: syncList,
        autoExportBreakdown:
          backendReportData?.autoExportBreakdown ||
          backendReportData?.data?.autoExportBreakdown ||
          [],
        autoExportRate: autoRate,
        noAutoExportRate: noAutoRate,
        autoExportCount: autoCount,
        noAutoExportCount: noAutoCount,
        noMaterialAutoIoCount: noMatCount,
        totalApplicableAutoIo: s.totalApplicableAutoIo || autoCount + noAutoCount
      }
    }
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
      if (durMin < 5) under5MinCount++

      const orig = String(item.source || item.origin || '').toUpperCase()
      if (orig.includes('MES')) mesCount++

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
    const list = backendReportData?.machineBreakdown || backendReportData?.chartByMachine || []
    if (filteredData.length === 0 && list.length > 0) {
      const hasTeamFilter = Array.isArray(selectedTeam)
        ? selectedTeam.length > 0 && !selectedTeam.includes('ALL')
        : selectedTeam && selectedTeam !== 'ALL'
      const teamSet = hasTeamFilter
        ? new Set(Array.isArray(selectedTeam) ? selectedTeam : [selectedTeam])
        : null

      const hasMachineFilter = Array.isArray(selectedMachine)
        ? selectedMachine.length > 0 && !selectedMachine.includes('ALL')
        : selectedMachine && selectedMachine !== 'ALL'
      const machineSet = hasMachineFilter
        ? new Set(Array.isArray(selectedMachine) ? selectedMachine : [selectedMachine])
        : null

      return list
        .filter((m) => {
          if (teamSet && !teamSet.has(m.teamName) && !teamSet.has(m.team)) return false
          if (machineSet && !machineSet.has(m.machineCode)) return false
          return true
        })
        .map((m) => {
          const actualQty = m.actualQty ?? m.totalActualQty ?? m.ProdQty ?? 0
          const passQty = m.passQty ?? m.totalPassQty ?? m.PassQty ?? actualQty
          const defectQty = m.defectQty ?? m.totalDefectQty ?? 0
          const runtimeHours = m.runtimeHours ?? m.totalRuntimeHours ?? 0
          const tickets = m.tickets ?? m.ticketCount ?? m.totalTickets ?? 0
          const passRate = actualQty > 0 ? (passQty / actualQty) * 100 : m.passRate || 100
          const runtimeVsCapacity = Number(
            (((runtimeHours || 0) / standardCapacityHours) * 100).toFixed(1)
          )
          const avgDailyHours = Number(((runtimeHours || 0) / Math.max(1, totalDays)).toFixed(1))
          const speed = (runtimeHours || 0) > 0 ? Math.round(passQty / runtimeHours) : 0
          return {
            machineCode: m.machineCode,
            machineName: m.machineName || m.machineCode,
            machineGroup: m.machineGroup || m.teamName || 'Khác',
            team: m.team || m.teamName || 'Khác',
            unit: m.unit || 'Chiếc',
            ticketCount: tickets,
            totalActualQty: actualQty,
            totalPassQty: passQty,
            totalDefectQty: defectQty,
            totalRuntimeHours: Number((runtimeHours || 0).toFixed(1)),
            runtimeHours: Number((runtimeHours || 0).toFixed(1)),
            runtimeVsCapacity,
            avgDailyHours,
            passRate: Number(passRate.toFixed(1)),
            speed,
            speedPerHour: speed,
            actualQty: actualQty,
            passQty: passQty,
            defectQty: defectQty,
            tickets: tickets,
            mesRate: m.mesRate || 0,
            over12hCount: m.over12hCount ?? m.anomalies ?? 0
          }
        })
        .sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
    }
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

    const listFinal = Array.from(map.values()).map((m) => {
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

    return listFinal.sort((a, b) => b.totalRuntimeHours - a.totalRuntimeHours)
  }, [
    filteredData,
    totalDays,
    standardCapacityHours,
    backendReportData,
    selectedTeam,
    selectedMachine
  ])

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
    const list = backendReportData?.teamBreakdown || backendReportData?.chartByTeam || []
    if (filteredData.length === 0 && list.length > 0) {
      const hasTeamFilter = Array.isArray(selectedTeam)
        ? selectedTeam.length > 0 && !selectedTeam.includes('ALL')
        : selectedTeam && selectedTeam !== 'ALL'
      const teamSet = hasTeamFilter
        ? new Set(Array.isArray(selectedTeam) ? selectedTeam : [selectedTeam])
        : null

      return list
        .filter((t) => {
          if (teamSet && !teamSet.has(t.teamName) && !teamSet.has(t.team)) return false
          return true
        })
        .map((t) => {
          const actualQty = t.actualQty ?? t.totalActualQty ?? t.ProdQty ?? 0
          const passQty = t.passQty ?? t.totalPassQty ?? t.PassQty ?? actualQty
          const defectQty = t.defectQty ?? t.totalDefectQty ?? 0
          const runtimeHours = t.runtimeHours ?? t.totalRuntimeHours ?? 0
          const tickets = t.tickets ?? t.ticketCount ?? t.totalTickets ?? 0
          const passRate = actualQty > 0 ? (passQty / actualQty) * 100 : t.passRate || 100
          return {
            team: t.team || t.teamName,
            teamName: t.teamName || t.team,
            teamCode: t.teamCode || '',
            ticketCount: tickets,
            tickets: tickets,
            actualQty: actualQty,
            totalActualQty: actualQty,
            passQty: passQty,
            totalPassQty: passQty,
            defectQty: defectQty,
            totalDefectQty: defectQty,
            runtimeHours: Number((runtimeHours || 0).toFixed(1)),
            totalRuntimeHours: Number((runtimeHours || 0).toFixed(1)),
            passRate: Number(passRate.toFixed(1)),
            mesRate: t.mesRate || 0,
            under5Min: t.under5Min || 0,
            anomalies: t.anomalies || 0,
            mesCount: t.mesCount || 0
          }
        })
        .sort((a, b) => b.totalActualQty - a.totalActualQty)
    }
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
      .sort((a, b) => b.totalActualQty - a.totalActualQty)
  }, [filteredData, backendReportData, selectedTeam])

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

  // Machine Timeline Breakdown
  const machineTimelineBreakdown = useMemo(() => {
    const backendData =
      backendReportData?.machineTimelineBreakdown ||
      backendReportData?.MachineTimelineBreakdown ||
      backendReportData?.data?.machineTimelineBreakdown ||
      backendReportData?.data?.MachineTimelineBreakdown

    if (
      backendData &&
      ((Array.isArray(backendData.dailyList) && backendData.dailyList.length > 0) ||
        (Array.isArray(backendData.machineList) && backendData.machineList.length > 0))
    ) {
      return backendData
    }

    const dateMap = new Map()
    const machineSet = new Set()
    const machineClusterMap = new Map()

    filteredData.forEach((item) => {
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'
      const mCode = item.machineCode || 'M-UNKNOWN'
      const mName = item.machineName || mCode
      machineSet.add(mCode)
      if (!machineClusterMap.has(mCode)) {
        machineClusterMap.set(mCode, {
          machineCode: mCode,
          machineName: mName,
          teamName: item.team || item.teamName || 'Khác',
          isManual: isManualMachine(item)
        })
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          shortDate:
            dateKey.length >= 10 ? `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}` : dateKey,
          name: dateKey.length >= 10 ? `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}` : dateKey,
          runtimeHours: 0,
          totalRuntime: 0,
          ticketCount: 0,
          totalTickets: 0,
          actualQty: 0,
          machineStats: {}
        })
      }

      const rec = dateMap.get(dateKey)
      const rt = Number(item.runtimeHours || 0)
      const qty = Number(item.actualQty || item.ProdQty || 0)
      rec.ticketCount++
      rec.totalTickets++
      rec.runtimeHours += rt
      rec.totalRuntime += rt
      rec.actualQty += qty

      if (!rec.machineStats[mCode]) {
        rec.machineStats[mCode] = { runtimeHours: 0, ticketCount: 0, actualQty: 0 }
      }
      rec.machineStats[mCode].runtimeHours += rt
      rec.machineStats[mCode].ticketCount++
      rec.machineStats[mCode].actualQty += qty
    })

    const machineList = Array.from(machineSet).sort()
    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    const dailyList = sortedDates.map((d) => {
      const row = {
        date: d.date,
        shortDate: d.shortDate,
        name: d.name,
        runtimeHours: Number(d.runtimeHours.toFixed(1)),
        totalRuntime: Number(d.runtimeHours.toFixed(1)),
        ticketCount: d.ticketCount,
        totalTickets: d.ticketCount,
        totalOrders: d.ticketCount,
        actualQty: d.actualQty
      }
      machineList.forEach((m) => {
        const ms = d.machineStats[m] || { runtimeHours: 0, ticketCount: 0, actualQty: 0 }
        row[m] = Number(ms.runtimeHours.toFixed(1))
        row[`${m}_runtime`] = Number(ms.runtimeHours.toFixed(1))
        row[`${m}_tickets`] = ms.ticketCount
        row[`${m}_actualQty`] = ms.actualQty
        row[`${m}_runtimeRate`] =
          d.runtimeHours > 0 ? Number(((ms.runtimeHours / d.runtimeHours) * 100).toFixed(1)) : 0
      })
      return row
    })

    return {
      dailyList,
      monthlyList: [],
      quarterlyList: [],
      machineList,
      machineClusters: Array.from(machineClusterMap.values())
    }
  }, [filteredData, backendReportData])

  // Team Timeline Breakdown
  const teamTimelineBreakdown = useMemo(() => {
    const backendData =
      backendReportData?.teamTimelineBreakdown ||
      backendReportData?.TeamTimelineBreakdown ||
      backendReportData?.data?.teamTimelineBreakdown ||
      backendReportData?.data?.TeamTimelineBreakdown

    if (
      backendData &&
      ((Array.isArray(backendData.dailyList) && backendData.dailyList.length > 0) ||
        (Array.isArray(backendData.teamList) && backendData.teamList.length > 0))
    ) {
      return backendData
    }

    const dateMap = new Map()
    const teamSet = new Set()
    const teamClusterMap = new Map()

    filteredData.forEach((item) => {
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'
      const tName = item.team || item.teamName || 'Tổ khác'
      teamSet.add(tName)
      if (!teamClusterMap.has(tName)) {
        teamClusterMap.set(tName, {
          teamName: tName,
          actualQty: 0,
          passQty: 0,
          defectQty: 0,
          ticketCount: 0
        })
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          shortDate:
            dateKey.length >= 10 ? `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}` : dateKey,
          name: dateKey.length >= 10 ? `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}` : dateKey,
          actualQty: 0,
          totalActualQty: 0,
          passQty: 0,
          totalPassQty: 0,
          defectQty: 0,
          totalDefectQty: 0,
          ticketCount: 0,
          totalTickets: 0,
          runtimeHours: 0,
          teamStats: {}
        })
      }

      const rec = dateMap.get(dateKey)
      const act = Number(item.actualQty || item.ProdQty || 0)
      const pass = Number(item.passQty || item.PassQty || act)
      const def = Number(item.defectQty || item.DefectQty || Math.max(0, act - pass))
      const rt = Number(item.runtimeHours || 0)

      rec.ticketCount++
      rec.totalTickets++
      rec.actualQty += act
      rec.totalActualQty += act
      rec.passQty += pass
      rec.totalPassQty += pass
      rec.defectQty += def
      rec.totalDefectQty += def
      rec.runtimeHours += rt

      const cluster = teamClusterMap.get(tName)
      cluster.actualQty += act
      cluster.passQty += pass
      cluster.defectQty += def
      cluster.ticketCount++

      if (!rec.teamStats[tName]) {
        rec.teamStats[tName] = {
          actualQty: 0,
          passQty: 0,
          defectQty: 0,
          ticketCount: 0,
          runtimeHours: 0
        }
      }
      rec.teamStats[tName].actualQty += act
      rec.teamStats[tName].passQty += pass
      rec.teamStats[tName].defectQty += def
      rec.teamStats[tName].ticketCount++
      rec.teamStats[tName].runtimeHours += rt
    })

    const teamList = Array.from(teamSet).sort()
    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    const dailyList = sortedDates.map((d) => {
      const row = {
        date: d.date,
        shortDate: d.shortDate,
        name: d.name,
        actualQty: d.actualQty,
        totalActualQty: d.actualQty,
        passQty: d.passQty,
        totalPassQty: d.passQty,
        defectQty: d.defectQty,
        totalDefectQty: d.defectQty,
        ticketCount: d.ticketCount,
        totalTickets: d.ticketCount,
        runtimeHours: Number(d.runtimeHours.toFixed(1)),
        totalRuntime: Number(d.runtimeHours.toFixed(1))
      }
      teamList.forEach((t) => {
        const ts = d.teamStats[t] || {
          actualQty: 0,
          passQty: 0,
          defectQty: 0,
          ticketCount: 0,
          runtimeHours: 0
        }
        row[t] = ts.actualQty
        row[`${t}_actualQty`] = ts.actualQty
        row[`${t}_passQty`] = ts.passQty
        row[`${t}_defectQty`] = ts.defectQty
        row[`${t}_tickets`] = ts.ticketCount
        row[`${t}_runtime`] = Number(ts.runtimeHours.toFixed(1))
        row[`${t}_passRate`] =
          ts.actualQty > 0 ? Number(((ts.passQty / ts.actualQty) * 100).toFixed(1)) : 100
        row[`${t}_defectRate`] =
          ts.actualQty > 0 ? Number(((ts.defectQty / ts.actualQty) * 100).toFixed(1)) : 0
      })
      return row
    })

    return {
      dailyList,
      monthlyList: [],
      quarterlyList: [],
      teamList,
      teamClusters: Array.from(teamClusterMap.values())
    }
  }, [filteredData, backendReportData])

  // Daily Aggregates for Timeline Evolution
  const dailyAggregates = useMemo(() => {
    const list =
      backendReportData?.dailyAggregates ||
      backendReportData?.dailyTrendData ||
      backendReportData?.chartByDay ||
      []
    if (filteredData.length === 0 && list.length > 0) {
      return list
        .map((d) => {
          const actualQty = d.actualQty ?? d.totalActualQty ?? d.ProdQty ?? 0
          const planQty = d.planQty ?? d.targetProdQty ?? 0
          const passQty = d.passQty ?? d.totalPassQty ?? actualQty
          const defectQty = d.defectQty ?? d.totalDefectQty ?? 0
          const runtimeHours = d.runtimeHours ?? d.totalRuntimeHours ?? 0
          const tickets = d.ticketCount ?? d.orderCount ?? d.tickets ?? 0
          const passRate = actualQty > 0 ? (passQty / actualQty) * 100 : d.passRate || 100
          const over12h = Number(d.over12hCount ?? d.anomalies ?? 0)
          const under5Min = Number(d.under5MinCount ?? d.under5Min ?? 0)
          const autoExported = Number(d.autoExportedCount ?? d.autoExportPass ?? 0)
          const notAutoExported = Number(d.notAutoExportedCount ?? d.autoExportMissing ?? 0)
          const nonMes = Number(d.nonMesCount ?? 0)
          const mes = Number(d.mesCount ?? Math.max(0, tickets - nonMes))
          const mesRate = Number(d.mesRate ?? (tickets > 0 ? (mes / tickets) * 100 : 100))
          const autoExportRate = Number(
            d.autoExportRate ??
              (autoExported + notAutoExported > 0
                ? (autoExported / (autoExported + notAutoExported)) * 100
                : 0)
          )
          const u10 = Number(d.under10 ?? d.syncUnder10 ?? 0)
          const f11to30 = Number(d.from11to30 ?? d.sync11to30 ?? 0)
          const f31to60 = Number(d.from31to60 ?? d.sync31to60 ?? 0)
          const o60 = Number(d.over60 ?? d.syncOver60 ?? 0)
          const sEmpty = Number(
            d.syncEmpty ?? Math.max(0, tickets - (u10 + f11to30 + f31to60 + o60))
          )
          const avgDelaySec = Number(d.avgSyncDelaySeconds ?? d.avgDelaySec ?? 0)
          const instantRate = Number(
            d.instantRate !== undefined && d.instantRate !== null
              ? d.instantRate
              : tickets > 0
                ? ((u10 / tickets) * 100).toFixed(1)
                : 100
          )

          return {
            ...d,
            date: d.date,
            ticketCount: tickets,
            tickets: tickets,
            orderCount: tickets,
            planQty: planQty,
            actualQty: actualQty,
            totalActualQty: actualQty,
            passQty: passQty,
            totalPassQty: passQty,
            defectQty: defectQty,
            totalDefectQty: defectQty,
            runtimeHours: Number((runtimeHours || 0).toFixed(1)),
            totalRuntimeHours: Number((runtimeHours || 0).toFixed(1)),
            passRate: Number(passRate.toFixed(1)),
            over12hCount: over12h,
            anomalies: over12h,
            under5MinCount: under5Min,
            under5Min: under5Min,
            autoExportedCount: autoExported,
            autoExportPass: autoExported,
            notAutoExportedCount: notAutoExported,
            autoExportMissing: notAutoExported,
            mesCount: mes,
            nonMesCount: nonMes,
            mesRate: Number(mesRate.toFixed(1)),
            autoExportRate: Number(autoExportRate.toFixed(1)),
            under10: u10,
            syncUnder10: u10,
            from11to30: f11to30,
            sync11to30: f11to30,
            from31to60: f31to60,
            sync31to60: f31to60,
            over60: o60,
            syncOver60: o60,
            syncEmpty: sEmpty,
            avgSyncDelaySeconds: avgDelaySec,
            avgDelaySec: avgDelaySec,
            instantRate: instantRate
          }
        })
        .sort((a, b) => {
          if (a.date === 'Khác') return 1
          if (b.date === 'Khác') return -1
          return String(a.date).localeCompare(String(b.date))
        })
    }
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
          runtimeHours: 0,
          over12hCount: 0,
          under5MinCount: 0,
          autoExportedCount: 0,
          notAutoExportedCount: 0,
          mesCount: 0,
          nonMesCount: 0,
          under10: 0,
          from11to30: 0,
          from31to60: 0,
          over60: 0,
          syncEmpty: 0,
          totalSyncSec: 0,
          syncCount: 0
        })
      }
      const rec = map.get(dateKey)
      rec.ticketCount++
      rec.planQty += Number(item.planQty || 0) || 0
      rec.actualQty += Number(item.actualQty || item.ProdQty || 0) || 0
      rec.passQty += Number(item.passQty || item.PassQty || 0) || 0
      rec.defectQty += Number(item.defectQty || 0) || 0
      const rHours = Number(item.runtimeHours || 0) || 0
      rec.runtimeHours += rHours
      const durMin = Number(item.durationMinutes ?? rHours * 60) || 0
      if (rHours > 12 || durMin > 720) rec.over12hCount++
      if (durMin < 5) rec.under5MinCount++

      const typeKey = getAutoExportType(item)
      if (isPassAutoIo(typeKey)) rec.autoExportedCount++
      else if (isMissingAutoIo(typeKey)) rec.notAutoExportedCount++

      const orig = String(item.source || item.origin || '').toUpperCase()
      if (orig.includes('MES')) rec.mesCount++
      else rec.nonMesCount++

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
        rec.syncEmpty++
      } else {
        rec.totalSyncSec += parsedSec
        rec.syncCount++
        if (parsedSec <= 10) rec.under10++
        else if (parsedSec <= 30) rec.from11to30++
        else if (parsedSec <= 60) rec.from31to60++
        else rec.over60++
      }
    })

    return Array.from(map.values())
      .map((rec) => {
        const avgDelaySec =
          rec.syncCount > 0 ? Number((rec.totalSyncSec / rec.syncCount).toFixed(1)) : 0
        const instantRate =
          rec.ticketCount > 0 ? Number(((rec.under10 / rec.ticketCount) * 100).toFixed(1)) : 100
        return {
          ...rec,
          syncUnder10: rec.under10,
          sync11to30: rec.from11to30,
          sync31to60: rec.from31to60,
          syncOver60: rec.over60,
          autoExportPass: rec.autoExportedCount,
          autoExportMissing: rec.notAutoExportedCount,
          avgSyncDelaySeconds: avgDelaySec,
          avgDelaySec: avgDelaySec,
          instantRate: instantRate
        }
      })
      .sort((a, b) => {
        if (a.date === 'Khác') return 1
        if (b.date === 'Khác') return -1
        return String(a.date).localeCompare(String(b.date))
      })
  }, [filteredData, backendReportData])

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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleOpenExportModal = () => {
    if (!displayDetailList || displayDetailList.length === 0) {
      alert('Không có dữ liệu báo cáo để xuất!')
      return
    }
    setIsExportModalOpen(true)
  }

  const executeExportTimelineExcel = async ({
    fileName,
    saveDirectory,
    overwriteExisting,
    exportableCols
  }) => {
    const plantDisplayName = factoryCode === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ 1B' : 'NHÀ MÁY GS HÀ NỘI'
    const wb = XLSX.utils.book_new()
    const validCols = exportableCols || (rawCols || []).filter((c) => c.id && c.id !== 'WorkingTag')

    // Sheet 1: Nhật trình chi tiết với tiêu đề merge 3 tầng chuẩn ERP
    const reportTitle = `BÁO CÁO TOÀN TRÌNH DIỄN BIẾN SẢN XUẤT - ${plantDisplayName}`
    const wsDetail = build3TierDetailSheet(reportTitle, validCols, displayDetailList)
    XLSX.utils.book_append_sheet(wb, wsDetail, 'NhatTrinh_ChiTiet')

    // Sheet 2: Tiến độ tổng hợp theo ngày
    if (dailyAggregates && dailyAggregates.length > 0) {
      const wsDaily = XLSX.utils.json_to_sheet(
        dailyAggregates.map((d, idx) => ({
          STT: idx + 1,
          'Ngày sản xuất': d.date,
          'Số phiếu': d.ticketCount,
          'Sản lượng SX': d.actualQty,
          'Đạt KCS': d.passQty,
          'Phế phẩm': d.defectQty,
          'Tổng giờ chạy (h)': Number((d.runtimeHours || 0).toFixed(1)),
          'Tỷ lệ đạt (%)':
            d.actualQty > 0 ? Number(((d.passQty / d.actualQty) * 100).toFixed(1)) : 100
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsDaily, 'TienDo_Theo_Ngay')
    }

    // Sheet 3: Tổng hợp theo máy
    const wsMachine = XLSX.utils.json_to_sheet(
      displayMachineList.map((m, idx) => ({
        STT: idx + 1,
        'Mã máy': m.machineCode,
        'Tên máy': m.machineName,
        'Tổ phụ trách': m.team,
        'Số phiếu': m.tickets,
        'Tổng giờ chạy (h)': m.runtimeHours,
        'Tỷ lệ tải / 24h (%)': m.runtimeVs24h,
        'Số lần > 12h': m.over12hCount,
        'Sản lượng SX': m.actualQty,
        'Sản lượng đạt': m.passQty,
        'Phế phẩm': m.defectQty,
        'Tỷ lệ đạt (%)': m.passRate,
        'Tỷ lệ MES (%)': m.mesRate,
        'Tốc độ (SP/h)': m.speedPerHour
      }))
    )
    XLSX.utils.book_append_sheet(wb, wsMachine, 'TongHop_Theo_May')

    // Sheet 4: Tổng hợp theo tổ sản xuất
    const wsTeam = XLSX.utils.json_to_sheet(
      teamAggregates.map((t, idx) => ({
        STT: idx + 1,
        'Tổ sản xuất': t.teamName || t.team,
        'Số phiếu': t.ticketCount || t.tickets,
        'Sản lượng SX': t.totalActualQty || t.actualQty,
        'Sản lượng đạt': t.totalPassQty || t.passQty,
        'Phế phẩm': t.totalDefectQty || t.defectQty,
        'Tỷ lệ đạt (%)':
          (t.totalActualQty > 0
            ? Number(((t.totalPassQty / t.totalActualQty) * 100).toFixed(1))
            : t.passRate) || 100,
        'Giờ máy chạy (h)': Number((t.totalRuntimeHours || t.runtimeHours || 0).toFixed(1))
      }))
    )
    XLSX.utils.book_append_sheet(wb, wsTeam, 'TongHop_Theo_To_SX')

    // Sheet 5: Phân tích độ trễ đồng bộ
    if (kpiMetrics.syncBreakdown && kpiMetrics.syncBreakdown.length > 0) {
      const wsSync = XLSX.utils.json_to_sheet(
        kpiMetrics.syncBreakdown.map((s) => ({
          'Dải thời gian đồng bộ': s.group,
          'Số phiếu': s.count,
          'Tỷ lệ (%)': s.rate
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsSync, 'Do_Tre_Dong_Bo')
    }

    // Sheet 6: Trạng thái tự động xuất kho
    if (kpiMetrics.autoExportBreakdown && kpiMetrics.autoExportBreakdown.length > 0) {
      const wsAuto = XLSX.utils.json_to_sheet(
        kpiMetrics.autoExportBreakdown.map((a) => ({
          'Loại trạng thái': a.label,
          'Số phiếu': a.count,
          'Tỷ lệ (%)': a.rate
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsAuto, 'Chung_Tu_Tu_Dong')
    }

    await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
  }

  const handleExportExcel = handleOpenExportModal

  const handleCaptureScreenshot = async () => {
    const el = reportRootRef.current
    if (!el) return
    const plantTitle = factoryCode === 'GS5' ? 'GS5_QueVo' : 'GS1_HaNoi'
    const dateStr =
      dateRange?.[0] && dateRange?.[1]
        ? `${dateRange[0]}_${dateRange[1]}`
        : new Date().toISOString().slice(0, 10)
    await captureReportScreenshot({
      targetEl: el,
      fileName: `BaoCao_ToanTrinh_${plantTitle}_${dateStr}`,
      onStart: () => setIsCapturing(true),
      onEnd: () => setIsCapturing(false),
      onError: (err) => alert('Không thể xuất ảnh: ' + (err?.message || 'Lỗi chụp màn hình'))
    })
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
    machineTimelineBreakdown,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    teamTimelineBreakdown,
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
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportTimelineExcel,
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
