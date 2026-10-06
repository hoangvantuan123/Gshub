import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { message } from 'antd'
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  queryPlanMaster,
  querySummaryPlanReport
} from '../../../../registration/services/planRegistrationService'
import { usePlanImportColumns } from '../../../../registration/plan/columns/planImportColumns'
import { captureReportScreenshot } from '../../../../common/screenshotHelper'
import {
  parseCleanNumber,
  normalizeDateString,
  formatVNDateShort,
  formatVNDateFull,
  formatLocalDate,
  getMasterEffectiveDate,
  calculateTotalDays
} from '../../common/utils/summaryReportUtils'
import { executeExportSummaryExcel } from '../../common/utils/summaryExcelExporter'

export function useSummaryPlanLogic() {
  const [factoryCode, setFactoryCode] = useState('GS1')

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
  const [selectedPic, setSelectedPic] = useState('ALL')
  const [detailSearchText, setDetailSearchText] = useState('')

  const [isHandbookModalOpen, setIsHandbookModalOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const reportRootRef = useRef(null)

  const rawCols = usePlanImportColumns()
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
        ReportType: 'plan',
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
        ReportType: 'plan',
        reportType: 'plan',
        FromDate: dateRange[0],
        ToDate: dateRange[1],
        fromDate: dateRange[0],
        toDate: dateRange[1],
        PlanDateFrom: dateRange[0],
        PlanDateTo: dateRange[1],
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

      const planAggRes = await querySummaryPlanReport(params)
      const repData = planAggRes?.data || planAggRes || {}
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

        const pic =
          String(
            row.PicDp ||
              row.picDp ||
              row.pic ||
              row.Pic ||
              row.Planner ||
              row.planner ||
              row.PicName ||
              mInfo?.PicDp ||
              mInfo?.Pic ||
              ''
          ).trim() || 'Admin'

        return {
          ...row,
          id: row.IdSeq || String(idx + 1),
          docNo: row.OperationNo || row.RoutingDocNo || `LSX-${idx + 1}`,
          orderNo: row.RoutingDocNo || row.OrderNo || 'SO-2026',
          planNo: row.OperationNo || `KH-${idx + 1}`,
          regCode: row.RegCode || row.regCode || mInfo?.RegCode || '',
          pic,
          PicDp: pic,
          Pic: pic,
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
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu kế hoạch sản xuất:', err)
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
  }, [rawDataset, selectedPic, selectedTeam, selectedMachine, detailSearchText])

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
    const defaultLabel = `Tất cả đợt KHSX (${masterList.length})`
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

  // PIC Breakdown for Production Plan Report
  const picBreakdown = useMemo(() => {
    if (filteredData.length === 0 && backendReportData?.picBreakdown?.length > 0) {
      return backendReportData.picBreakdown.map((row) => {
        const total = row.totalOrders || 1
        const khopTotal = (row.khopSlCount || 0) + (row.khopJobCount || 0)
        return {
          pic: row.pic || row.picName,
          totalOrders: row.totalOrders || 0,
          sxSaiNgay: row.sxSaiNgayCount || 0,
          truotKh: row.truotKhCount || 0,
          khopSl: row.khopSlCount || 0,
          khopJob: row.khopJobCount || 0,
          totalPlanQty: row.planQty || 0,
          totalActualQty: row.actualQty || 0,
          khopTotal,
          sxSaiNgayRate: Number((((row.sxSaiNgayCount || 0) / total) * 100).toFixed(1)),
          truotKhRate: Number((((row.truotKhCount || 0) / total) * 100).toFixed(1)),
          khopSlRate: Number((((row.khopSlCount || 0) / total) * 100).toFixed(1)),
          khopJobRate: Number((((row.khopJobCount || 0) / total) * 100).toFixed(1)),
          passBenchmarkRate: Number(((khopTotal / total) * 100).toFixed(1)),
          khopRate: Number(((khopTotal / total) * 100).toFixed(1)),
          progressRate:
            row.passRate ||
            (row.planQty > 0 ? Number(((row.actualQty / row.planQty) * 100).toFixed(1)) : 100)
        }
      })
    }
    const map = new Map()

    filteredData.forEach((item) => {
      const p = item.pic || item.PicDp || item.Pic || 'Chưa phân công'
      if (!map.has(p)) {
        map.set(p, {
          pic: p,
          totalOrders: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          khopSl: 0,
          khopJob: 0,
          totalPlanQty: 0,
          totalActualQty: 0
        })
      }
      const rec = map.get(p)
      rec.totalOrders++

      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || item.status || item.StatusDpSx || '').toLowerCase()
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) rec.sxSaiNgay++
      else if (st === 'TRUOT_KH' || text.includes('trượt')) rec.truotKh++
      else if (st === 'KHOP_JOB' || text.includes('khớp job') || text.includes('job')) rec.khopJob++
      else if (st === 'KHOP_SL' || text.includes('khớp số lượng') || text.includes('khớp sl'))
        rec.khopSl++
      else {
        const pQty = Number(item.planQty || 0)
        const aQty = Number(item.actualQty || 0)
        if (pQty > 0 && aQty < pQty * 0.9) rec.truotKh++
        else rec.khopSl++
      }

      rec.totalPlanQty += Number(item.planQty || item.TargetProdQty || 0) || 0
      rec.totalActualQty += Number(item.actualQty || item.StatPassQty || item.ProdQty || 0) || 0
    })

    return Array.from(map.values())
      .map((row) => {
        const total = row.totalOrders || 1
        const khopTotal = row.khopSl + row.khopJob
        return {
          ...row,
          khopTotal,
          sxSaiNgayRate: Number(((row.sxSaiNgay / total) * 100).toFixed(1)),
          truotKhRate: Number(((row.truotKh / total) * 100).toFixed(1)),
          khopSlRate: Number(((row.khopSl / total) * 100).toFixed(1)),
          khopJobRate: Number(((row.khopJob / total) * 100).toFixed(1)),
          passBenchmarkRate: Number(((khopTotal / total) * 100).toFixed(1)),
          khopRate: Number(((khopTotal / total) * 100).toFixed(1)),
          progressRate:
            row.totalPlanQty > 0
              ? Number(((row.totalActualQty / row.totalPlanQty) * 100).toFixed(1))
              : 100
        }
      })
      .sort((a, b) => b.totalOrders - a.totalOrders)
  }, [filteredData, backendReportData])

  // PIC Timeline & Growth Evolution by Date
  const picTimelineBreakdown = useMemo(() => {
    const backendTimeline =
      backendReportData?.picTimelineBreakdown ||
      backendReportData?.PicTimelineBreakdown ||
      backendReportData?.data?.picTimelineBreakdown ||
      backendReportData?.data?.PicTimelineBreakdown

    if (
      backendTimeline &&
      ((Array.isArray(backendTimeline.dailyList) && backendTimeline.dailyList.length > 0) ||
        (Array.isArray(backendTimeline.picList) && backendTimeline.picList.length > 0))
    ) {
      return backendTimeline
    }

    const dateMap = new Map()
    const allPicsSet = new Set()

    filteredData.forEach((item) => {
      const p = item.pic || item.PicDp || item.Pic || 'Chưa phân công'
      allPicsSet.add(p)
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          shortDate: formatVNDateShort(dateKey),
          totalOrders: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          khopSl: 0,
          khopJob: 0,
          picStats: {}
        })
      }

      const rec = dateMap.get(dateKey)
      rec.totalOrders++

      if (!rec.picStats[p]) {
        rec.picStats[p] = { totalOrders: 0, sxSaiNgay: 0, truotKh: 0, khopSl: 0, khopJob: 0 }
      }
      rec.picStats[p].totalOrders++

      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || item.status || item.StatusDpSx || '').toLowerCase()
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) {
        rec.sxSaiNgay++
        rec.picStats[p].sxSaiNgay++
      } else if (st === 'TRUOT_KH' || text.includes('trượt')) {
        rec.truotKh++
        rec.picStats[p].truotKh++
      } else if (st === 'KHOP_JOB' || text.includes('khớp job') || text.includes('job')) {
        rec.khopJob++
        rec.picStats[p].khopJob++
      } else {
        rec.khopSl++
        rec.picStats[p].khopSl++
      }
    })

    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    const picList = Array.from(allPicsSet).sort()

    const dailyList = sortedDates.map((d) => {
      const passOrders = d.khopSl + d.khopJob
      const row = {
        date: d.date,
        shortDate: d.shortDate,
        name: d.shortDate,
        totalOrders: d.totalOrders,
        sxSaiNgay: d.sxSaiNgay,
        truotKh: d.truotKh,
        khopSl: d.khopSl,
        khopJob: d.khopJob,
        passOrders,
        passRate: d.totalOrders > 0 ? Number(((passOrders / d.totalOrders) * 100).toFixed(1)) : 0,
        picStats: d.picStats
      }

      picList.forEach((p) => {
        const stat = d.picStats[p] || {
          totalOrders: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          khopSl: 0,
          khopJob: 0
        }
        const pass = stat.khopSl + stat.khopJob
        row[p] = stat.totalOrders
        row[`${p}_orders`] = stat.totalOrders
        row[`${p}_pass`] = pass
        row[`${p}_khopSl`] = stat.khopSl // Đã sửa: gán đúng khopSl
        row[`${p}_khopJob`] = stat.khopJob // Đã sửa: gán đúng khopJob
        row[`${p}_sxSaiNgay`] = stat.sxSaiNgay
        row[`${p}_truotKh`] = stat.truotKh
        row[`${p}_passRate`] =
          stat.totalOrders > 0 ? Number(((pass / stat.totalOrders) * 100).toFixed(1)) : 0
      })

      return row
    })

    // Nhóm theo Tháng (Monthly Grouping)
    const monthMap = new Map()
    const quarterMap = new Map()

    filteredData.forEach((item) => {
      const p = item.pic || item.PicDp || item.Pic || 'Chưa phân công'
      const dateKey = item.date || item.StatDate || item.prodDate || ''
      const mKey = dateKey.length >= 7 ? dateKey.slice(0, 7) : 'Khác'
      const mNum = parseInt(dateKey.slice(5, 7), 10) || 1
      const qKey = dateKey.length >= 7 ? `${dateKey.slice(0, 4)}-Q${Math.ceil(mNum / 3)}` : 'Khác'

      if (!monthMap.has(mKey)) {
        monthMap.set(mKey, {
          periodKey: mKey,
          name: mKey.length >= 7 ? `T${mKey.slice(5)}/${mKey.slice(2, 4)}` : mKey,
          periodLabel: mKey.length >= 7 ? `Tháng ${mKey.slice(5)}/${mKey.slice(0, 4)}` : mKey,
          totalOrders: 0,
          khopSl: 0,
          khopJob: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          picStats: {}
        })
      }
      const mRec = monthMap.get(mKey)
      mRec.totalOrders++
      if (!mRec.picStats[p])
        mRec.picStats[p] = { totalOrders: 0, khopSl: 0, khopJob: 0, sxSaiNgay: 0, truotKh: 0 }
      mRec.picStats[p].totalOrders++

      if (!quarterMap.has(qKey)) {
        quarterMap.set(qKey, {
          periodKey: qKey,
          name: qKey,
          periodLabel: qKey,
          totalOrders: 0,
          khopSl: 0,
          khopJob: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          picStats: {}
        })
      }
      const qRec = quarterMap.get(qKey)
      qRec.totalOrders++
      if (!qRec.picStats[p])
        qRec.picStats[p] = { totalOrders: 0, khopSl: 0, khopJob: 0, sxSaiNgay: 0, truotKh: 0 }
      qRec.picStats[p].totalOrders++

      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || item.status || item.StatusDpSx || '').toLowerCase()
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) {
        mRec.sxSaiNgay++
        mRec.picStats[p].sxSaiNgay++
        qRec.sxSaiNgay++
        qRec.picStats[p].sxSaiNgay++
      } else if (st === 'TRUOT_KH' || text.includes('trượt')) {
        mRec.truotKh++
        mRec.picStats[p].truotKh++
        qRec.truotKh++
        qRec.picStats[p].truotKh++
      } else if (st === 'KHOP_JOB' || text.includes('khớp job') || text.includes('job')) {
        mRec.khopJob++
        mRec.picStats[p].khopJob++
        qRec.khopJob++
        qRec.picStats[p].khopJob++
      } else {
        mRec.khopSl++
        mRec.picStats[p].khopSl++
        qRec.khopSl++
        qRec.picStats[p].khopSl++
      }
    })

    const monthlyList = Array.from(monthMap.values())
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .map((m) => {
        const passOrders = m.khopSl + m.khopJob
        const row = {
          ...m,
          passOrders,
          passRate: m.totalOrders > 0 ? Number(((passOrders / m.totalOrders) * 100).toFixed(1)) : 0
        }
        picList.forEach((p) => {
          const stat = m.picStats[p] || {
            totalOrders: 0,
            khopSl: 0,
            khopJob: 0,
            sxSaiNgay: 0,
            truotKh: 0
          }
          const pass = (stat.khopSl || 0) + (stat.khopJob || 0)
          row[p] = stat.totalOrders
          row[`${p}_orders`] = stat.totalOrders
          row[`${p}_khopSl`] = stat.khopSl || 0
          row[`${p}_khopJob`] = stat.khopJob || 0
          row[`${p}_sxSaiNgay`] = stat.sxSaiNgay || 0
          row[`${p}_truotKh`] = stat.truotKh || 0
          row[`${p}_pass`] = pass
          row[`${p}_passRate`] =
            stat.totalOrders > 0 ? Number(((pass / stat.totalOrders) * 100).toFixed(1)) : 0
          row[`${p}_khopSlRate`] =
            stat.totalOrders > 0
              ? Number((((stat.khopSl || 0) / stat.totalOrders) * 100).toFixed(1))
              : 0
          row[`${p}_khopJobRate`] =
            stat.totalOrders > 0
              ? Number((((stat.khopJob || 0) / stat.totalOrders) * 100).toFixed(1))
              : 0
        })
        return row
      })

    const quarterlyList = Array.from(quarterMap.values())
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .map((q) => {
        const passOrders = q.khopSl + q.khopJob
        const row = {
          ...q,
          passOrders,
          passRate: q.totalOrders > 0 ? Number(((passOrders / q.totalOrders) * 100).toFixed(1)) : 0
        }
        picList.forEach((p) => {
          const stat = q.picStats[p] || {
            totalOrders: 0,
            khopSl: 0,
            khopJob: 0,
            sxSaiNgay: 0,
            truotKh: 0
          }
          const pass = (stat.khopSl || 0) + (stat.khopJob || 0)
          row[p] = stat.totalOrders
          row[`${p}_orders`] = stat.totalOrders
          row[`${p}_khopSl`] = stat.khopSl || 0
          row[`${p}_khopJob`] = stat.khopJob || 0
          row[`${p}_sxSaiNgay`] = stat.sxSaiNgay || 0
          row[`${p}_truotKh`] = stat.truotKh || 0
          row[`${p}_pass`] = pass
          row[`${p}_passRate`] =
            stat.totalOrders > 0 ? Number(((pass / stat.totalOrders) * 100).toFixed(1)) : 0
          row[`${p}_khopSlRate`] =
            stat.totalOrders > 0
              ? Number((((stat.khopSl || 0) / stat.totalOrders) * 100).toFixed(1))
              : 0
          row[`${p}_khopJobRate`] =
            stat.totalOrders > 0
              ? Number((((stat.khopJob || 0) / stat.totalOrders) * 100).toFixed(1))
              : 0
        })
        return row
      })

    return {
      dailyList,
      monthlyList,
      quarterlyList,
      picList
    }
  }, [filteredData, backendReportData])

  // Plan KPI Metrics
  const planMetrics = useMemo(() => {
    if (filteredData.length === 0 && backendReportData?.summary) {
      const s = backendReportData.summary
      return {
        totalOrders: s.totalOrders || s.totalTickets || 0,
        totalTickets: s.totalTickets || s.totalOrders || 0,
        sxSaiNgayCount: s.sxSaiNgayCount || 0,
        sxSaiNgayRate: s.sxSaiNgayRate || 0,
        truotKhCount: s.truotKhCount || 0,
        truotKhRate: s.truotKhRate || 0,
        khopSlCount: s.khopSlCount || 0,
        khopSlRate: s.khopSlRate || 0,
        khopJobCount: s.khopJobCount || 0,
        khopJobRate: s.khopJobRate || 0,
        totalPlanQty: s.totalPlanQty || 0,
        totalActualQty: s.totalActualQty || 0,
        totalPassQty: s.totalPassQty || 0,
        avgPassRate: s.avgPassRate ?? s.overallProgress ?? 0,
        totalItems: s.totalItems || 0,
        planTeamChartData: (backendReportData.teamBreakdown || []).map((t) => ({
          team: t.teamName,
          planQty: t.planQty,
          actualQty: t.actualQty,
          passRate: t.passRate
        })),
        planStatusDistribution: (backendReportData.dpStatusBreakdown || []).map((d) => ({
          name: d.name,
          value: d.count,
          rate: d.rate
        }))
      }
    }
    let planQty = 0
    let actualQty = 0
    let passQty = 0
    let sxSaiNgayCount = 0
    let truotKhCount = 0
    let khopSlCount = 0
    let khopJobCount = 0

    const uniqueItems = new Set()
    const uniqueOrders = new Set()
    const statusMap = new Map()
    const teamMap = new Map()

    filteredData.forEach((item) => {
      const p = Number(item.planQty || 0)
      const a = Number(item.actualQty || item.ProdQty || 0) || p
      const pass = Number(item.passQty || a)
      planQty += p
      actualQty += a
      passQty += pass

      if (item.itemCode) uniqueItems.add(item.itemCode)
      if (item.docNo || item.orderNo) uniqueOrders.add(item.docNo || item.orderNo)

      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || item.status || item.StatusDpSx || '').toLowerCase()
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) {
        sxSaiNgayCount++
        statusMap.set('SX sai ngày KH', (statusMap.get('SX sai ngày KH') || 0) + 1)
      } else if (st === 'TRUOT_KH' || text.includes('trượt')) {
        truotKhCount++
        statusMap.set('Trượt KH', (statusMap.get('Trượt KH') || 0) + 1)
      } else if (st === 'KHOP_JOB' || text.includes('khớp job') || text.includes('job')) {
        khopJobCount++
        statusMap.set('Khớp job', (statusMap.get('Khớp job') || 0) + 1)
      } else {
        khopSlCount++
        statusMap.set('Khớp số lượng', (statusMap.get('Khớp số lượng') || 0) + 1)
      }

      const team = item.team || 'Tổ SX'
      if (!teamMap.has(team)) {
        teamMap.set(team, { team, planQty: 0, actualQty: 0 })
      }
      const t = teamMap.get(team)
      t.planQty += p
      t.actualQty += a
    })

    const totalOrdersCount = filteredData.length
    const calcRate = (cnt) =>
      totalOrdersCount > 0 ? Number(((cnt / totalOrdersCount) * 100).toFixed(1)) : 0

    const avgPassRate = planQty > 0 ? Number(((actualQty / planQty) * 100).toFixed(1)) : 100

    const planTeamChartData = Array.from(teamMap.values()).map((t) => ({
      ...t,
      passRate: t.planQty > 0 ? Number(((t.actualQty / t.planQty) * 100).toFixed(1)) : 100
    }))

    const planStatusDistribution = Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
      rate: totalOrdersCount > 0 ? Number(((value / totalOrdersCount) * 100).toFixed(1)) : 0
    }))

    return {
      totalOrders: totalOrdersCount,
      totalTickets: totalOrdersCount,
      sxSaiNgayCount,
      sxSaiNgayRate: calcRate(sxSaiNgayCount),
      truotKhCount,
      truotKhRate: calcRate(truotKhCount),
      khopSlCount,
      khopSlRate: calcRate(khopSlCount),
      khopJobCount,
      khopJobRate: calcRate(khopJobCount),
      totalPlanQty: planQty,
      totalActualQty: actualQty,
      totalPassQty: passQty,
      avgPassRate,
      totalItems: uniqueItems.size,
      planTeamChartData,
      planStatusDistribution
    }
  }, [filteredData, backendReportData])

  // Time Status Breakdown
  const timeStatusBreakdown = useMemo(() => {
    if (filteredData.length === 0 && backendReportData?.timeStatusBreakdown?.length > 0) {
      return backendReportData.timeStatusBreakdown
    }
    let cham = 0
    let nhanh = 0
    let dung = 0
    let noData = 0

    filteredData.forEach((item) => {
      const t = String(item.timeStatus || item.timeStatusText || item.TimeStatus || '')
      if (t.includes('Chậm')) cham++
      else if (t.includes('Nhanh')) nhanh++
      else if (t.includes('Đúng')) dung++
      else noData++
    })

    const total = filteredData.length || 1
    return [
      {
        name: 'Chậm hơn ĐM',
        count: cham,
        rate: Number(((cham / total) * 100).toFixed(1)),
        color: '#dc2626'
      },
      {
        name: 'Nhanh hơn ĐM',
        count: nhanh,
        rate: Number(((nhanh / total) * 100).toFixed(1)),
        color: '#0284c7'
      },
      {
        name: 'Đúng ĐM',
        count: dung,
        rate: Number(((dung / total) * 100).toFixed(1)),
        color: '#01411b'
      },
      {
        name: 'Chưa có dữ liệu',
        count: noData,
        rate: Number(((noData / total) * 100).toFixed(1)),
        color: '#64748b'
      }
    ]
  }, [filteredData, backendReportData])

  // Capa Status Breakdown
  const capaStatusBreakdown = useMemo(() => {
    if (filteredData.length === 0 && backendReportData?.capaStatusBreakdown?.length > 0) {
      return backendReportData.capaStatusBreakdown
    }
    let nhanh = 0
    let cham = 0
    let trong = 0

    filteredData.forEach((item) => {
      const c = String(item.capaStatus || item.capaStatusText || item.CapaStatus || '')
      if (c.includes('Nhanh')) nhanh++
      else if (c.includes('Chậm')) cham++
      else trong++
    })

    const total = filteredData.length || 1
    return [
      {
        name: 'Nhanh hơn ĐM',
        count: nhanh,
        rate: Number(((nhanh / total) * 100).toFixed(1)),
        color: '#0284c7'
      },
      {
        name: 'Chậm hơn ĐM',
        count: cham,
        rate: Number(((cham / total) * 100).toFixed(1)),
        color: '#ea580c'
      },
      {
        name: 'Trống / Đúng capa',
        count: trong,
        rate: Number(((trong / total) * 100).toFixed(1)),
        color: '#01411b'
      }
    ]
  }, [filteredData, backendReportData])

  // Time Timeline Breakdown
  const timeTimelineBreakdown = useMemo(() => {
    const backendData =
      backendReportData?.timeTimelineBreakdown ||
      backendReportData?.TimeTimelineBreakdown ||
      backendReportData?.data?.timeTimelineBreakdown ||
      backendReportData?.data?.TimeTimelineBreakdown

    if (
      backendData &&
      ((Array.isArray(backendData.dailyList) && backendData.dailyList.length > 0) ||
        (Array.isArray(backendData.monthlyList) && backendData.monthlyList.length > 0))
    ) {
      return backendData
    }

    const dateMap = new Map()
    filteredData.forEach((item) => {
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          shortDate: formatVNDateShort(dateKey),
          name: formatVNDateShort(dateKey),
          totalOrders: 0,
          timeCham: 0,
          timeNhanh: 0,
          timeDung: 0,
          timeNoData: 0
        })
      }
      const rec = dateMap.get(dateKey)
      rec.totalOrders++
      const t = String(item.timeStatus || item.timeStatusText || item.TimeStatus || '')
      if (t.includes('Chậm')) rec.timeCham++
      else if (t.includes('Nhanh')) rec.timeNhanh++
      else if (t.includes('Đúng')) rec.timeDung++
      else rec.timeNoData++
    })

    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    const dailyList = sortedDates.map((d) => {
      const tot = d.totalOrders || 1
      return {
        ...d,
        timeChamRate: Number(((d.timeCham / tot) * 100).toFixed(1)),
        timeNhanhRate: Number(((d.timeNhanh / tot) * 100).toFixed(1)),
        timeDungRate: Number(((d.timeDung / tot) * 100).toFixed(1)),
        timeNoDataRate: Number(((d.timeNoData / tot) * 100).toFixed(1))
      }
    })

    return {
      dailyList,
      monthlyList: [],
      quarterlyList: [],
      categories: [
        { key: 'timeCham', name: 'Chậm hơn ĐM', color: '#dc2626' },
        { key: 'timeNhanh', name: 'Nhanh hơn ĐM', color: '#0284c7' },
        { key: 'timeDung', name: 'Đúng ĐM', color: '#01411b' },
        { key: 'timeNoData', name: 'Chưa có dữ liệu', color: '#64748b' }
      ]
    }
  }, [filteredData, backendReportData])

  // Capa Timeline Breakdown
  const capaTimelineBreakdown = useMemo(() => {
    const backendData =
      backendReportData?.capaTimelineBreakdown ||
      backendReportData?.CapaTimelineBreakdown ||
      backendReportData?.data?.capaTimelineBreakdown ||
      backendReportData?.data?.CapaTimelineBreakdown

    if (
      backendData &&
      ((Array.isArray(backendData.dailyList) && backendData.dailyList.length > 0) ||
        (Array.isArray(backendData.monthlyList) && backendData.monthlyList.length > 0))
    ) {
      return backendData
    }

    const dateMap = new Map()
    filteredData.forEach((item) => {
      const dateKey = item.date || item.StatDate || item.prodDate || 'Khác'
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          shortDate: formatVNDateShort(dateKey),
          name: formatVNDateShort(dateKey),
          totalOrders: 0,
          capaNhanh: 0,
          capaCham: 0,
          capaDung: 0
        })
      }
      const rec = dateMap.get(dateKey)
      rec.totalOrders++
      const c = String(item.capaStatus || item.capaStatusText || item.CapaStatus || '')
      if (c.includes('Nhanh')) rec.capaNhanh++
      else if (c.includes('Chậm')) rec.capaCham++
      else rec.capaDung++
    })

    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    const dailyList = sortedDates.map((d) => {
      const tot = d.totalOrders || 1
      return {
        ...d,
        capaNhanhRate: Number(((d.capaNhanh / tot) * 100).toFixed(1)),
        capaChamRate: Number(((d.capaCham / tot) * 100).toFixed(1)),
        capaDungRate: Number(((d.capaDung / tot) * 100).toFixed(1))
      }
    })

    return {
      dailyList,
      monthlyList: [],
      quarterlyList: [],
      categories: [
        { key: 'capaNhanh', name: 'Nhanh hơn ĐM', color: '#01411b' },
        { key: 'capaCham', name: 'Chậm hơn ĐM', color: '#dc2626' },
        { key: 'capaDung', name: 'Trống / Đúng capa', color: '#64748b' }
      ]
    }
  }, [filteredData, backendReportData])

  // Daily Trend Data from API /api/v2/report/production/summary/plan
  const dailyTrendData = useMemo(() => {
    const raw = backendReportData?.dailyTrendData || backendReportData?.data?.dailyTrendData
    if (Array.isArray(raw) && raw.length > 0) {
      return raw
    }
    if (filteredData && filteredData.length > 0) {
      const dMap = new Map()
      const dItemsMap = new Map()
      filteredData.forEach((item) => {
        const d = item.date || item.StatDate || item.prodDate || 'Khác'
        if (!dMap.has(d)) {
          dMap.set(d, {
            date: d,
            totalOrders: 0,
            orderCount: 0,
            totalItems: 0,
            planQty: 0,
            actualQty: 0,
            sxSaiNgayCount: 0,
            truotKhCount: 0,
            khopSlCount: 0,
            khopJobCount: 0
          })
          dItemsMap.set(d, new Set())
        }
        const rec = dMap.get(d)
        rec.totalOrders++
        rec.orderCount++
        rec.planQty += Number(item.planQty || 0)
        rec.actualQty += Number(item.actualQty || item.ProdQty || 0)
        if (item.itemCode) dItemsMap.get(d).add(item.itemCode)

        const st = item.dpStatusCode || item.dpStatus
        const text = String(item.dpStatusText || item.status || item.StatusDpSx || '').toLowerCase()
        if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) {
          rec.sxSaiNgayCount++
        } else if (st === 'TRUOT_KH' || text.includes('trượt')) {
          rec.truotKhCount++
        } else if (st === 'KHOP_JOB' || text.includes('khớp job') || text.includes('job')) {
          rec.khopJobCount++
        } else {
          rec.khopSlCount++
        }
      })
      return Array.from(dMap.values())
        .map((d) => {
          const itemsSet = dItemsMap.get(d.date)
          d.totalItems = itemsSet ? itemsSet.size : 0
          const total = d.totalOrders || 1
          d.sxSaiNgayRate = Number(((d.sxSaiNgayCount / total) * 100).toFixed(1))
          d.truotKhRate = Number(((d.truotKhCount / total) * 100).toFixed(1))
          d.khopSlRate = Number(((d.khopSlCount / total) * 100).toFixed(1))
          d.khopJobRate = Number(((d.khopJobCount / total) * 100).toFixed(1))
          d.passRate = d.planQty > 0 ? Number(((d.actualQty / d.planQty) * 100).toFixed(1)) : 100
          return d
        })
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    }
    return []
  }, [backendReportData, filteredData])

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
        reportType: 'plan',
        factoryCode,
        rawCols,
        displayDetailList,
        picBreakdown,
        dailyAggregates: dailyTrendData,
        ...params
      })
    },
    [factoryCode, rawCols, displayDetailList, picBreakdown, dailyTrendData]
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
      fileName: `BaoCao_TongHop_PLAN_${plantTitle}_${dateStr}`,
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

  const totalDays = useMemo(() => {
    return calculateTotalDays(dateRange, filteredData)
  }, [dateRange, filteredData])

  const currentPlantName = useMemo(() => {
    return factoryCode === 'GS5' ? 'Nhà máy GS Quế Võ 1B' : 'Nhà máy GS Hà Nội'
  }, [factoryCode])

  return {
    factoryCode,
    setFactoryCode,
    reportType: 'plan',
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
    picBreakdown,
    picTimelineBreakdown,
    detailSearchText,
    setDetailSearchText,
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
    planMetrics,
    timeStatusBreakdown,
    capaStatusBreakdown,
    timeTimelineBreakdown,
    capaTimelineBreakdown,
    backendReportData,
    dailyTrendData,
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
    totalDays
  }
}

export default useSummaryPlanLogic
