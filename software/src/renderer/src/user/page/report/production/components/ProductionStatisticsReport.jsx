/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Button,
  Input,
  Select,
  DatePicker,
  Switch,
  Modal,
  Upload,
  message,
  Popover,
  Alert
} from 'antd'
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  Clock,
  Upload as UploadIcon,
  Eye,
  SlidersHorizontal,
  FileText,
  Boxes,
  Info,
  Cpu,
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp,
  Users,
  Activity,
  Trophy,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { exportToExcel } from '../../common/reportUtils'

const { RangePicker } = DatePicker

// Goldsun Packaging Executive BI Grid Theme (Vibrant Goldsun Green)
const goldsunGridTheme = {
  accentColor: '#006837',
  accentFg: '#ffffff',
  accentLight: '#ecfdf5',
  textDark: '#022c22',
  textMedium: '#065f46',
  textLight: '#64748b',
  textHeader: '#00572e',
  bgCell: '#ffffff',
  bgCellMedium: '#f8fafc',
  bgHeader: '#f0fdf4',
  bgHeaderHasFocus: '#dcfce7',
  bgHeaderHovered: '#e6fced',
  borderColor: '#e2e8f0',
  headerBottomBorderColor: '#86efac',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '12px',
  headerFontStyle: '600 12px',
  baseFontStyle: '400 12px',
  editorFontSize: '12px',
  lineHeight: 1.4
}

// Runtime Anomaly & Production Manager Inspection Classifier
export const getRuntimeInspection = (item) => {
  const hours = item.runtimeHours || 0
  const qty = item.actualQty || item.planQty || 0

  // 1. Thao tác siêu ngắn (< 5 phút = 5/60 giờ = 0.083h) -> Cảnh báo nhập sai / chốt vội
  if (hours < 5 / 60) {
    return {
      type: 'SHORT',
      code: 'SHORT',
      statusText: 'Cần chấn chỉnh (< 5p)',
      shortStatus: '< 5p Cảnh báo',
      category: 'ANOMALY',
      description: 'Thời gian thao tác quá ngắn (< 5 phút), nghi vấn chốt vội hoặc nhập sai thông số.',
      actionNote: 'Quản lý sản xuất cần chấn chỉnh người nhập phiếu và rà soát lại thông số.',
      badgeClass: 'text-amber-800 bg-amber-50 border-amber-300',
      color: '#f59e0b',
      isAnomaly: true
    }
  }

  // 2. Thao tác kéo dài (> 12 tiếng)
  if (hours > 12) {
    // Nếu đơn hàng lớn (SL >= 8000 SP) -> Kéo dài hợp lý
    if (qty >= 8000) {
      return {
        type: 'LONG_VALID',
        code: 'LONG_VALID',
        statusText: 'Hợp lý (> 12h - Đơn lớn)',
        shortStatus: '> 12h Đơn lớn',
        category: 'VALID_LONG',
        description: `Đơn hàng lớn (${qty.toLocaleString('vi-VN')} SP), thời gian chạy kéo dài qua các ca hợp lệ.`,
        actionNote: 'Đã đối chiếu sản lượng kế hoạch - Ghi nhận sản xuất bình thường.',
        badgeClass: 'text-[#00572e] bg-emerald-50 border-emerald-300',
        color: '#00572e',
        isAnomaly: false
      }
    }
    // Nếu đơn hàng nhỏ mà chạy > 12h -> Cảnh báo quên kết thúc phiếu / nhập sai
    return {
      type: 'LONG_CHECK',
      code: 'LONG_CHECK',
      statusText: 'Nghi vấn quên đóng phiếu (> 12h)',
      shortStatus: '> 12h Quên đóng',
      category: 'ANOMALY',
      description: `Sản lượng nhỏ (${qty.toLocaleString('vi-VN')} SP) nhưng thời gian chạy ghi nhận > 12h.`,
      actionNote: 'Quản lý sản xuất cần rà soát giờ giao ca, đối chiếu xem có quên kết thúc phiếu.',
      badgeClass: 'text-rose-800 bg-rose-50 border-rose-300',
      color: '#e11d48',
      isAnomaly: true
    }
  }

  // 3. Bình thường (5 phút - 12 tiếng)
  return {
    type: 'NORMAL',
    code: 'NORMAL',
    statusText: 'Bình thường (5p - 12h)',
    shortStatus: '5p - 12h Chuẩn',
    category: 'NORMAL',
    description: 'Thời gian chạy máy và thao tác nằm trong ngưỡng chuẩn quy trình.',
    actionNote: 'Đạt chuẩn quy trình sản xuất.',
    badgeClass: 'text-teal-800 bg-teal-50 border-teal-300',
    color: '#0d9488',
    isAnomaly: false
  }
}

export default function ProductionStatisticsReport({
  plantKey = 'hanoi_gs1',
  plantName = 'GS1 Hà Nội - Bao bì Cao cấp',
  initialData = [],
  activeMainTab = 'stat',
  onMainTabChange
}) {
  // Raw dataset state
  const [dataset, setDataset] = useState(initialData)

  // Filters state
  const [dateRange, setDateRange] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [selectedRuntimeAnomaly, setSelectedRuntimeAnomaly] = useState('ALL') // 'ALL' | 'NORMAL' | 'SHORT' | 'LONG_VALID' | 'LONG_CHECK' | 'ANOMALY_ALL'
  const [selectedAutoExportOnly, setSelectedAutoExportOnly] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchText, setSearchText] = useState('')

  // View toggles & Chart controls
  const [hideManualAreas, setHideManualAreas] = useState(false)
  const [chartViewMode, setChartViewMode] = useState('ALL') // 'ALL' | 'SOURCE' | 'RUNTIME' | 'MACHINE' | 'TEAM'
  const [machineSubView, setMachineSubView] = useState('TIERS') // 'TIERS' | 'TOP_ALERT'
  const [leaderboardTab, setLeaderboardTab] = useState('ALL') // 'ALL' | 'VOLUME' | 'ALERT'
  const [selectedYieldTier, setSelectedYieldTier] = useState('ALL') // 'ALL' | 'tier1' | 'tier2' | 'tier3' | 'tier4'
  const [isChartsExpanded, setIsChartsExpanded] = useState(true)

  // Modals state
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [legendModalVisible, setLegendModalVisible] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [fileMetadata, setFileMetadata] = useState({
    fileName: `DuLieu_ThongKe_${plantKey === 'hanoi_gs1' ? 'HN_GS1' : 'QV_GS5'}_Goldsun.xlsx`,
    uploadTime: '2026-09-29 09:30:00 (Múi giờ ICT UTC+7)',
    totalRows: initialData.length,
    validRows: initialData.length,
    errorRows: 0,
    sourceSystem: 'Goldsun MES-Bravo Sync Hub v4.2'
  })

  // Grid Refs
  const machineGridRef = useRef(null)
  const teamGridRef = useRef(null)
  const detailGridRef = useRef(null)

  // Available unique teams for filter dropdown
  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(dataset.map((d) => d.team).filter(Boolean)))
  }, [dataset])

  // Filtered dataset
  const filteredData = useMemo(() => {
    return dataset.filter((item) => {
      // Search keyword
      const matchSearch =
        !searchText ||
        (item.ticketNo && item.ticketNo.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.docNo && item.docNo.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.itemName && item.itemName.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.machineName && item.machineName.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.supervisor && item.supervisor.toLowerCase().includes(searchText.toLowerCase()))

      // Team filter
      const matchTeam = selectedTeam === 'ALL' || item.team === selectedTeam

      // Machine filter
      const matchMachine = selectedMachine === 'ALL' || item.machineCode === selectedMachine

      // Source filter (MES / Bravo)
      const matchSource = selectedSource === 'ALL' || item.createdSource === selectedSource

      // Runtime Anomaly filter (Thao tác < 5p hoặc > 12h)
      let matchRuntime = true
      if (selectedRuntimeAnomaly !== 'ALL') {
        const insp = getRuntimeInspection(item)
        if (selectedRuntimeAnomaly === 'NORMAL') matchRuntime = insp.type === 'NORMAL'
        else if (selectedRuntimeAnomaly === 'SHORT') matchRuntime = insp.type === 'SHORT'
        else if (selectedRuntimeAnomaly === 'LONG_VALID') matchRuntime = insp.type === 'LONG_VALID'
        else if (selectedRuntimeAnomaly === 'LONG_CHECK') matchRuntime = insp.type === 'LONG_CHECK'
        else if (selectedRuntimeAnomaly === 'ANOMALY_ALL')
          matchRuntime = insp.type === 'SHORT' || insp.type === 'LONG_CHECK'
      }

      // Auto export note filter
      const matchAutoExport = !selectedAutoExportOnly || item.autoExportNote === true

      // Status filter
      const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus

      // Date range filter
      let matchDate = true
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = item.prodDate
        const startStr = dateRange[0].format('YYYY-MM-DD')
        const endStr = dateRange[1].format('YYYY-MM-DD')
        matchDate = itemDate >= startStr && itemDate <= endStr
      }

      // Hide manual areas
      const matchManual = !hideManualAreas || !item.isManual

      // Yield Tier filter (Performance Stratification)
      let matchYieldTier = true
      if (selectedYieldTier !== 'ALL') {
        const rate = item.actualQty > 0 ? (item.passQty / item.actualQty) * 100 : 100
        if (selectedYieldTier === 'tier1') matchYieldTier = rate >= 99
        else if (selectedYieldTier === 'tier2') matchYieldTier = rate >= 98 && rate < 99
        else if (selectedYieldTier === 'tier3') matchYieldTier = rate >= 95 && rate < 98
        else if (selectedYieldTier === 'tier4') matchYieldTier = rate < 95
      }

      return (
        matchSearch &&
        matchTeam &&
        matchMachine &&
        matchSource &&
        matchRuntime &&
        matchAutoExport &&
        matchStatus &&
        matchDate &&
        matchManual &&
        matchYieldTier
      )
    })
  }, [
    dataset,
    searchText,
    selectedTeam,
    selectedMachine,
    selectedSource,
    selectedRuntimeAnomaly,
    selectedAutoExportOnly,
    selectedStatus,
    selectedYieldTier,
    dateRange,
    hideManualAreas
  ])

  // Summary Metrics (5 KPIs according to Executive Production Management)
  const kpiMetrics = useMemo(() => {
    const totalCount = filteredData.length
    if (totalCount === 0) {
      return {
        totalTickets: 0,
        totalPlanQty: 0,
        totalActualQty: 0,
        totalPassQty: 0,
        totalDefectQty: 0,
        totalRuntimeHours: 0,
        overallPassRate: '0.00',
        runtimeShort: 0,
        runtimeShortRate: '0.0',
        runtimeLongValid: 0,
        runtimeLongValidRate: '0.0',
        runtimeLongCheck: 0,
        runtimeLongCheckRate: '0.0',
        runtimeNormal: 0,
        runtimeNormalRate: '0.0',
        totalAnomalies: 0,
        anomalyRate: '0.0',
        mesCreatedCount: 0,
        mesRate: '0.0',
        bravoCreatedCount: 0,
        bravoRate: '0.0',
        autoExportCount: 0,
        autoExportRate: '0.0'
      }
    }

    // Quantities & Hours totals
    const totalPlanQty = filteredData.reduce((acc, curr) => acc + (curr.planQty || 0), 0)
    const totalActualQty = filteredData.reduce((acc, curr) => acc + (curr.actualQty || 0), 0)
    const totalPassQty = filteredData.reduce((acc, curr) => acc + (curr.passQty || 0), 0)
    const totalDefectQty = filteredData.reduce((acc, curr) => acc + (curr.defectQty || 0), 0)
    const totalRuntimeHours = parseFloat(
      filteredData.reduce((acc, curr) => acc + (curr.runtimeHours || 0), 0).toFixed(1)
    )
    const overallPassRate =
      totalActualQty > 0 ? ((totalPassQty / totalActualQty) * 100).toFixed(2) : '100.00'

    // Runtime Anomaly Inspections
    const shortList = filteredData.filter((d) => (d.runtimeHours || 0) < 5 / 60)
    const longValidList = filteredData.filter(
      (d) => (d.runtimeHours || 0) > 12 && (d.actualQty || d.planQty || 0) >= 8000
    )
    const longCheckList = filteredData.filter(
      (d) => (d.runtimeHours || 0) > 12 && (d.actualQty || d.planQty || 0) < 8000
    )
    const normalList = filteredData.filter(
      (d) => (d.runtimeHours || 0) >= 5 / 60 && (d.runtimeHours || 0) <= 12
    )

    const runtimeShort = shortList.length
    const runtimeShortRate = ((shortList.length / totalCount) * 100).toFixed(1)

    const runtimeLongValid = longValidList.length
    const runtimeLongValidRate = ((longValidList.length / totalCount) * 100).toFixed(1)

    const runtimeLongCheck = longCheckList.length
    const runtimeLongCheckRate = ((longCheckList.length / totalCount) * 100).toFixed(1)

    const runtimeNormal = normalList.length
    const runtimeNormalRate = ((normalList.length / totalCount) * 100).toFixed(1)

    const totalAnomalies = runtimeShort + runtimeLongCheck
    const anomalyRate = ((totalAnomalies / totalCount) * 100).toFixed(1)

    // MES vs Bravo
    const mesCreatedCount = filteredData.filter((d) => d.createdSource === 'MES').length
    const mesRate = ((mesCreatedCount / totalCount) * 100).toFixed(1)
    const bravoCreatedCount = totalCount - mesCreatedCount
    const bravoRate = (100 - parseFloat(mesRate)).toFixed(1)

    // Auto export note
    const autoExportCount = filteredData.filter((d) => d.autoExportNote).length
    const autoExportRate = ((autoExportCount / totalCount) * 100).toFixed(1)

    return {
      totalTickets: totalCount,
      totalPlanQty,
      totalActualQty,
      totalPassQty,
      totalDefectQty,
      totalRuntimeHours,
      overallPassRate,
      runtimeShort,
      runtimeShortRate,
      runtimeLongValid,
      runtimeLongValidRate,
      runtimeLongCheck,
      runtimeLongCheckRate,
      runtimeNormal,
      runtimeNormalRate,
      totalAnomalies,
      anomalyRate,
      mesCreatedCount,
      mesRate,
      bravoCreatedCount,
      bravoRate,
      autoExportCount,
      autoExportRate
    }
  }, [filteredData])

  // Machine Aggregations
  const machineAggregates = useMemo(() => {
    const groups = {}
    filteredData.forEach((item) => {
      const code = item.machineCode || 'OTHER'
      if (!groups[code]) {
        groups[code] = {
          machineCode: code,
          machineName: item.machineName || code,
          isManual: item.isManual || false,
          unit: item.unit || 'Đơn vị',
          ticketCount: 0,
          runtimeHours: 0,
          actualQty: 0,
          passQty: 0,
          defectQty: 0
        }
      }
      groups[code].ticketCount += 1
      groups[code].runtimeHours += item.runtimeHours || 0
      groups[code].actualQty += item.actualQty || 0
      groups[code].passQty += item.passQty || 0
      groups[code].defectQty += item.defectQty || 0
    })

    return Object.values(groups).map((g) => {
      const hours = parseFloat(g.runtimeHours.toFixed(1))
      const ratio24h = ((hours / 24) * 100).toFixed(1)
      const passRate = g.actualQty > 0 ? ((g.passQty / g.actualQty) * 100).toFixed(2) : '100.00'
      const passPerHour = hours > 0 ? Math.round(g.passQty / hours) : g.passQty
      return {
        ...g,
        runtimeHours: hours,
        ratio24h,
        passRate,
        passPerHour
      }
    })
  }, [filteredData])

  // Team Aggregations (Classified by Runtime Discipline & QLSX Inspections)
  const teamAggregates = useMemo(() => {
    const groups = {}
    filteredData.forEach((item) => {
      const team = item.team || 'Chưa phân tổ'
      if (!groups[team]) {
        groups[team] = {
          team,
          teamCode: item.teamCode,
          ticketCount: 0,
          runtimeHours: 0,
          shortCount: 0,
          longValidCount: 0,
          longCheckCount: 0,
          nonMesCount: 0,
          autoExportCount: 0
        }
      }
      const insp = getRuntimeInspection(item)
      groups[team].ticketCount += 1
      groups[team].runtimeHours += item.runtimeHours || 0
      if (insp.type === 'SHORT') groups[team].shortCount += 1
      if (insp.type === 'LONG_VALID') groups[team].longValidCount += 1
      if (insp.type === 'LONG_CHECK') groups[team].longCheckCount += 1
      if (item.createdSource !== 'MES') groups[team].nonMesCount += 1
      if (item.autoExportNote) groups[team].autoExportCount += 1
    })

    return Object.values(groups).map((g) => {
      const totalHours = parseFloat(g.runtimeHours.toFixed(1))
      const anomalyCount = g.shortCount + g.longCheckCount
      const anomalyRate =
        g.ticketCount > 0 ? ((anomalyCount / g.ticketCount) * 100).toFixed(1) : '0.0'
      return {
        ...g,
        runtimeHours: totalHours,
        anomalyCount,
        anomalyRate
      }
    })
  }, [filteredData])

  // Scalable 4 Performance Tiers for Machine Fleet Analytics (Handles 10 to 1000+ machines)
  const machinePerformanceTiers = useMemo(() => {
    const total = machineAggregates.length || 1
    const totalActual = machineAggregates.reduce((acc, m) => acc + m.actualQty, 0) || 1

    const tierExcellent = machineAggregates.filter((m) => parseFloat(m.passRate) >= 99)
    const tierGood = machineAggregates.filter(
      (m) => parseFloat(m.passRate) >= 98 && parseFloat(m.passRate) < 99
    )
    const tierModerate = machineAggregates.filter(
      (m) => parseFloat(m.passRate) >= 95 && parseFloat(m.passRate) < 98
    )
    const tierWarning = machineAggregates.filter((m) => parseFloat(m.passRate) < 95)

    const calcTier = (list, label, colorKey, tag) => {
      const count = list.length
      const machinePercent = ((count / total) * 100).toFixed(1)
      const qty = list.reduce((acc, m) => acc + m.actualQty, 0)
      const qtyPercent = ((qty / totalActual) * 100).toFixed(1)
      const passQty = list.reduce((acc, m) => acc + m.passQty, 0)
      const avgRate = qty > 0 ? ((passQty / qty) * 100).toFixed(1) : '0.0'
      const runtime = list.reduce((acc, m) => acc + m.runtimeHours, 0)
      return {
        label,
        tag,
        colorKey,
        count,
        machinePercent,
        qty,
        qtyPercent,
        avgRate,
        runtime,
        machines: list
      }
    }

    return {
      tier1: calcTier(tierExcellent, 'Tầng Xuất Sắc (≥99%)', 'emerald', 'tier1'),
      tier2: calcTier(tierGood, 'Tầng Đạt Chuẩn (98-99%)', 'teal', 'tier2'),
      tier3: calcTier(tierModerate, 'Tầng Cần Theo Dõi (95-98%)', 'amber', 'tier3'),
      tier4: calcTier(tierWarning, 'Tầng Cảnh Báo (<95%)', 'rose', 'tier4')
    }
  }, [machineAggregates])

  // Top 5 Highest Volume vs Bottom 5 Lowest Yield (Focus Leaderboard)
  const machineLeaderboards = useMemo(() => {
    const sortedByQty = [...machineAggregates].sort((a, b) => b.actualQty - a.actualQty)
    const top5Volume = sortedByQty.slice(0, 5)

    const sortedByYield = [...machineAggregates]
      .filter((m) => m.actualQty > 0)
      .sort((a, b) => parseFloat(a.passRate) - parseFloat(b.passRate))
    const bottom5Yield = sortedByYield.slice(0, 5)

    return { top5Volume, bottom5Yield }
  }, [machineAggregates])

  // Comprehensive BI Machine Performance & Stratification Analytics
  const machineAnalyticsSummary = useMemo(() => {
    const totalMachines = machineAggregates.length
    const totalActual = machineAggregates.reduce((acc, m) => acc + m.actualQty, 0)
    const totalPass = machineAggregates.reduce((acc, m) => acc + m.passQty, 0)
    const overallPassRate =
      totalActual > 0 ? ((totalPass / totalActual) * 100).toFixed(1) : '100.0'
    const highYieldMachines = machineAggregates.filter((m) => parseFloat(m.passRate) >= 98).length
    const subOptimalMachines = totalMachines - highYieldMachines
    const totalRuntimeHours = machineAggregates.reduce((acc, m) => acc + m.runtimeHours, 0)
    const avgPassPerHour =
      totalRuntimeHours > 0 ? Math.round(totalPass / totalRuntimeHours) : 0
    const totalTickets = machineAggregates.reduce((acc, m) => acc + m.ticketCount, 0)

    return {
      totalMachines,
      totalActual,
      totalPass,
      overallPassRate,
      highYieldMachines,
      subOptimalMachines,
      totalRuntimeHours,
      avgPassPerHour,
      totalTickets
    }
  }, [machineAggregates])

  // BI Chart Aggregations: Teams sorted by Ticket Volume
  const teamChartData = useMemo(() => {
    return [...teamAggregates].sort((a, b) => b.ticketCount - a.ticketCount)
  }, [teamAggregates])

  // Comprehensive BI Team Operational Discipline & QLSX Review Summary
  const teamAnalyticsSummary = useMemo(() => {
    const totalTeams = teamAggregates.length
    const totalTickets = teamAggregates.reduce((acc, t) => acc + t.ticketCount, 0)
    const totalShort = teamAggregates.reduce((acc, t) => acc + t.shortCount, 0)
    const totalLongCheck = teamAggregates.reduce((acc, t) => acc + t.longCheckCount, 0)
    const totalLongValid = teamAggregates.reduce((acc, t) => acc + t.longValidCount, 0)
    const totalNonMes = teamAggregates.reduce((acc, t) => acc + t.nonMesCount, 0)
    const totalAutoExport = teamAggregates.reduce((acc, t) => acc + t.autoExportCount, 0)

    // Best disciplined team (0 or lowest anomaly count)
    const sortedByDiscipline = [...teamAggregates].sort((a, b) => a.anomalyCount - b.anomalyCount)
    const bestDisciplineTeam = sortedByDiscipline[0] || {
      team: 'Chưa có',
      shortCount: 0,
      longCheckCount: 0
    }

    const sortedByTickets = [...teamAggregates].sort((a, b) => b.ticketCount - a.ticketCount)
    const topVolumeTeam = sortedByTickets[0] || { team: 'Chưa có', ticketCount: 0 }

    return {
      totalTeams,
      totalTickets,
      totalShort,
      totalLongCheck,
      totalLongValid,
      totalNonMes,
      totalAutoExport,
      bestDisciplineTeam,
      topVolumeTeam
    }
  }, [teamAggregates])

  // Reset all filters
  const handleResetFilters = () => {
    setDateRange(null)
    setSelectedTeam('ALL')
    setSelectedMachine('ALL')
    setSelectedSource('ALL')
    setSelectedRuntimeAnomaly('ALL')
    setSelectedAutoExportOnly(false)
    setSelectedStatus('ALL')
    setSelectedYieldTier('ALL')
    setSearchText('')
    message.info('Đã hoàn tác toàn bộ bộ lọc')
  }

  // Active filter indicators count
  const hasActiveFilters =
    dateRange !== null ||
    selectedTeam !== 'ALL' ||
    selectedMachine !== 'ALL' ||
    selectedSource !== 'ALL' ||
    selectedRuntimeAnomaly !== 'ALL' ||
    selectedAutoExportOnly ||
    selectedStatus !== 'ALL' ||
    selectedYieldTier !== 'ALL' ||
    searchText !== ''

  // Export to Excel handler
  const handleExportData = () => {
    exportToExcel(filteredData, `BaoCao_ThongKe_SanXuat_${plantKey}`)
    message.success('Đã xuất file Excel dữ liệu thống kê sản xuất')
  }

  // ==========================================
  // GLIDE DATA GRID: MACHINE
  // ==========================================
  const machineGridCols = useMemo(
    () => [
      { title: 'Tên máy sản xuất', width: 270, id: 'machineName' },
      { title: 'Mã máy', width: 110, id: 'machineCode' },
      { title: 'Số phiếu', width: 85, id: 'ticketCount' },
      { title: 'Giờ chạy (h)', width: 105, id: 'runtimeHours' },
      { title: 'Tỷ lệ / 24h', width: 105, id: 'ratio24h' },
      { title: 'SL Sản xuất', width: 130, id: 'actualQty' },
      { title: 'SL Đạt', width: 130, id: 'passQty' },
      { title: 'Tỷ lệ đạt (%)', width: 115, id: 'passRate' },
      { title: 'ĐVT', width: 75, id: 'unit' },
      { title: 'Số đạt / Giờ', width: 135, id: 'passPerHour' }
    ],
    []
  )

  const getMachineCellContent = useCallback(
    ([col, row]) => {
      const item = machineAggregates[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = machineGridCols[col]?.id

      switch (colId) {
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName,
            displayData: `${item.isManual ? '[Thủ công] ' : ''}${item.machineName}`,
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
            displayData: String(item.ticketCount),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${item.runtimeHours}h`,
            displayData: `${item.runtimeHours}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'ratio24h':
          return {
            kind: GridCellKind.Text,
            data: `${item.ratio24h}%`,
            displayData: `${item.ratio24h}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.actualQty,
            displayData: item.actualQty.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.passQty,
            displayData: item.passQty.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'unit':
          return {
            kind: GridCellKind.Text,
            data: item.unit,
            displayData: item.unit,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'passPerHour':
          return {
            kind: GridCellKind.Number,
            data: item.passPerHour,
            displayData: item.passPerHour.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [machineAggregates, machineGridCols]
  )

  // ==========================================
  // GLIDE DATA GRID: TEAM
  // ==========================================
  const teamGridCols = useMemo(
    () => [
      { title: 'Tổ sản xuất', width: 220, id: 'team' },
      { title: 'Số phiếu', width: 85, id: 'ticketCount' },
      { title: 'Tổng giờ chạy (h)', width: 125, id: 'runtimeHours' },
      { title: 'Thao tác < 5p (Cảnh báo)', width: 165, id: 'shortCount' },
      { title: 'Đơn lớn > 12h (Hợp lý)', width: 160, id: 'longValidCount' },
      { title: 'Nghi vấn > 12h (Quên đóng)', width: 180, id: 'longCheckCount' },
      { title: 'Tạo ngoài MES', width: 115, id: 'nonMesCount' },
      { title: 'Ghi chú xuất TĐ', width: 130, id: 'autoExportCount' }
    ],
    []
  )

  const getTeamCellContent = useCallback(
    ([col, row]) => {
      const item = teamAggregates[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = teamGridCols[col]?.id

      switch (colId) {
        case 'team':
          return {
            kind: GridCellKind.Text,
            data: item.team,
            displayData: item.team,
            allowOverlay: false
          }
        case 'ticketCount':
          return {
            kind: GridCellKind.Number,
            data: item.ticketCount,
            displayData: String(item.ticketCount),
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${item.runtimeHours}h`,
            displayData: `${item.runtimeHours}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'shortCount':
          return {
            kind: GridCellKind.Text,
            data: String(item.shortCount),
            displayData: item.shortCount > 0 ? `${item.shortCount} phiếu [Cảnh báo]` : '0',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'longValidCount':
          return {
            kind: GridCellKind.Text,
            data: String(item.longValidCount),
            displayData: item.longValidCount > 0 ? `${item.longValidCount} phiếu [Đơn lớn]` : '0',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'longCheckCount':
          return {
            kind: GridCellKind.Text,
            data: String(item.longCheckCount),
            displayData:
              item.longCheckCount > 0 ? `${item.longCheckCount} phiếu [Cần kiểm tra]` : '0',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'nonMesCount':
          return {
            kind: GridCellKind.Number,
            data: item.nonMesCount,
            displayData: String(item.nonMesCount),
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'autoExportCount':
          return {
            kind: GridCellKind.Number,
            data: item.autoExportCount,
            displayData: String(item.autoExportCount),
            allowOverlay: false,
            contentAlign: 'center'
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [teamAggregates, teamGridCols]
  )

  // ==========================================
  // GLIDE DATA GRID: DETAILS
  // ==========================================
  const detailGridCols = useMemo(
    () => [
      { title: 'Mã phiếu', width: 160, id: 'ticketNo' },
      { title: 'Mã LSX', width: 145, id: 'docNo' },
      { title: 'Tổ sản xuất', width: 155, id: 'team' },
      { title: 'Máy sản xuất', width: 240, id: 'machineName' },
      { title: 'Mã máy', width: 105, id: 'machineCode' },
      { title: 'Mã hàng', width: 145, id: 'itemCode' },
      { title: 'Tên sản phẩm / Quy cách', width: 260, id: 'itemName' },
      { title: 'ĐVT', width: 70, id: 'unit' },
      { title: 'SL Kế hoạch', width: 115, id: 'planQty' },
      { title: 'SL Sản xuất', width: 115, id: 'actualQty' },
      { title: 'SL Đạt', width: 115, id: 'passQty' },
      { title: 'SL Hỏng', width: 95, id: 'defectQty' },
      { title: 'Tỷ lệ đạt (%)', width: 110, id: 'passRate' },
      { title: 'Giờ chạy máy', width: 115, id: 'runtimeHours' },
      { title: 'Đối chiếu Quản lý sản xuất', width: 220, id: 'qlsxReview' },
      { title: 'Vị trí tạo', width: 95, id: 'createdSource' },
      { title: 'Xuất TĐ', width: 90, id: 'autoExportNote' },
      { title: 'Phụ trách ca', width: 145, id: 'supervisor' },
      { title: 'Ca SX', width: 80, id: 'shift' },
      { title: 'Ngày SX', width: 105, id: 'prodDate' },
      { title: 'Trạng thái', width: 115, id: 'status' }
    ],
    []
  )

  const getDetailCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = detailGridCols[col]?.id

      switch (colId) {
        case 'ticketNo':
          return {
            kind: GridCellKind.Text,
            data: item.ticketNo,
            displayData: item.ticketNo,
            allowOverlay: false
          }
        case 'docNo':
          return {
            kind: GridCellKind.Text,
            data: item.docNo,
            displayData: item.docNo,
            allowOverlay: false
          }
        case 'team':
          return {
            kind: GridCellKind.Text,
            data: item.team,
            displayData: item.team,
            allowOverlay: false
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName,
            displayData: item.machineName,
            allowOverlay: false
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode,
            displayData: item.machineCode,
            allowOverlay: false
          }
        case 'itemCode':
          return {
            kind: GridCellKind.Text,
            data: item.itemCode,
            displayData: item.itemCode,
            allowOverlay: false
          }
        case 'itemName':
          return {
            kind: GridCellKind.Text,
            data: item.itemName,
            displayData: item.itemName,
            allowOverlay: false
          }
        case 'unit':
          return {
            kind: GridCellKind.Text,
            data: item.unit,
            displayData: item.unit,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'planQty':
          return {
            kind: GridCellKind.Number,
            data: item.planQty,
            displayData: item.planQty?.toLocaleString('vi-VN') || '0',
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: item.actualQty,
            displayData: item.actualQty?.toLocaleString('vi-VN') || '0',
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: item.passQty,
            displayData: item.passQty?.toLocaleString('vi-VN') || '0',
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'defectQty':
          return {
            kind: GridCellKind.Number,
            data: item.defectQty,
            displayData: item.defectQty?.toLocaleString('vi-VN') || '0',
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${item.passRate}%`,
            displayData: `${item.passRate}%`,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${item.runtimeHours}h`,
            displayData:
              item.runtimeHours < 5 / 60
                ? `${item.runtimeHours}h (< 5p)`
                : item.runtimeHours > 12
                  ? `${item.runtimeHours}h (> 12h)`
                  : `${item.runtimeHours}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'qlsxReview': {
          const insp = getRuntimeInspection(item)
          return {
            kind: GridCellKind.Text,
            data: insp.statusText,
            displayData: `[${insp.shortStatus}] ${insp.statusText}`,
            allowOverlay: false
          }
        }
        case 'createdSource':
          return {
            kind: GridCellKind.Text,
            data: item.createdSource,
            displayData: item.createdSource,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'autoExportNote':
          return {
            kind: GridCellKind.Text,
            data: item.autoExportNote ? 'Có' : 'Không',
            displayData: item.autoExportNote ? 'Có' : 'Không',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'supervisor':
          return {
            kind: GridCellKind.Text,
            data: item.supervisor,
            displayData: item.supervisor,
            allowOverlay: false
          }
        case 'shift':
          return {
            kind: GridCellKind.Text,
            data: item.shift,
            displayData: item.shift,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'prodDate':
          return {
            kind: GridCellKind.Text,
            data: item.prodDate,
            displayData: item.prodDate,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'status':
          return {
            kind: GridCellKind.Text,
            data: item.status,
            displayData: item.status,
            allowOverlay: false,
            contentAlign: 'center'
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [filteredData, detailGridCols]
  )

  return (
    <div className="w-full min-h-screen bg-[#f0fdf4]/50 p-4 sm:p-5 space-y-4 text-slate-800 antialiased font-sans pb-24">
      {/* 1. Header & Brand Navigation (Goldsun Corporate Green Style) */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#00572e] flex items-center justify-center text-[#fbbf24] font-black text-lg border border-emerald-500/40 shadow-sm shrink-0">
              G
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-[#006837] uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  GOLDSUN PACKAGING
                </span>
                <span className="text-slate-300">|</span>
                <h1 className="text-base font-bold text-[#00572e] tracking-tight m-0">
                  BÁO CÁO THỐNG KÊ SẢN XUẤT
                </h1>
                <span className="text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-semibold text-[#006837] rounded">
                  {plantName}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-emerald-800">
                  Phân hệ: {plantKey.toUpperCase()}
                </span>
                <span>•</span>
                <span>Múi giờ chuẩn: ICT (UTC+07:00)</span>
                <span>•</span>
                <span className="text-slate-600 font-mono">Tệp: {fileMetadata.fileName}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="middle"
              icon={<UploadIcon size={14} />}
              onClick={() => setUploadModalVisible(true)}
              className="text-xs font-semibold rounded-md border-slate-300 hover:border-[#006837] hover:text-[#006837]"
            >
              Nạp tệp .xlsx
            </Button>
            <Button
              size="middle"
              icon={<FileSpreadsheet size={14} className="text-emerald-700" />}
              onClick={handleExportData}
              className="text-xs font-bold text-emerald-800 border-emerald-300 hover:border-emerald-500 bg-emerald-50/70 rounded-md"
            >
              Xuất Excel
            </Button>
            <Button
              size="middle"
              icon={<SlidersHorizontal size={14} />}
              onClick={() => setLegendModalVisible(true)}
              className="text-xs font-semibold rounded-md"
            >
              Chú giải màu
            </Button>
            <Button
              size="middle"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilters}
              className="text-xs font-medium rounded-md"
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMainTabChange && onMainTabChange('stat')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                activeMainTab === 'stat'
                  ? 'bg-[#00572e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-[#00572e]'
              }`}
            >
              <Activity size={14} className={activeMainTab === 'stat' ? 'text-[#fbbf24]' : ''} />
              2.1 Thống kê sản xuất
            </button>
            <button
              onClick={() => onMainTabChange && onMainTabChange('plan')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                activeMainTab === 'plan'
                  ? 'bg-[#00572e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-[#00572e]'
              }`}
            >
              <Boxes size={14} className={activeMainTab === 'plan' ? 'text-[#fbbf24]' : ''} />
              2.2 Điều phối sản xuất
            </button>
          </div>

          <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50/60 px-2.5 py-1 rounded border border-emerald-200">
            {fileMetadata.validRows} bản ghi hợp lệ | {fileMetadata.errorRows} lỗi nạp
          </div>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200/90 p-4">
        <div className="text-xs font-bold text-[#00572e] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Search size={13} className="text-[#006837]" />
          <span>Bộ lọc thông số báo cáo</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Khoảng ngày thống kê
            </label>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
              className="w-full text-xs rounded"
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tổ sản xuất
            </label>
            <Select
              value={selectedTeam}
              onChange={setSelectedTeam}
              className="w-full text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả tổ sản xuất' },
                ...uniqueTeams.map((t) => ({ value: t, label: t }))
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Vị trí tạo phiếu
            </label>
            <Select
              value={selectedSource}
              onChange={setSelectedSource}
              className="w-full text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả nguồn tạo' },
                { value: 'MES', label: 'Hệ thống MES' },
                { value: 'Bravo', label: 'Bravo ERP / Ngoài MES' }
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Thời gian thao tác & Đối chiếu QLSX
            </label>
            <Select
              value={selectedRuntimeAnomaly}
              onChange={setSelectedRuntimeAnomaly}
              className="w-full text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả thời gian thao tác' },
                { value: 'NORMAL', label: '5 phút - 12 tiếng (Chuẩn vận hành)' },
                { value: 'SHORT', label: 'Dưới 5 phút (Cảnh báo nhập sai / chấn chỉnh)' },
                { value: 'LONG_VALID', label: 'Trên 12 tiếng - Đơn lớn (Hợp lý)' },
                { value: 'LONG_CHECK', label: 'Trên 12 tiếng - Đơn nhỏ (Nghi vấn quên đóng)' },
                { value: 'ANOMALY_ALL', label: 'Tất cả bất thường (< 5p hoặc > 12h)' }
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tìm kiếm từ khóa
            </label>
            <Input
              prefix={<Search size={13} className="text-slate-400" />}
              placeholder="Mã phiếu, LSX, mã hàng..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="text-xs rounded"
              allowClear
            />
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Đang lọc:</span>
            {selectedTeam !== 'ALL' && (
              <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-[#00572e] rounded flex items-center gap-1">
                Tổ: {selectedTeam}
                <button
                  onClick={() => setSelectedTeam('ALL')}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {selectedMachine !== 'ALL' && (
              <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-[#00572e] rounded flex items-center gap-1">
                Máy: {selectedMachine}
                <button
                  onClick={() => setSelectedMachine('ALL')}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSource !== 'ALL' && (
              <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-xs text-slate-800 rounded flex items-center gap-1">
                Nguồn: {selectedSource}
                <button
                  onClick={() => setSelectedSource('ALL')}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {selectedRuntimeAnomaly !== 'ALL' && (
              <span className="bg-amber-50 border border-amber-300 px-2 py-0.5 text-xs text-amber-900 rounded flex items-center gap-1">
                Thời gian: {selectedRuntimeAnomaly === 'SHORT' ? '< 5p (Chấn chỉnh)' : selectedRuntimeAnomaly === 'LONG_VALID' ? '> 12h (Đơn lớn hợp lý)' : selectedRuntimeAnomaly === 'LONG_CHECK' ? '> 12h (Nghi vấn quên đóng)' : selectedRuntimeAnomaly === 'NORMAL' ? '5p - 12h (Chuẩn)' : 'Bất thường (< 5p / > 12h)'}
                <button
                  onClick={() => setSelectedRuntimeAnomaly('ALL')}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {selectedAutoExportOnly && (
              <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 text-xs rounded flex items-center gap-1">
                Ghi chú xuất tự động
                <button
                  onClick={() => setSelectedAutoExportOnly(false)}
                  className="text-blue-600 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {dateRange && (
              <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-xs text-slate-800 rounded flex items-center gap-1">
                {dateRange[0]?.format('YYYY-MM-DD')} ~ {dateRange[1]?.format('YYYY-MM-DD')}
                <button
                  onClick={() => setDateRange(null)}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            {searchText && (
              <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-xs text-slate-800 rounded flex items-center gap-1">
                &quot;{searchText}&quot;
                <button
                  onClick={() => setSearchText('')}
                  className="text-slate-500 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-[#006837] underline font-bold ml-1 hover:text-emerald-800"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* 3. Executive KPI Metric Summary (Section 2.1) */}
      <div className="bg-white rounded-lg border border-emerald-100/90 overflow-hidden shadow-xs">
        <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/40 border-b border-emerald-100 px-4 py-2.5 font-bold text-xs text-[#00572e] flex items-center justify-between">
          <span className="uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Tóm tắt chỉ số KPI thống kê sản xuất
          </span>
          <span className="text-[11px] font-semibold text-emerald-800 font-mono">
            Mẫu số sau lọc: {kpiMetrics.totalTickets} phiếu
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {/* KPI 1 */}
          <div className="p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Số phiếu thống kê
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#00572e] font-mono mt-1 tracking-tight">
              {kpiMetrics.totalTickets}{' '}
              <span className="text-xs font-semibold text-slate-500">phiếu</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">100% mẫu sau lọc</div>
          </div>

          {/* KPI 2: Cảnh báo thao tác bất thường (< 5p hoặc > 12h) */}
          <div
            className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() =>
              setSelectedRuntimeAnomaly(
                selectedRuntimeAnomaly === 'ANOMALY_ALL' ? 'ALL' : 'ANOMALY_ALL'
              )
            }
          >
            <span className="text-[11px] font-semibold text-slate-500 block">
              Cảnh báo QLSX (&lt; 5p / &gt; 12h)
            </span>
            <div
              className={`text-3xl sm:text-4xl font-black font-mono mt-1 tracking-tight ${kpiMetrics.totalAnomalies > 0 ? 'text-amber-700' : 'text-[#00572e]'}`}
            >
              {kpiMetrics.totalAnomalies}{' '}
              <span className="text-xs font-semibold text-slate-500">
                ({kpiMetrics.anomalyRate}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              &lt; 5p: <strong className="text-rose-700 font-mono text-xs">{kpiMetrics.runtimeShort}</strong> | &gt; 12h: <strong className="text-amber-700 font-mono text-xs">{kpiMetrics.runtimeLongValid + kpiMetrics.runtimeLongCheck}</strong>
            </div>
          </div>

          {/* KPI 3: Đơn lớn kéo dài > 12h (Hợp lý) */}
          <div
            className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() =>
              setSelectedRuntimeAnomaly(
                selectedRuntimeAnomaly === 'LONG_VALID' ? 'ALL' : 'LONG_VALID'
              )
            }
          >
            <span className="text-[11px] font-semibold text-slate-500 block">Đơn lớn &gt; 12h (Hợp lý)</span>
            <div className="text-3xl sm:text-4xl font-black text-teal-700 font-mono mt-1 tracking-tight">
              {kpiMetrics.runtimeLongValid}{' '}
              <span className="text-xs font-semibold text-slate-500">phiếu</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Đối chiếu: SL &ge; 8.000 sản phẩm
            </div>
          </div>

          {/* KPI 4 */}
          <div
            className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setSelectedSource(selectedSource === 'MES' ? 'ALL' : 'MES')}
          >
            <span className="text-[11px] font-semibold text-slate-500 block">
              Tỷ lệ tạo trên MES
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono mt-1 tracking-tight">
              {kpiMetrics.mesRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              MES: {kpiMetrics.mesCreatedCount} | Bravo: {kpiMetrics.bravoCreatedCount}
            </div>
          </div>

          {/* KPI 5 */}
          <div
            className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setSelectedAutoExportOnly(!selectedAutoExportOnly)}
          >
            <span className="text-[11px] font-semibold text-slate-500 block">
              Ghi chú xuất tự động
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#00572e] font-mono mt-1 tracking-tight">
              {kpiMetrics.autoExportCount}{' '}
              <span className="text-xs font-semibold text-slate-500">
                ({kpiMetrics.autoExportRate}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Tự động sinh phiếu kho</div>
          </div>

          {/* Overall Production Yield Summary */}
          <div className="p-3.5 bg-emerald-50/40">
            <span className="text-[11px] font-semibold text-slate-600 block">
              Tỷ lệ Đạt chuẩn toàn xưởng
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#006837] font-mono mt-1 tracking-tight">
              {kpiMetrics.overallPassRate}%
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-mono font-semibold">
              {kpiMetrics.totalPassQty.toLocaleString('vi-VN')} /{' '}
              {kpiMetrics.totalActualQty.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXECUTIVE BI CHARTS & VISUAL ANALYTICS DASHBOARD */}
      <div className="bg-white rounded-lg border border-emerald-100 overflow-hidden shadow-xs">
        {/* Dashboard Header with Mode Switcher & Collapse Toggle */}
        <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/40 border-b border-emerald-100 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#006837] inline-block" />
            <div className="flex items-center gap-1.5">
              <BarChart3 size={15} className="text-[#00572e]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#00572e] m-0">
                Biểu đồ trực quan thông số & hiệu suất sản xuất
              </h2>
            </div>
            <span className="hidden md:inline-block text-[10px] bg-[#00572e] text-white font-semibold px-2 py-0.5 rounded shadow-xs">
              Goldsun BI Analytics
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart view filter tabs */}
            <div className="inline-flex bg-emerald-100/60 p-0.5 rounded text-[11px] font-medium text-emerald-900">
              <button
                type="button"
                onClick={() => setChartViewMode('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartViewMode === 'ALL'
                    ? 'bg-[#00572e] text-white font-bold shadow-xs'
                    : 'text-emerald-900 hover:text-black hover:bg-emerald-200/50'
                }`}
              >
                Tất cả (4)
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('SOURCE')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartViewMode === 'SOURCE'
                    ? 'bg-[#00572e] text-white font-bold shadow-xs'
                    : 'text-emerald-900 hover:text-black hover:bg-emerald-200/50'
                }`}
              >
                Nguồn tạo
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('RUNTIME')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartViewMode === 'RUNTIME'
                    ? 'bg-[#00572e] text-white font-bold shadow-xs'
                    : 'text-emerald-900 hover:text-black hover:bg-emerald-200/50'
                }`}
              >
                Thời gian thao tác & QLSX
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('MACHINE')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartViewMode === 'MACHINE'
                    ? 'bg-[#00572e] text-white font-bold shadow-xs'
                    : 'text-emerald-900 hover:text-black hover:bg-emerald-200/50'
                }`}
              >
                Máy SX
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('TEAM')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartViewMode === 'TEAM'
                    ? 'bg-[#00572e] text-white font-bold shadow-xs'
                    : 'text-emerald-900 hover:text-black hover:bg-emerald-200/50'
                }`}
              >
                Tổ SX
              </button>
            </div>

            <Button
              size="small"
              icon={isChartsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              onClick={() => setIsChartsExpanded(!isChartsExpanded)}
              className="text-xs text-[#00572e] border-emerald-200 hover:border-[#006837]"
            >
              {isChartsExpanded ? 'Thu gọn' : 'Mở rộng'}
            </Button>
          </div>
        </div>

        {/* Charts Body */}
        {isChartsExpanded && (
          <div className="p-4 bg-emerald-50/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* =========================================================
                  CHART 1: NGUỒN TẠO PHIẾU (MES vs BRAVO) & ĐỘ TIN CẬY
                  ========================================================= */}
              {(chartViewMode === 'ALL' || chartViewMode === 'SOURCE') && (
                <div className="bg-white border border-emerald-100 rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <PieChart size={14} className="text-[#006837]" />
                      <span className="text-xs font-bold text-[#00572e] uppercase tracking-wide">
                        1. Nguồn tạo phiếu & Chỉ số chất lượng dữ liệu
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-800">
                      Tổng: <strong>{kpiMetrics.totalTickets}</strong> phiếu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* SVG Donut Chart for MES vs Bravo */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center relative py-1">
                      <svg
                        width="120"
                        height="120"
                        viewBox="0 0 100 100"
                        className="transform -rotate-90"
                      >
                        {/* Background ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="11"
                        />
                        {/* Bravo / Non-MES Segment */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#7c3aed"
                          strokeWidth="11"
                          strokeDasharray="238.76 238.76"
                          strokeDashoffset="0"
                        />
                        {/* MES Segment */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#006837"
                          strokeWidth="11"
                          strokeDasharray={`${(parseFloat(kpiMetrics.mesRate) / 100) * 238.76} 238.76`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Center Stats */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base font-black text-[#00572e] font-mono leading-none">
                          {kpiMetrics.mesRate}%
                        </span>
                        <span className="text-[9px] font-bold text-[#006837] uppercase tracking-tight mt-0.5">
                          Tạo trên MES
                        </span>
                      </div>
                    </div>

                    {/* Breakdown details & Clickable filter tags */}
                    <div className="sm:col-span-7 space-y-2 text-xs">
                      <div
                        onClick={() => setSelectedSource(selectedSource === 'MES' ? 'ALL' : 'MES')}
                        className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                          selectedSource === 'MES'
                            ? 'bg-emerald-50 border-[#006837] ring-1 ring-[#006837]'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-emerald-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#006837] inline-block" />
                          <span className="font-semibold text-slate-700">Hệ thống MES</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-[#006837]">
                            {kpiMetrics.mesCreatedCount}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({kpiMetrics.mesRate}%)
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedSource(selectedSource === 'Bravo' ? 'ALL' : 'Bravo')
                        }
                        className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                          selectedSource === 'Bravo'
                            ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                          <span className="font-semibold text-slate-700">Bravo / Ngoài MES</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-purple-800">
                            {kpiMetrics.bravoCreatedCount}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({kpiMetrics.bravoRate}%)
                          </span>
                        </div>
                      </div>

                      {/* Sub Quality KPI progress bars */}
                      <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        <div
                          onClick={() =>
                            setSelectedRuntimeAnomaly(
                              selectedRuntimeAnomaly === 'NORMAL' ? 'ALL' : 'NORMAL'
                            )
                          }
                          className={`p-1.5 rounded border cursor-pointer ${
                            selectedRuntimeAnomaly === 'NORMAL'
                              ? 'bg-emerald-50 border-emerald-400'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-600">Chuẩn giờ:</span>
                            <span className="font-mono text-emerald-800">
                              {kpiMetrics.runtimeNormal} ({kpiMetrics.runtimeNormalRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(parseFloat(kpiMetrics.runtimeNormalRate), 100)}%`
                              }}
                            />
                          </div>
                        </div>

                        <div
                          onClick={() => setSelectedAutoExportOnly(!selectedAutoExportOnly)}
                          className={`p-1.5 rounded border cursor-pointer ${
                            selectedAutoExportOnly
                              ? 'bg-amber-50 border-amber-400'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-600">Xuất tự động:</span>
                            <span className="font-mono text-amber-800">
                              {kpiMetrics.autoExportCount} ({kpiMetrics.autoExportRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(parseFloat(kpiMetrics.autoExportRate), 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================
                  CHART 2: PHÂN TÍCH THỜI GIAN THAO TÁC & ĐỐI CHIẾU QUẢN LÝ SẢN XUẤT
                  ========================================================= */}
              {(chartViewMode === 'ALL' || chartViewMode === 'RUNTIME') && (
                <div className="bg-white border border-emerald-100 rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#006837]" />
                      <span className="text-xs font-bold text-[#00572e] uppercase tracking-wide">
                        2. Phân tích thời gian thao tác & Đối chiếu Quản lý sản xuất
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      Tổng bất thường: <strong className="text-amber-700">{kpiMetrics.totalAnomalies}</strong> ({kpiMetrics.anomalyRate}%)
                    </div>
                  </div>

                  {/* Visual Stacked Multi-colored Runtime Anomaly Spectrum Bar (100%) */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                      <span>Phổ phân bổ thời gian thực hiện phiếu (100%)</span>
                      <span className="font-mono text-emerald-800">
                        Chuẩn quy trình: 5 phút - 12 tiếng
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded flex overflow-hidden border border-slate-200 shadow-inner">
                      <div
                        style={{ width: `${kpiMetrics.runtimeNormalRate}%` }}
                        className="bg-emerald-500 h-full transition-all hover:opacity-85 cursor-pointer relative group"
                        title={`5p - 12h (Chuẩn quy trình): ${kpiMetrics.runtimeNormal} phiếu (${kpiMetrics.runtimeNormalRate}%)`}
                        onClick={() =>
                          setSelectedRuntimeAnomaly(
                            selectedRuntimeAnomaly === 'NORMAL' ? 'ALL' : 'NORMAL'
                          )
                        }
                      />
                      <div
                        style={{ width: `${kpiMetrics.runtimeShortRate}%` }}
                        className="bg-rose-500 h-full transition-all hover:opacity-85 cursor-pointer relative group"
                        title={`< 5 phút (Cảnh báo nhập sai/chốt vội): ${kpiMetrics.runtimeShort} phiếu (${kpiMetrics.runtimeShortRate}%)`}
                        onClick={() =>
                          setSelectedRuntimeAnomaly(
                            selectedRuntimeAnomaly === 'SHORT' ? 'ALL' : 'SHORT'
                          )
                        }
                      />
                      <div
                        style={{ width: `${kpiMetrics.runtimeLongValidRate}%` }}
                        className="bg-teal-500 h-full transition-all hover:opacity-85 cursor-pointer relative group"
                        title={`> 12h - Đơn lớn (Hợp lý): ${kpiMetrics.runtimeLongValid} phiếu (${kpiMetrics.runtimeLongValidRate}%)`}
                        onClick={() =>
                          setSelectedRuntimeAnomaly(
                            selectedRuntimeAnomaly === 'LONG_VALID' ? 'ALL' : 'LONG_VALID'
                          )
                        }
                      />
                      <div
                        style={{ width: `${kpiMetrics.runtimeLongCheckRate}%` }}
                        className="bg-amber-500 h-full transition-all hover:opacity-85 cursor-pointer relative group"
                        title={`> 12h - Đơn nhỏ (Nghi vấn quên đóng): ${kpiMetrics.runtimeLongCheck} phiếu (${kpiMetrics.runtimeLongCheckRate}%)`}
                        onClick={() =>
                          setSelectedRuntimeAnomaly(
                            selectedRuntimeAnomaly === 'LONG_CHECK' ? 'ALL' : 'LONG_CHECK'
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* 4 Interactive Runtime Inspection Category Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div
                      onClick={() =>
                        setSelectedRuntimeAnomaly(
                          selectedRuntimeAnomaly === 'NORMAL' ? 'ALL' : 'NORMAL'
                        )
                      }
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedRuntimeAnomaly === 'NORMAL'
                          ? 'bg-emerald-50 border-[#006837] ring-1 ring-[#006837]'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        5p - 12h (Chuẩn)
                      </div>
                      <div className="text-base font-bold text-[#00572e] font-mono mt-0.5">
                        {kpiMetrics.runtimeNormal}{' '}
                        <span className="text-[10px] font-normal text-slate-500">phiếu</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold font-mono truncate">
                        {kpiMetrics.runtimeNormalRate}% (Đạt chuẩn)
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedRuntimeAnomaly(
                          selectedRuntimeAnomaly === 'SHORT' ? 'ALL' : 'SHORT'
                        )
                      }
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedRuntimeAnomaly === 'SHORT'
                          ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        &lt; 5p (Chấn chỉnh)
                      </div>
                      <div className="text-base font-bold text-rose-700 font-mono mt-0.5">
                        {kpiMetrics.runtimeShort}{' '}
                        <span className="text-[10px] font-normal text-slate-500">phiếu</span>
                      </div>
                      <div className="text-[10px] text-rose-700 font-semibold font-mono truncate">
                        {kpiMetrics.runtimeShortRate}% (Nhập sai/vội)
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedRuntimeAnomaly(
                          selectedRuntimeAnomaly === 'LONG_VALID' ? 'ALL' : 'LONG_VALID'
                        )
                      }
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedRuntimeAnomaly === 'LONG_VALID'
                          ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-teal-800 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        &gt; 12h (Đơn lớn)
                      </div>
                      <div className="text-base font-bold text-[#00572e] font-mono mt-0.5">
                        {kpiMetrics.runtimeLongValid}{' '}
                        <span className="text-[10px] font-normal text-slate-500">phiếu</span>
                      </div>
                      <div className="text-[10px] text-teal-700 font-semibold font-mono truncate">
                        {kpiMetrics.runtimeLongValidRate}% (Hợp lý)
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedRuntimeAnomaly(
                          selectedRuntimeAnomaly === 'LONG_CHECK' ? 'ALL' : 'LONG_CHECK'
                        )
                      }
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedRuntimeAnomaly === 'LONG_CHECK'
                          ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        &gt; 12h (Nghi vấn)
                      </div>
                      <div className="text-base font-bold text-amber-800 font-mono mt-0.5">
                        {kpiMetrics.runtimeLongCheck}{' '}
                        <span className="text-[10px] font-normal text-slate-500">phiếu</span>
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold font-mono truncate">
                        {kpiMetrics.runtimeLongCheckRate}% (Quên đóng)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================
                  CHART 3: PHÂN TÍCH NĂNG LỰC & TỶ LỆ ĐẠT HỆ THỐNG MÁY (FLEET ANALYTICS)
                  ========================================================= */}
              {(chartViewMode === 'ALL' || chartViewMode === 'MACHINE') && (
                <div className="bg-white border border-emerald-100 rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 mb-2.5 gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-[#006837]" />
                      <span className="text-xs font-bold text-[#00572e] uppercase tracking-wide">
                        3. Phân tầng năng lực & tỷ lệ đạt hệ thống máy ({machineAggregates.length}{' '}
                        máy)
                      </span>
                    </div>

                    {/* View Switcher: 4 Tầng Hiệu Suất (Tất cả 100+ máy) vs Top Gánh Tải & Cảnh Báo */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                      <button
                        onClick={() => setMachineSubView('TIERS')}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${
                          machineSubView === 'TIERS'
                            ? 'bg-white text-[#00572e] shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Phân bổ 4 Tầng Năng Lực ({machineAggregates.length} máy)
                      </button>
                      <button
                        onClick={() => setMachineSubView('TOP_ALERT')}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${
                          machineSubView === 'TOP_ALERT'
                            ? 'bg-white text-[#00572e] shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Top 5 Gánh Tải & Cảnh Báo
                      </button>
                    </div>
                  </div>

                  {machineAggregates.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Không có dữ liệu máy phù hợp bộ lọc
                    </div>
                  ) : machineSubView === 'TIERS' ? (
                    <div className="space-y-2.5">
                      {/* 100% Machine Fleet Distribution Spectrum Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                          <span>Phổ phân bố quy mô toàn bộ đội máy:</span>
                          <span>
                            Tổng: {machineAnalyticsSummary.totalMachines} máy |{' '}
                            {machineAnalyticsSummary.totalActual.toLocaleString('vi-VN')} SL SX
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          {parseFloat(machinePerformanceTiers.tier1.machinePercent) > 0 && (
                            <div
                              style={{ width: `${machinePerformanceTiers.tier1.machinePercent}%` }}
                              className="bg-[#00572e] h-full hover:brightness-110 transition-all cursor-pointer"
                              title={`Tầng Xuất Sắc (≥99%): ${machinePerformanceTiers.tier1.count} máy (${machinePerformanceTiers.tier1.machinePercent}%)`}
                              onClick={() =>
                                setSelectedYieldTier(
                                  selectedYieldTier === 'tier1' ? 'ALL' : 'tier1'
                                )
                              }
                            />
                          )}
                          {parseFloat(machinePerformanceTiers.tier2.machinePercent) > 0 && (
                            <div
                              style={{ width: `${machinePerformanceTiers.tier2.machinePercent}%` }}
                              className="bg-[#10b981] h-full hover:brightness-110 transition-all cursor-pointer"
                              title={`Tầng Đạt Chuẩn (98-99%): ${machinePerformanceTiers.tier2.count} máy (${machinePerformanceTiers.tier2.machinePercent}%)`}
                              onClick={() =>
                                setSelectedYieldTier(
                                  selectedYieldTier === 'tier2' ? 'ALL' : 'tier2'
                                )
                              }
                            />
                          )}
                          {parseFloat(machinePerformanceTiers.tier3.machinePercent) > 0 && (
                            <div
                              style={{ width: `${machinePerformanceTiers.tier3.machinePercent}%` }}
                              className="bg-amber-400 h-full hover:brightness-110 transition-all cursor-pointer"
                              title={`Tầng Cần Theo Dõi (95-98%): ${machinePerformanceTiers.tier3.count} máy (${machinePerformanceTiers.tier3.machinePercent}%)`}
                              onClick={() =>
                                setSelectedYieldTier(
                                  selectedYieldTier === 'tier3' ? 'ALL' : 'tier3'
                                )
                              }
                            />
                          )}
                          {parseFloat(machinePerformanceTiers.tier4.machinePercent) > 0 && (
                            <div
                              style={{ width: `${machinePerformanceTiers.tier4.machinePercent}%` }}
                              className="bg-rose-500 h-full hover:brightness-110 transition-all cursor-pointer"
                              title={`Tầng Cảnh Báo (<95%): ${machinePerformanceTiers.tier4.count} máy (${machinePerformanceTiers.tier4.machinePercent}%)`}
                              onClick={() =>
                                setSelectedYieldTier(
                                  selectedYieldTier === 'tier4' ? 'ALL' : 'tier4'
                                )
                              }
                            />
                          )}
                        </div>
                      </div>

                      {/* 4 Performance Tier Stratification Cards (No Scrollbar, Fits 10-1000+ machines) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {/* Tier 1 */}
                        <div
                          onClick={() =>
                            setSelectedYieldTier(selectedYieldTier === 'tier1' ? 'ALL' : 'tier1')
                          }
                          className={`p-2 rounded border cursor-pointer transition-all ${
                            selectedYieldTier === 'tier1'
                              ? 'bg-emerald-50 border-[#00572e] ring-1 ring-[#00572e]'
                              : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-[#00572e]">
                              Tầng Xuất Sắc (&ge;99%)
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-[#00572e] text-white px-1.5 py-0.2 rounded">
                              {machinePerformanceTiers.tier1.machinePercent}%
                            </span>
                          </div>
                          <div className="text-base font-bold text-[#00572e] font-mono">
                            {machinePerformanceTiers.tier1.count}{' '}
                            <span className="text-[10px] font-normal text-slate-500">máy</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1 pt-1 border-t border-emerald-100">
                            <span>
                              SL: {machinePerformanceTiers.tier1.qty.toLocaleString('vi-VN')}
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {machinePerformanceTiers.tier1.qtyPercent}% tổng
                            </span>
                          </div>
                        </div>

                        {/* Tier 2 */}
                        <div
                          onClick={() =>
                            setSelectedYieldTier(selectedYieldTier === 'tier2' ? 'ALL' : 'tier2')
                          }
                          className={`p-2 rounded border cursor-pointer transition-all ${
                            selectedYieldTier === 'tier2'
                              ? 'bg-teal-50 border-teal-600 ring-1 ring-teal-600'
                              : 'bg-teal-50/40 border-teal-200 hover:bg-teal-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-teal-800">Tầng Đạt Chuẩn (98-99%)</span>
                            <span className="text-[9px] font-mono font-bold bg-teal-600 text-white px-1.5 py-0.2 rounded">
                              {machinePerformanceTiers.tier2.machinePercent}%
                            </span>
                          </div>
                          <div className="text-base font-bold text-teal-800 font-mono">
                            {machinePerformanceTiers.tier2.count}{' '}
                            <span className="text-[10px] font-normal text-slate-500">máy</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1 pt-1 border-t border-teal-100">
                            <span>
                              SL: {machinePerformanceTiers.tier2.qty.toLocaleString('vi-VN')}
                            </span>
                            <span className="font-semibold text-teal-700">
                              {machinePerformanceTiers.tier2.qtyPercent}% tổng
                            </span>
                          </div>
                        </div>

                        {/* Tier 3 */}
                        <div
                          onClick={() =>
                            setSelectedYieldTier(selectedYieldTier === 'tier3' ? 'ALL' : 'tier3')
                          }
                          className={`p-2 rounded border cursor-pointer transition-all ${
                            selectedYieldTier === 'tier3'
                              ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600'
                              : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-amber-900">Cần Theo Dõi (95-98%)</span>
                            <span className="text-[9px] font-mono font-bold bg-amber-500 text-white px-1.5 py-0.2 rounded">
                              {machinePerformanceTiers.tier3.machinePercent}%
                            </span>
                          </div>
                          <div className="text-base font-bold text-amber-900 font-mono">
                            {machinePerformanceTiers.tier3.count}{' '}
                            <span className="text-[10px] font-normal text-slate-500">máy</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1 pt-1 border-t border-amber-100">
                            <span>
                              SL: {machinePerformanceTiers.tier3.qty.toLocaleString('vi-VN')}
                            </span>
                            <span className="font-semibold text-amber-800">
                              {machinePerformanceTiers.tier3.qtyPercent}% tổng
                            </span>
                          </div>
                        </div>

                        {/* Tier 4 */}
                        <div
                          onClick={() =>
                            setSelectedYieldTier(selectedYieldTier === 'tier4' ? 'ALL' : 'tier4')
                          }
                          className={`p-2 rounded border cursor-pointer transition-all ${
                            selectedYieldTier === 'tier4'
                              ? 'bg-rose-50 border-rose-600 ring-1 ring-rose-600'
                              : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-rose-800">Tầng Cảnh Báo (&lt;95%)</span>
                            <span className="text-[9px] font-mono font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded">
                              {machinePerformanceTiers.tier4.machinePercent}%
                            </span>
                          </div>
                          <div className="text-base font-bold text-rose-800 font-mono">
                            {machinePerformanceTiers.tier4.count}{' '}
                            <span className="text-[10px] font-normal text-slate-500">máy</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1 pt-1 border-t border-rose-100">
                            <span>
                              SL: {machinePerformanceTiers.tier4.qty.toLocaleString('vi-VN')}
                            </span>
                            <span className="font-semibold text-rose-700">
                              {machinePerformanceTiers.tier4.qtyPercent}% tổng
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fleet Performance Benchmark Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded p-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-600 text-[10px]">
                            Tỷ lệ đạt toàn hệ thống:
                          </span>
                          <span className="font-bold text-[#00572e] font-mono">
                            {machineAnalyticsSummary.overallPassRate}%
                          </span>
                        </div>
                        <div className="bg-teal-50/60 border border-teal-100 rounded p-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-600 text-[10px]">Tốc độ xuất xưởng TB:</span>
                          <span className="font-bold text-[#006837] font-mono">
                            {machineAnalyticsSummary.avgPassPerHour.toLocaleString('vi-VN')} cái/h
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-600 text-[10px]">
                            Tổng giờ chạy toàn đội:
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            {machineAnalyticsSummary.totalRuntimeHours} giờ
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Leaderboard View: Top 5 Gánh Tải vs Top 5 Cần Rà Soát Phế Phẩm */
                    <div className="space-y-3">
                      {/* Filter Switcher for Leaderboard */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Trophy size={14} className="text-amber-500" />
                          <span>Bảng xếp hạng hiệu suất Top 5 hệ thống máy:</span>
                        </div>
                        <div className="inline-flex bg-white p-0.5 rounded border border-slate-200 text-xs shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setLeaderboardTab('ALL')}
                            className={`px-2.5 py-1 rounded font-semibold transition-all ${
                              leaderboardTab === 'ALL'
                                ? 'bg-[#00572e] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Tất cả (2 nhóm)
                          </button>
                          <button
                            type="button"
                            onClick={() => setLeaderboardTab('VOLUME')}
                            className={`px-2.5 py-1 rounded font-semibold transition-all ${
                              leaderboardTab === 'VOLUME'
                                ? 'bg-[#00572e] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Top 5 Gánh Tải
                          </button>
                          <button
                            type="button"
                            onClick={() => setLeaderboardTab('ALERT')}
                            className={`px-2.5 py-1 rounded font-semibold transition-all ${
                              leaderboardTab === 'ALERT'
                                ? 'bg-rose-700 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Top 5 Cần Rà Soát Phế Phẩm
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {/* TABLE: Top 5 Volume (Gánh tải lớn nhất) */}
                        {(leaderboardTab === 'ALL' || leaderboardTab === 'VOLUME') && (
                          <div className="border border-emerald-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#006837]" />
                                <span className="text-xs font-bold text-[#00572e] uppercase tracking-wide">
                                  Top 5 Máy Gánh Tải Sản Lượng Cao Nhất
                                </span>
                              </div>
                              <span className="text-[11px] text-emerald-800 font-medium">
                                Đóng góp chính cho sản lượng xưởng
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                                    <th className="py-2 px-3 text-center w-12">Hạng</th>
                                    <th className="py-2 px-3">Tên & Mã máy</th>
                                    <th className="py-2 px-3 text-right">SL Sản Xuất</th>
                                    <th className="py-2 px-3 text-right">SL Đạt</th>
                                    <th className="py-2 px-3 text-center">Tỷ lệ đạt</th>
                                    <th className="py-2 px-3 text-right">Giờ chạy</th>
                                    <th className="py-2 px-3 text-right">Tốc độ (cái/h)</th>
                                    <th className="py-2 px-3 text-center">Đánh giá vận hành</th>
                                    <th className="py-2 px-3 text-center w-20">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {machineLeaderboards.top5Volume.map((m, idx) => {
                                    const isSelected = selectedMachine === m.machineCode
                                    const rankBadges = [
                                      'bg-amber-100 text-amber-900 border-amber-300 font-black',
                                      'bg-slate-200 text-slate-800 border-slate-300 font-black',
                                      'bg-amber-50 text-amber-800 border-amber-200 font-black',
                                      'bg-slate-100 text-slate-700 border-slate-200',
                                      'bg-slate-100 text-slate-700 border-slate-200'
                                    ]
                                    return (
                                      <tr
                                        key={m.machineCode}
                                        onClick={() =>
                                          setSelectedMachine(isSelected ? 'ALL' : m.machineCode)
                                        }
                                        className={`cursor-pointer transition-colors ${
                                          isSelected ? 'bg-emerald-50/90 font-medium' : 'hover:bg-emerald-50/40'
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-center">
                                          <span
                                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] border ${
                                              rankBadges[idx] || 'bg-slate-100 text-slate-700'
                                            }`}
                                          >
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-sans">
                                          <div className="font-bold text-slate-800">{m.machineName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{m.machineCode}</div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-black text-sm text-[#00572e]">
                                          {m.actualQty.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-700">
                                          {m.passQty.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            {m.passRate}%
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                          {m.runtimeHours}h
                                        </td>
                                        <td className="py-2 px-3 text-right text-[#006837] font-bold">
                                          {m.passPerHour.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-center font-sans">
                                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                                            {idx === 0 ? 'Cột trụ sản lượng' : 'Chủ lực dây chuyền'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-center font-sans">
                                          <button
                                            type="button"
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                                              isSelected
                                                ? 'bg-[#00572e] text-white shadow-xs'
                                                : 'bg-emerald-50 text-[#00572e] border border-emerald-200 hover:bg-[#00572e] hover:text-white'
                                            }`}
                                          >
                                            {isSelected ? 'Đang chọn' : 'Lọc máy'}
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* TABLE: Top 5 Lowest Yield (Cảnh báo phế phẩm) */}
                        {(leaderboardTab === 'ALL' || leaderboardTab === 'ALERT') && (
                          <div className="border border-rose-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-white px-3 py-2 border-b border-rose-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-rose-600" />
                                <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                                  Top 5 Máy Cần Cải Thiện Tỷ Lệ Đạt & Rà Soát Phế Phẩm
                                </span>
                              </div>
                              <span className="text-[11px] text-rose-700 font-medium">
                                Cảnh báo phế phẩm cần QLSX can thiệp
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                                    <th className="py-2 px-3 text-center w-12">Hạng</th>
                                    <th className="py-2 px-3">Tên & Mã máy</th>
                                    <th className="py-2 px-3 text-right">SL Sản Xuất</th>
                                    <th className="py-2 px-3 text-right">SL Hỏng (Phế phẩm)</th>
                                    <th className="py-2 px-3 text-center">Tỷ lệ đạt</th>
                                    <th className="py-2 px-3 text-right">Giờ chạy</th>
                                    <th className="py-2 px-3 text-right">Tốc độ (cái/h)</th>
                                    <th className="py-2 px-3 text-center">Khuyến nghị QLSX</th>
                                    <th className="py-2 px-3 text-center w-20">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {machineLeaderboards.bottom5Yield.map((m, idx) => {
                                    const isSelected = selectedMachine === m.machineCode
                                    return (
                                      <tr
                                        key={m.machineCode}
                                        onClick={() =>
                                          setSelectedMachine(isSelected ? 'ALL' : m.machineCode)
                                        }
                                        className={`cursor-pointer transition-colors ${
                                          isSelected ? 'bg-rose-50/90 font-medium' : 'hover:bg-rose-50/40'
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-center">
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] border bg-rose-100 text-rose-800 border-rose-300 font-bold">
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-sans">
                                          <div className="font-bold text-slate-800">{m.machineName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{m.machineCode}</div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                                          {m.actualQty.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-black text-sm text-rose-700">
                                          {m.defectQty.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                            {m.passRate}%
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                          {m.runtimeHours}h
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-800 font-bold">
                                          {m.passPerHour.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-center font-sans">
                                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-full">
                                            Rà soát hao hụt / căn chỉnh
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-center font-sans">
                                          <button
                                            type="button"
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                                              isSelected
                                                ? 'bg-rose-700 text-white shadow-xs'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-700 hover:text-white'
                                            }`}
                                          >
                                            {isSelected ? 'Đang chọn' : 'Lọc máy'}
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  CHART 4: KHỐI LƯỢNG PHIẾU & KỶ LUẬT THỜI GIAN THEO TỔ SẢN XUẤT
                  ========================================================= */}
              {(chartViewMode === 'ALL' || chartViewMode === 'TEAM') && (
                <div className="bg-white border border-emerald-100 rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#006837]" />
                      <span className="text-xs font-bold text-[#00572e] uppercase tracking-wide">
                        4. Khối lượng phiếu & Kỷ luật thời gian theo tổ sản xuất
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Chuẩn 5p-12h
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-teal-500" /> &gt;12h Đơn lớn
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;5p Chấn chỉnh
                      </span>
                    </div>
                  </div>

                  {/* Visual BI Workload & Runtime Discipline Column Visualizer */}
                  {teamChartData.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Không có dữ liệu tổ phù hợp bộ lọc
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Executive Team Operational Matrix Table (No vertical bars, full professional matrix) */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                              <th className="py-2.5 px-3">Tổ sản xuất</th>
                              <th className="py-2.5 px-3 text-right">Khối lượng phiếu</th>
                              <th className="py-2.5 px-3 text-right">Tổng giờ chạy</th>
                              <th className="py-2.5 px-3">Kỷ luật thời gian & Cảnh báo QLSX</th>
                              <th className="py-2.5 px-3 text-center">Nguồn ngoài MES</th>
                              <th className="py-2.5 px-3 text-center">Xuất TĐ</th>
                              <th className="py-2.5 px-3 text-center w-24">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {teamChartData.map((t) => {
                              const isSelected = selectedTeam === t.team
                              const workloadPercent =
                                kpiMetrics.totalTickets > 0
                                  ? ((t.ticketCount / kpiMetrics.totalTickets) * 100).toFixed(1)
                                  : '0.0'
                              return (
                                <tr
                                  key={t.team}
                                  onClick={() => setSelectedTeam(isSelected ? 'ALL' : t.team)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-50/90 font-medium'
                                      : 'hover:bg-emerald-50/40'
                                  }`}
                                >
                                  <td className="py-2 px-3 font-sans">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isSelected ? 'bg-[#006837]' : 'bg-slate-300'
                                        }`}
                                      />
                                      <span
                                        className={`font-bold ${
                                          isSelected ? 'text-[#00572e]' : 'text-slate-800'
                                        }`}
                                      >
                                        {t.team}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="font-black text-sm text-[#00572e]">
                                      {t.ticketCount}{' '}
                                      <span className="text-[10px] text-slate-500 font-normal font-sans">
                                        phiếu ({workloadPercent}%)
                                      </span>
                                    </div>
                                    <div className="w-24 ml-auto bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                                      <div
                                        style={{ width: `${workloadPercent}%` }}
                                        className="bg-[#006837] h-full rounded-full"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-700">
                                    {t.runtimeHours}h
                                  </td>
                                  <td className="py-2 px-3 font-sans">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {t.anomalyCount === 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 size={12} className="text-emerald-600" />{' '}
                                          Chuẩn 100%
                                        </span>
                                      ) : (
                                        <>
                                          {t.shortCount > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                              <AlertTriangle size={12} className="text-rose-600" />{' '}
                                              {t.shortCount} phiếu &lt; 5p (Chấn chỉnh)
                                            </span>
                                          )}
                                          {t.longCheckCount > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                              <Clock size={12} className="text-amber-600" />{' '}
                                              {t.longCheckCount} phiếu &gt; 12h (Nghi vấn)
                                            </span>
                                          )}
                                        </>
                                      )}
                                      {t.longValidCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                          {t.longValidCount} đơn lớn hợp lý
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {t.nonMesCount > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                                        {t.nonMesCount}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {t.autoExportCount > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                                        {t.autoExportCount}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-sans">
                                    <button
                                      type="button"
                                      className={`text-[11px] font-bold px-2.5 py-1 rounded transition-colors ${
                                        isSelected
                                          ? 'bg-[#00572e] text-white shadow-xs'
                                          : 'bg-emerald-50 text-[#006837] border border-emerald-200 hover:bg-[#006837] hover:text-white'
                                      }`}
                                    >
                                      {isSelected ? 'Đang lọc' : 'Lọc tổ'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 3 Executive Team Analytics Summary Cards (Prominent Big Numbers) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2.5 flex items-center justify-between shadow-2xs">
                          <div>
                            <div className="text-[11px] text-emerald-800 font-semibold">
                              Tổ Kỷ Luật Tốt Nhất
                            </div>
                            <div className="text-sm sm:text-base font-black text-[#00572e] font-sans mt-0.5 truncate max-w-[140px]">
                              {teamAnalyticsSummary.bestDisciplineTeam.team}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500">Cảnh báo bất thường</div>
                            <div className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                              0 cảnh báo
                            </div>
                          </div>
                        </div>

                        <div className="bg-teal-50/70 border border-teal-200 rounded p-2.5 flex items-center justify-between shadow-2xs">
                          <div>
                            <div className="text-[11px] text-teal-800 font-semibold">
                              Tổ Khối Lượng Cao Nhất
                            </div>
                            <div className="text-sm sm:text-base font-black text-[#006837] font-sans mt-0.5 truncate max-w-[140px]">
                              {teamAnalyticsSummary.topVolumeTeam.team}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500">Khối lượng phiếu</div>
                            <div className="text-sm sm:text-base font-black text-teal-700 font-mono">
                              {teamAnalyticsSummary.topVolumeTeam.ticketCount}{' '}
                              <span className="text-xs font-normal text-slate-500 font-sans">
                                phiếu
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center justify-between shadow-2xs">
                          <div>
                            <div className="text-[11px] text-slate-600 font-semibold">
                              Đối Chiếu & Cảnh Báo QLSX
                            </div>
                            <div className="text-sm sm:text-base font-black text-slate-800 font-mono mt-0.5">
                              {teamAnalyticsSummary.totalShort + teamAnalyticsSummary.totalLongCheck}{' '}
                              <span className="text-xs font-normal text-slate-500 font-sans">
                                cảnh báo
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500">Đơn lớn &gt; 12h</div>
                            <div className="text-sm sm:text-base font-black text-teal-700 font-mono">
                              {teamAnalyticsSummary.totalLongValid}{' '}
                              <span className="text-xs font-normal text-slate-500 font-sans">
                                hợp lý
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. TABLE 1 (FULL WIDTH): BẢNG THEO MÁY SẢN XUẤT */}
      <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="bg-emerald-50/50 border-b border-emerald-100 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#006837]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#00572e] m-0">
              Bảng 1: Thống kê hiệu suất theo máy sản xuất
            </h2>
            <span className="text-[11px] bg-white border border-emerald-200 px-2 py-0.5 font-mono font-semibold text-[#00572e] rounded">
              {machineAggregates.length} máy
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="font-medium">Ẩn khu thủ công:</span>
              <Switch size="small" checked={hideManualAreas} onChange={setHideManualAreas} />
            </div>

            <Popover
              title={
                <span className="font-bold text-xs text-[#00572e]">
                  Quy chuẩn tính giờ máy & Định mức Goldsun
                </span>
              }
              content={
                <div className="max-w-xs text-xs text-slate-700 space-y-1.5 py-1">
                  <p>
                    • <strong>Giờ chạy máy (h)</strong>: Tổng thời gian ghi nhận vận hành thực tế.
                  </p>
                  <p>
                    • <strong>Tỷ lệ / 24h</strong>: (Tổng giờ chạy máy / 24 giờ) × 100%.
                  </p>
                  <p>
                    • <strong>Số đạt / Giờ</strong>: Tổng sản lượng đạt (passQty) / Tổng giờ chạy
                    thực tế.
                  </p>
                </div>
              }
              trigger="click"
            >
              <Button
                size="small"
                icon={<Info size={12} />}
                className="text-xs font-medium rounded text-[#00572e] border-emerald-200"
              >
                Mô tả cách tính giờ
              </Button>
            </Popover>
          </div>
        </div>

        {/* Machine Summary Bar */}
        <div className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/40 border-b border-emerald-100 px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 text-slate-700 font-sans shadow-2xs">
          <div>
            Tổng số máy: <strong className="text-base sm:text-lg font-black text-[#00572e] font-mono ml-1">{machineAggregates.length}</strong>
          </div>
          <div>
            Tổng giờ chạy: <strong className="text-base sm:text-lg font-black text-[#00572e] font-mono ml-1">{kpiMetrics.totalRuntimeHours}h</strong>
          </div>
          <div>
            Tổng SL sản xuất: <strong className="text-base sm:text-lg font-black text-slate-900 font-mono ml-1">{kpiMetrics.totalActualQty.toLocaleString('vi-VN')}</strong>
          </div>
          <div>
            Tổng SL đạt:{' '}
            <strong className="text-base sm:text-lg font-black text-emerald-800 font-mono ml-1">
              {kpiMetrics.totalPassQty.toLocaleString('vi-VN')}
            </strong>
          </div>
          <div>
            Tỷ lệ đạt TB: <strong className="text-base sm:text-lg font-black text-[#006837] font-mono ml-1">{kpiMetrics.overallPassRate}%</strong>
          </div>
        </div>

        {/* DataGrid Container */}
        <div className="h-[270px] w-full">
          <DataEditor
            ref={machineGridRef}
            theme={goldsunGridTheme}
            columns={machineGridCols}
            rows={machineAggregates.length}
            getCellContent={getMachineCellContent}
            rowMarkers="number"
            width="100%"
            height="100%"
            headerHeight={32}
            rowHeight={28}
            smoothScrollX={true}
            smoothScrollY={true}
            onCellClicked={([, row]) => {
              const item = machineAggregates[row]
              if (item) {
                setSelectedMachine(selectedMachine === item.machineCode ? 'ALL' : item.machineCode)
              }
            }}
          />
        </div>
      </div>

      {/* 6. TABLE 2 (FULL WIDTH): BẢNG THEO TỔ SẢN XUẤT */}
      <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="bg-emerald-50/50 border-b border-emerald-100 p-3.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#006837]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#00572e] m-0">
              Bảng 2: Thống kê hiệu suất theo tổ sản xuất
            </h2>
            <span className="text-[11px] bg-white border border-emerald-200 px-2 py-0.5 font-mono font-semibold text-[#00572e] rounded">
              {teamAggregates.length} tổ
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            * Nhấp vào dòng tổ để lọc chi tiết
          </span>
        </div>

        {/* Team Summary Bar */}
        <div className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/40 border-b border-emerald-100 px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 text-slate-700 font-sans shadow-2xs">
          <div>
            Tổng số tổ: <strong className="text-base sm:text-lg font-black text-[#00572e] font-mono ml-1">{teamAggregates.length}</strong>
          </div>
          <div>
            Tổng số phiếu: <strong className="text-base sm:text-lg font-black text-slate-900 font-mono ml-1">{kpiMetrics.totalTickets}</strong>
          </div>
          <div>
            Tổng giờ chạy: <strong className="text-base sm:text-lg font-black text-[#00572e] font-mono ml-1">{kpiMetrics.totalRuntimeHours}h</strong>
          </div>
          <div>
            Cảnh báo QLSX: <strong className={`text-base sm:text-lg font-black font-mono ml-1 ${kpiMetrics.totalAnomalies > 0 ? 'text-amber-700' : 'text-[#00572e]'}`}>{kpiMetrics.totalAnomalies}</strong>
          </div>
          <div>
            Đơn lớn &gt; 12h: <strong className="text-base sm:text-lg font-black text-teal-700 font-mono ml-1">{kpiMetrics.runtimeLongValid}</strong>
          </div>
          <div>
            Tạo ngoài MES: <strong className="text-base sm:text-lg font-black text-purple-700 font-mono ml-1">{kpiMetrics.bravoCreatedCount}</strong>
          </div>
          <div>
            Có xuất TĐ: <strong className="text-base sm:text-lg font-black text-amber-700 font-mono ml-1">{kpiMetrics.autoExportCount}</strong>
          </div>
        </div>

        {/* DataGrid Container */}
        <div className="h-[230px] w-full">
          <DataEditor
            ref={teamGridRef}
            theme={goldsunGridTheme}
            columns={teamGridCols}
            rows={teamAggregates.length}
            getCellContent={getTeamCellContent}
            rowMarkers="number"
            width="100%"
            height="100%"
            headerHeight={32}
            rowHeight={28}
            smoothScrollX={true}
            smoothScrollY={true}
            onCellClicked={([, row]) => {
              const item = teamAggregates[row]
              if (item) {
                setSelectedTeam(selectedTeam === item.team ? 'ALL' : item.team)
              }
            }}
          />
        </div>
      </div>

      {/* 7. TABLE 3 (FULL WIDTH): BẢNG CHI TIẾT PHIẾU THỐNG KÊ SẢN XUẤT */}
      <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="bg-emerald-50/50 border-b border-emerald-100 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#006837]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#00572e] m-0">
              Bảng 3: Chi tiết các phiếu thống kê sản xuất
            </h2>
            <span className="text-[11px] bg-[#00572e] text-[#fbbf24] px-2.5 py-0.5 font-mono font-bold rounded">
              {filteredData.length} bản ghi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              size="small"
              className="w-36 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'Hoàn thành', label: 'Hoàn thành' },
                { value: 'Đang chạy', label: 'Đang chạy' }
              ]}
            />
            <Button
              size="small"
              icon={<FileSpreadsheet size={13} className="text-[#006837]" />}
              onClick={handleExportData}
              className="text-xs font-semibold rounded text-[#00572e] border-emerald-300 hover:border-[#006837]"
            >
              Tải CSV/Excel
            </Button>
          </div>
        </div>

        {/* Details Summary Bar */}
        <div className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/40 border-b border-emerald-100 px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 text-slate-700 font-sans shadow-2xs">
          <div>
            Số bản ghi: <strong className="text-base sm:text-lg font-black text-[#00572e] font-mono ml-1">{filteredData.length}</strong>
          </div>
          <div>
            Tổng KH: <strong className="text-base sm:text-lg font-black text-slate-800 font-mono ml-1">{kpiMetrics.totalPlanQty.toLocaleString('vi-VN')}</strong>
          </div>
          <div>
            Tổng TT: <strong className="text-base sm:text-lg font-black text-slate-900 font-mono ml-1">{kpiMetrics.totalActualQty.toLocaleString('vi-VN')}</strong>
          </div>
          <div>
            Tổng Đạt:{' '}
            <strong className="text-base sm:text-lg font-black text-emerald-800 font-mono ml-1">
              {kpiMetrics.totalPassQty.toLocaleString('vi-VN')}
            </strong>
          </div>
          <div>
            Tổng Hỏng:{' '}
            <strong className="text-base sm:text-lg font-black text-rose-700 font-mono ml-1">
              {kpiMetrics.totalDefectQty.toLocaleString('vi-VN')}
            </strong>
          </div>
          <div>
            Tỷ lệ Đạt TB: <strong className="text-base sm:text-lg font-black text-[#006837] font-mono ml-1">{kpiMetrics.overallPassRate}%</strong>
          </div>
        </div>

        {/* DataGrid Container */}
        <div className="h-[460px] w-full">
          <DataEditor
            ref={detailGridRef}
            theme={goldsunGridTheme}
            columns={detailGridCols}
            rows={filteredData.length}
            getCellContent={getDetailCellContent}
            rowMarkers="number"
            width="100%"
            height="100%"
            headerHeight={32}
            rowHeight={28}
            smoothScrollX={true}
            smoothScrollY={true}
            onCellActivated={([, row]) => {
              const item = filteredData[row]
              if (item) {
                setSelectedRecord(item)
                setDetailModalVisible(true)
              }
            }}
            onCellClicked={([, row]) => {
              const item = filteredData[row]
              if (item) {
                setSelectedRecord(item)
              }
            }}
          />
        </div>

        {/* Inspection Quick Bar */}
        {selectedRecord && (
          <div className="p-3 bg-emerald-50/40 border-t border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500 font-semibold">Đang chọn:</span>
              <strong className="text-[#00572e]">{selectedRecord.ticketNo}</strong>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700">{selectedRecord.docNo}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-800">{selectedRecord.itemName}</span>
            </div>
            <Button
              size="small"
              type="primary"
              icon={<Eye size={12} />}
              onClick={() => setDetailModalVisible(true)}
              className="text-xs bg-[#00572e] hover:bg-[#006837] border-[#00572e] rounded shadow-xs"
            >
              Xem chi tiết bản ghi gốc
            </Button>
          </div>
        )}
      </div>

      {/* Modal Chi Tiết Bản Ghi Gốc */}
      <Modal
        title={
          <div className="font-bold text-[#00572e] text-sm flex items-center gap-2">
            <FileText size={16} className="text-[#006837]" />
            <span>Chi tiết bản ghi gốc & Phép phân loại phiếu</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setDetailModalVisible(false)}
            className="bg-[#00572e] hover:bg-[#006837] rounded"
          >
            Đóng
          </Button>
        ]}
        width={720}
      >
        {selectedRecord && (
          <div className="space-y-3 py-1 text-xs">
            {/* Header info */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Số phiếu
                </span>
                <span className="font-mono font-bold text-sm text-[#00572e]">
                  {selectedRecord.ticketNo}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Mã LSX</span>
                <span className="font-mono font-bold text-sm text-slate-800">
                  {selectedRecord.docNo}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Trạng thái
                </span>
                <span className="font-semibold text-slate-800">{selectedRecord.status}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Nguồn tạo
                </span>
                <span className="font-mono font-bold text-purple-900">
                  {selectedRecord.createdSource}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-4 gap-2 border border-slate-200 rounded p-3 bg-white text-center font-mono">
              <div>
                <span className="text-slate-500 text-[11px] block">Kế hoạch</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedRecord.planQty?.toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Thực tế</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedRecord.actualQty?.toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-emerald-700 text-[11px] block font-semibold">Đạt chuẩn</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {selectedRecord.passQty?.toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-rose-700 text-[11px] block font-semibold">Phế phẩm</span>
                <span className="font-bold text-rose-800 text-sm">
                  {selectedRecord.defectQty?.toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            {/* General Info */}
            <div className="border border-slate-200 rounded p-3 space-y-2 bg-white">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Tổ sản xuất:</span>
                  <strong className="text-slate-800">{selectedRecord.team}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Máy sản xuất:</span>
                  <strong className="text-slate-800">
                    {selectedRecord.machineName} ({selectedRecord.machineCode})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Mã & Tên hàng:</span>
                  <strong className="text-slate-800">
                    {selectedRecord.itemCode} - {selectedRecord.itemName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Đơn vị tính:</span>
                  <strong className="text-slate-800">{selectedRecord.unit}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Quản đốc / Phụ trách:</span>
                  <strong className="text-slate-800">
                    {selectedRecord.supervisor} ({selectedRecord.shift})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Ngày sản xuất:</span>
                  <strong className="text-slate-800 font-mono">{selectedRecord.prodDate}</strong>
                </div>
              </div>
            </div>

            {/* QLSX Runtime Inspection & Operation Details */}
            {(() => {
              const insp = getRuntimeInspection(selectedRecord)
              const inspBg =
                insp.type === 'SHORT'
                  ? 'bg-rose-50/70 border-rose-200'
                  : insp.type === 'LONG_VALID'
                    ? 'bg-teal-50/70 border-teal-200'
                    : insp.type === 'LONG_CHECK'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-emerald-50/70 border-emerald-200'

              return (
                <div className={`border rounded p-3 space-y-2.5 ${inspBg}`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200/80">
                    <span className="font-bold text-xs text-[#00572e] flex items-center gap-1.5">
                      <Clock size={13} className="text-[#006837]" />
                      Đối chiếu & Đánh giá Quản lý sản xuất:
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      Thời gian: {selectedRecord.runtimeHours} giờ ({(selectedRecord.runtimeHours * 60).toFixed(0)} phút)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Phân loại vận hành:</span>
                      <strong className="text-slate-800 font-mono">{insp.statusText}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Định mức đơn hàng:</span>
                      <strong className="text-slate-800 font-mono">
                        {selectedRecord.actualQty >= 8000 ? 'Đơn lớn (≥ 8.000 sp)' : 'Đơn tiêu chuẩn (< 8.000 sp)'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Xuất tự động:</span>
                      <strong className="text-slate-800">{selectedRecord.autoExportNote ? 'CÓ (Tự động sinh)' : 'KHÔNG'}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 bg-white/70 p-2 rounded text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Hướng dẫn hành động QLSX:</span>
                    <p className="text-slate-600 m-0 leading-relaxed italic">{insp.actionNote}</p>
                  </div>

                  {selectedRecord.note && (
                    <div className="pt-1.5 border-t border-slate-200/80 text-slate-700">
                      <span className="text-slate-500 text-[11px] block font-medium">
                        Ghi chú vận hành:
                      </span>
                      <span className="italic">{selectedRecord.note}</span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      {/* Modal Chú Giải Mã Màu */}
      <Modal
        title={
          <span className="font-bold text-sm text-[#00572e]">
            Chú giải mã màu & Ý nghĩa trạng thái Goldsun
          </span>
        }
        open={legendModalVisible}
        onCancel={() => setLegendModalVisible(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setLegendModalVisible(false)}
            className="bg-[#00572e] hover:bg-[#006837] rounded"
          >
            Đã hiểu
          </Button>
        ]}
        width={620}
      >
        <div className="space-y-3 py-1 text-xs text-slate-700">
          <Alert
            message="Quy chuẩn hiển thị báo cáo Goldsun"
            description="Báo cáo tích hợp cơ chế đối chiếu Quản lý sản xuất: không chỉ nhìn thời gian đơn thuần mà đối chiếu sản lượng thực tế của đơn hàng."
            type="success"
            showIcon
          />
          <table className="w-full text-left border border-slate-200 text-xs rounded overflow-hidden">
            <thead className="bg-emerald-50/70 border-b border-emerald-100 font-bold text-[#00572e]">
              <tr>
                <th className="p-2.5">Nhóm / Màu</th>
                <th className="p-2.5">Ý nghĩa phân loại & Đối chiếu QLSX</th>
                <th className="p-2.5">Quy chuẩn áp dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-semibold text-emerald-800">Xanh lá (Goldsun Green)</td>
                <td className="p-2.5">Chuẩn quy trình vận hành (5 phút – 12 tiếng), Tỷ lệ đạt ≥ 98%</td>
                <td className="p-2.5">Phiếu chuẩn MES</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-teal-800">Xanh mòng két (Teal)</td>
                <td className="p-2.5">Chạy &gt; 12 tiếng hợp lý do đơn hàng lớn (SL &ge; 8.000 sản phẩm)</td>
                <td className="p-2.5">Đơn lớn hợp lệ</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-amber-800">Vàng/Cam (Amber)</td>
                <td className="p-2.5">Chạy &gt; 12 tiếng đơn nhỏ (&lt; 8.000 sp) – Nghi vấn quên kết thúc phiếu</td>
                <td className="p-2.5">Cảnh báo đóng phiếu</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-rose-800">Đỏ (Rose/Red)</td>
                <td className="p-2.5">Thao tác quá nhanh (&lt; 5 phút) – Cảnh báo nhập sai / chốt vội cần chấn chỉnh</td>
                <td className="p-2.5">Cảnh báo chấn chỉnh</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-purple-800">Tím (Purple)</td>
                <td className="p-2.5">Phiếu tạo từ Bravo ERP / Ngoài hệ thống MES chuẩn</td>
                <td className="p-2.5">Nguồn ngoài MES</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Modal Nạp Tệp .xlsx */}
      <Modal
        title={
          <span className="font-bold text-sm text-[#00572e]">Nạp tệp dữ liệu thống kê (.xlsx)</span>
        }
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={520}
      >
        <div className="space-y-3 py-1 text-xs">
          <Upload.Dragger
            name="file"
            accept=".xlsx, .xls"
            showUploadList={false}
            customRequest={({ file, onSuccess }) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                try {
                  const data = new Uint8Array(e.target.result)
                  const workbook = XLSX.read(data, { type: 'array' })
                  const sheetName = workbook.SheetNames[0]
                  const worksheet = workbook.Sheets[sheetName]
                  const json = XLSX.utils.sheet_to_json(worksheet)
                  if (json && json.length > 0) {
                    setDataset(json)
                    setFileMetadata({
                      fileName: file.name,
                      uploadTime: new Date().toLocaleString('vi-VN'),
                      totalRows: json.length,
                      validRows: json.length,
                      errorRows: 0,
                      sourceSystem: 'Tệp tải lên người dùng'
                    })
                    message.success(`Đã nạp thành công ${json.length} dòng từ ${file.name}`)
                  } else {
                    message.warning('Tệp không có dữ liệu')
                  }
                  onSuccess('ok')
                  setUploadModalVisible(false)
                } catch (err) {
                  console.error(err)
                  message.error('Không thể đọc tệp Excel')
                }
              }
              reader.readAsArrayBuffer(file)
            }}
          >
            <p className="flex justify-center text-[#006837] py-2">
              <UploadIcon size={32} />
            </p>
            <p className="font-bold text-slate-800 text-xs">
              Nhấp hoặc kéo thả tệp .xlsx vào đây để nạp dữ liệu
            </p>
            <p className="text-slate-500 text-[11px]">
              Kiểm tra cấu trúc và tính toán báo cáo tự động
            </p>
          </Upload.Dragger>
        </div>
      </Modal>
    </div>
  )
}
