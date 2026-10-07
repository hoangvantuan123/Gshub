import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { message } from 'antd'
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  queryPlanMaster,
  querySummaryStatReport
} from '../../../../registration/services/planRegistrationService'
import { useStatisticsImportColumns } from '../../../../registration/statistics/columns/statisticsImportColumns'
import { captureReportScreenshot } from '../../../../common/screenshotHelper'
import { getCleanDate } from '../../../../common/reportUtils'
import {
  parseSyncDelayToSeconds,
  formatSecondsToTime,
  getAutoExportType,
  isPassAutoIo,
  isMissingAutoIo,
  isNoMaterialAutoIo,
  isManualMachine
} from '../../../hanoiGs1/stat/hooks/useProductionStatisticsLogic'
import {
  parseCleanNumber,
  parseDurationToMinutes,
  formatVNDateShort,
  formatVNDateFull,
  formatLocalDate,
  getMasterEffectiveDate,
  calculateTotalDays,
  calculatePresetDateRange
} from '../../common/utils/summaryReportUtils'
import { executeExportSummaryExcel } from '../../common/utils/summaryExcelExporter'

const STORAGE_KEY_SUMMARY_STAT_FILTERS = 'S_SUMMARY_STAT_FILTERS'

const getInitialStatFilters = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUMMARY_STAT_FILTERS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const preset = parsed.selectedPreset || 'this_month'
        let initialDateRange = parsed.dateRange
        if (preset !== 'custom') {
          initialDateRange = calculatePresetDateRange(preset)
        } else if (!initialDateRange || !initialDateRange[0] || !initialDateRange[1]) {
          initialDateRange = calculatePresetDateRange('this_month')
        }
        return {
          factoryCode: parsed.factoryCode || 'GS1',
          dateRange: initialDateRange,
          selectedPreset: preset,
          selectedMasterKey: parsed.selectedMasterKey || '',
          selectedTeam: Array.isArray(parsed.selectedTeam) ? parsed.selectedTeam : [],
          selectedMachine: Array.isArray(parsed.selectedMachine) ? parsed.selectedMachine : [],
          selectedPic: parsed.selectedPic || 'ALL',
          showMachineSummaryTable:
            parsed.showMachineSummaryTable !== undefined ? parsed.showMachineSummaryTable : true,
          showTeamSummaryTable:
            parsed.showTeamSummaryTable !== undefined ? parsed.showTeamSummaryTable : true,
          showSyncTable: parsed.showSyncTable !== undefined ? parsed.showSyncTable : true,
          showAutoExportTable:
            parsed.showAutoExportTable !== undefined ? parsed.showAutoExportTable : true,
          showManualMachines:
            parsed.showManualMachines !== undefined ? parsed.showManualMachines : false,
          machineChartMode: parsed.machineChartMode || 'runtime'
        }
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc cache bộ lọc TKSX:', e)
  }
  return {
    factoryCode: 'GS1',
    dateRange: calculatePresetDateRange('this_month'),
    selectedPreset: 'this_month',
    selectedMasterKey: '',
    selectedTeam: [],
    selectedMachine: [],
    selectedPic: 'ALL',
    showMachineSummaryTable: true,
    showTeamSummaryTable: true,
    showSyncTable: true,
    showAutoExportTable: true,
    showManualMachines: false,
    machineChartMode: 'runtime'
  }
}

export function useSummaryStatisticsLogic() {
  const initialFilters = useMemo(() => getInitialStatFilters(), [])

  const [factoryCode, setFactoryCode] = useState(initialFilters.factoryCode)
  const [dateRange, setDateRange] = useState(initialFilters.dateRange)
  const [selectedPreset, setSelectedPreset] = useState(initialFilters.selectedPreset)
  const [selectedMasterKey, setSelectedMasterKey] = useState(initialFilters.selectedMasterKey)

  const [loading, setLoading] = useState(false)
  const [backendReportData, setBackendReportData] = useState(null)
  const [rawDataset, setRawDataset] = useState([])
  const [masterList, setMasterList] = useState([])

  const [selectedTeam, setSelectedTeam] = useState(initialFilters.selectedTeam)
  const [selectedMachine, setSelectedMachine] = useState(initialFilters.selectedMachine)
  const [selectedPic, setSelectedPic] = useState(initialFilters.selectedPic)
  const [detailSearchText, setDetailSearchText] = useState('')

  const [showMachineSummaryTable, setShowMachineSummaryTable] = useState(
    initialFilters.showMachineSummaryTable
  )
  const [showTeamSummaryTable, setShowTeamSummaryTable] = useState(
    initialFilters.showTeamSummaryTable
  )
  const [showSyncTable, setShowSyncTable] = useState(initialFilters.showSyncTable)
  const [showAutoExportTable, setShowAutoExportTable] = useState(initialFilters.showAutoExportTable)
  const [showManualMachines, setShowManualMachines] = useState(initialFilters.showManualMachines)
  const [machineChartMode, setMachineChartMode] = useState(initialFilters.machineChartMode)

  // Ghi nhớ cache điều kiện lọc vào localStorage
  useEffect(() => {
    try {
      const filtersToSave = {
        factoryCode,
        dateRange,
        selectedPreset,
        selectedMasterKey,
        selectedTeam,
        selectedMachine,
        selectedPic,
        showMachineSummaryTable,
        showTeamSummaryTable,
        showSyncTable,
        showAutoExportTable,
        showManualMachines,
        machineChartMode
      }
      localStorage.setItem(STORAGE_KEY_SUMMARY_STAT_FILTERS, JSON.stringify(filtersToSave))
    } catch (e) {
      console.warn('Lỗi lưu cache bộ lọc TKSX:', e)
    }
  }, [
    factoryCode,
    dateRange,
    selectedPreset,
    selectedMasterKey,
    selectedTeam,
    selectedMachine,
    selectedPic,
    showMachineSummaryTable,
    showTeamSummaryTable,
    showSyncTable,
    showAutoExportTable,
    showManualMachines,
    machineChartMode
  ])

  const [isHandbookModalOpen, setIsHandbookModalOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const reportRootRef = useRef(null)

  const rawCols = useStatisticsImportColumns()
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

  const handleApplyPreset = useCallback((key) => {
    setSelectedPreset(key)
    const newRange = calculatePresetDateRange(key)
    setDateRange(newRange)
    setSelectedMasterKey('')
  }, [])

  const handleCustomDateChange = useCallback((from, to) => {
    setSelectedPreset('custom')
    setSelectedMasterKey('')
    setDateRange([from, to])
  }, [])

  const fetchTimelineData = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc')
      return
    }
    setLoading(true)
    try {
      const mRes = await queryPlanMaster({
        FactoryCode: factoryCode,
        ReportType: 'statistics',
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
        ReportType: 'statistics',
        reportType: 'statistics',
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
      if (selectedPic && selectedPic !== 'ALL') {
        params.Pic = selectedPic
        params.pic = selectedPic
        params.PicDp = selectedPic
        params.picDp = selectedPic
      }

      const reportRes = await querySummaryStatReport(params)
      const repData = reportRes?.data || reportRes || {}
      setBackendReportData(repData)

      let rowsArray = []
      if (repData.items && Array.isArray(repData.items) && repData.items.length > 0) {
        rowsArray = repData.items
      }
      if (
        repData.data?.items &&
        Array.isArray(repData.data.items) &&
        repData.data.items.length > 0
      ) {
        rowsArray = repData.data.items
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
            parseFloat(
              String(row.BreakdownMinutes ?? row.breakdownMinutes ?? 0).replace(',', '.')
            ) || 0
          const wm =
            parseFloat(
              String(row.WaitingMaterialMinutes ?? row.waitingMaterialMinutes ?? 0).replace(
                ',',
                '.'
              )
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
          row.StatDate ||
          row.prodDate ||
          row.ProdDate ||
          row.StartDate ||
          row.OpDate ||
          dateRange?.[0] ||
          ''
        const prodDate = getCleanDate(regDateRaw) || dateRange?.[0] || ''

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

        const pic = String(
          row.pic ||
            row.Pic ||
            row.PicDp ||
            row.picDp ||
            row.StatStaff ||
            row.statStaff ||
            row.MainWorker ||
            row.mainWorker ||
            row.Supervisor ||
            row.supervisor ||
            row.Planner ||
            row.planner ||
            row.PicName ||
            mInfo?.PicDp ||
            mInfo?.Pic ||
            ''
        ).trim()

        return {
          ...row,
          id: row.id || (row.IdSeq ? String(row.IdSeq) : row.StatTicketNo || String(idx + 1)),
          docNo: row.docNo || row.OperationNo || row.RoutingDocNo || `LSX-${idx + 1}`,
          ticketNo: row.ticketNo || row.StatTicketNo || row.RegCode || '',
          orderNo: row.orderNo || row.OrderNo || 'SO-2026',
          regCode: row.regCode || row.RegCode || mInfo?.RegCode || '',
          pic,
          PicDp: pic,
          Pic: pic,
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
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thống kê sản xuất:', err)
      setRawDataset([])
    } finally {
      setLoading(false)
    }
  }, [factoryCode, dateRange, selectedMasterKey, selectedPic])

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
      if (dateRange?.[0] && dateRange?.[1] && item.date) {
        if (item.date < dateRange[0] || item.date > dateRange[1]) return false
      }
      if (selectedPic && selectedPic !== 'ALL') {
        const itemPic = String(item.pic || item.PicDp || item.Pic || '')
          .trim()
          .toLowerCase()
        const targetPic = String(selectedPic).trim().toLowerCase()
        if (itemPic !== targetPic && !itemPic.includes(targetPic)) return false
      }
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
          String(item.pic || item.PicDp || '')
            .toLowerCase()
            .includes(q) ||
          String(item.regCode || '')
            .toLowerCase()
            .includes(q)
        if (!match) return false
      }
      return true
    })
  }, [rawDataset, selectedPic, selectedTeam, selectedMachine, detailSearchText, dateRange])

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
        })),
        pics: (bFo.pics || []).sort()
      }
    }
    const teams = new Set()
    const machineMap = new Map()
    const pics = new Set()
    rawDataset.forEach((item) => {
      if (item.team) teams.add(item.team)
      const code = item.machineCode
      const name = item.machineName || ''
      if (code) {
        if (!machineMap.has(code) || (!machineMap.get(code) && name)) {
          machineMap.set(code, name || code)
        }
      }
      const p = item.pic || item.PicDp || item.Pic
      if (p) pics.add(p)
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
        }),
      pics: Array.from(pics).sort()
    }
  }, [rawDataset, backendReportData])

  const masterOptions = useMemo(() => {
    const defaultLabel = `Tất cả đợt TKSX (${masterList.length})`
    return [
      { value: '', label: defaultLabel },
      ...masterList.map((m) => {
        const code = m.RegCode || m.regCode || String(m.IdSeq || m.MasterSeq || '')
        const date = m.ApplyDate || m.CreatedAt?.slice(0, 10) || ''
        const dateFormatted = date ? formatVNDateFull(date) : ''
        return { value: code, label: `${code} ${dateFormatted ? `(${dateFormatted})` : ''}` }
      })
    ]
  }, [masterList])

  // Statistics KPI Metrics
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
  }, [filteredData, backendReportData])

  const totalDays = useMemo(() => {
    return calculateTotalDays(dateRange, filteredData)
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
          shortDate: formatVNDateShort(dateKey),
          name: formatVNDateShort(dateKey),
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
          shortDate: formatVNDateShort(dateKey),
          name: formatVNDateShort(dateKey),
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

  // Data Grid configuration
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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleOpenExportModal = useCallback(() => {
    setIsExportModalOpen(true)
  }, [])

  const executeExportExcel = useCallback(
    async (params) => {
      await executeExportSummaryExcel({
        reportType: 'stat',
        factoryCode,
        rawCols,
        displayDetailList,
        displayMachineList,
        teamAggregates,
        dailyAggregates,
        ...params
      })
    },
    [factoryCode, rawCols, displayDetailList, displayMachineList, teamAggregates, dailyAggregates]
  )

  const handleCaptureScreenshot = useCallback(async () => {
    const el = reportRootRef.current
    if (!el) return
    const plantTitle = factoryCode === 'GS5' ? 'GS5_QueVo' : 'GS1_HaNoi'
    const dateStr =
      dateRange?.[0] && dateRange?.[1]
        ? `${dateRange[0]}_${dateRange[1]}`
        : new Date().toISOString().slice(0, 10)
    await captureReportScreenshot({
      targetEl: el,
      fileName: `BaoCao_TongHop_STAT_${plantTitle}_${dateStr}`,
      onStart: () => setIsCapturing(true),
      onEnd: () => setIsCapturing(false),
      onError: (err) => alert('Không thể xuất ảnh: ' + (err?.message || 'Lỗi chụp màn hình'))
    })
  }, [factoryCode, dateRange])

  // Đã sửa: Truyền đúng đối tượng vào captureReportScreenshot
  const handleDownloadSingleChart = useCallback(
    async (chartId, filenamePrefix) => {
      const el = document.getElementById(chartId)
      if (!el) return
      try {
        await captureReportScreenshot({
          targetEl: el,
          fileName: `${filenamePrefix}_${factoryCode}_${dateRange?.[0] || ''}_${dateRange?.[1] || ''}`,
          onError: (err) => console.error('Lỗi tải ảnh biểu đồ:', err)
        })
      } catch (err) {
        console.error('Lỗi tải ảnh biểu đồ:', err)
      }
    },
    [factoryCode, dateRange]
  )

  const currentPlantName = useMemo(() => {
    return factoryCode === 'GS5' ? 'Nhà máy GS Quế Võ 1B' : 'Nhà máy GS Hà Nội'
  }, [factoryCode])

  return {
    factoryCode,
    setFactoryCode,
    reportType: 'stat',
    dateRange,
    setDateRange,
    selectedPreset,
    setSelectedPreset,
    selectedMasterKey,
    setSelectedMasterKey,
    loading,
    rawDataset,
    filteredData,
    masterList,
    selectedTeam,
    setSelectedTeam,
    selectedMachine,
    setSelectedMachine,
    selectedPic,
    setSelectedPic,
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
    backendReportData,
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
    handleExportExcel: handleOpenExportModal,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportSummaryExcel: executeExportExcel,
    handleCaptureScreenshot,
    handleDownloadSingleChart,
    currentPlantName,
    fetchTimelineData,
    showDetailSearch,
    setShowDetailSearch,
    detailGridRef,
    totalDays,
    standardCapacityHours
  }
}

export default useSummaryStatisticsLogic
