/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { captureReportScreenshot, downloadSingleChart } from '../../../../common/screenshotHelper'
import { usePlanImportColumns } from '../../../../registration/plan/columns/planImportColumns'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../../../utils/exportExcelUtils'

// Helper chuẩn hóa định dạng ngày YYYY-MM-DD
function getCleanDate(dateVal) {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let [m, d, y] = parts
      if (y.length === 2) y = `20${y}`
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  if (s.includes('-')) {
    const parts = s.split(' ')[0].split('-')
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      const [d, m, y] = parts
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return s.slice(0, 10)
}

// Helper tạo dữ liệu mẫu chuẩn 276 lệnh điều phối GS5 Quế Võ
export function generateDefaultQuevoGs5PlanData() {
  const pics = [
    'Vũ Đình Trọng',
    'Phạm Quỳnh Nga',
    'Hoàng Minh Tuấn',
    'Ngô Quốc Bảo',
    'Đặng Thúy Hằng'
  ]
  const machines = [
    { code: 'QV-OFFSET-01', name: 'Máy In Offset Manroland 700', team: 'Tổ In Offset GS5' },
    { code: 'QV-OFFSET-02', name: 'Máy In Offset Heidelberg CX-104', team: 'Tổ In Offset GS5' },
    { code: 'QV-FLEXO-01', name: 'Máy In Flexo 4 Màu Taiyo', team: 'Tổ In Flexo GS5' },
    { code: 'QV-BOI-01', name: 'Máy Bồi Tự Động Sakurai 1450', team: 'Tổ Bồi/Bế GS5' },
    { code: 'QV-BE-01', name: 'Máy Bế Tự Động Bobst 106 E', team: 'Tổ Bồi/Bế GS5' },
    { code: 'QV-BE-02', name: 'Máy Bế Tự Động Sanwa TRP-1060', team: 'Tổ Bồi/Bế GS5' },
    { code: 'QV-DAN-01', name: 'Máy Dán Hộp Tự Động MegaFold 1050', team: 'Tổ Dán & Đóng Gói GS5' },
    { code: 'QV-SONG-01', name: 'Dây Chuyền Tạo Sóng Carton 2.8m', team: 'Tổ Máy Sóng GS5' }
  ]

  const items = [
    {
      code: 'QV-BOX-SAMSUNG-OLED',
      name: 'Hộp cao cấp TV Samsung OLED 65 inch',
      customer: 'Samsung Electronics VN (SEVT)'
    },
    {
      code: 'QV-PK-CANON-LBP',
      name: 'Vỏ hộp máy in Canon Laser LBP2900',
      customer: 'Canon Electronics Vietnam'
    },
    {
      code: 'QV-CTN-AMKOR-SEMI',
      name: 'Thùng carton phòng sạch đóng chip Amkor',
      customer: 'Amkor Technology Vietnam'
    },
    {
      code: 'QV-LBL-HONDA-PARTS',
      name: 'Nhãn phụ tùng xe máy Honda VN',
      customer: 'Honda Vietnam Co., Ltd'
    },
    {
      code: 'QV-BOX-VINFAST-EV',
      name: 'Hộp phụ tùng pin sạc xe điện VinFast',
      customer: 'VinFast Auto Manufacturing'
    },
    {
      code: 'QV-BAG-EXPORT-KRAFT',
      name: 'Túi Kraft xuất khẩu thị trường EU',
      customer: 'IKEA Supply AG Vietnam'
    }
  ]

  const list = []
  let idCounter = 1

  const makeItems = (count, dpStatusCode, dpStatusText, defaultTimeStatus, defaultCapaStatus) => {
    for (let i = 0; i < count; i++) {
      const day = 11 + (i % 20)
      const planDay = Math.min(
        30,
        day + (dpStatusCode === 'SX_SAI_NGAY' ? (i % 2 === 0 ? -2 : 3) : 0)
      )
      const planDate = `2026-09-${String(planDay).padStart(2, '0')}`
      const actualDate = `2026-09-${String(day).padStart(2, '0')}`

      const pic = pics[i % pics.length]
      const machine = machines[i % machines.length]
      const prod = items[i % items.length]

      const planQty = ((Math.floor(i * 37) % 50) + 5) * 1000
      let actualQty = planQty
      if (dpStatusCode === 'TRUOT_KH') {
        actualQty = Math.floor(planQty * (0.6 + (i % 30) / 100))
      } else if (dpStatusCode === 'SX_SAI_NGAY') {
        actualQty = Math.floor(planQty * (0.9 + (i % 15) / 100))
      } else if (dpStatusCode === 'KHOP_JOB') {
        actualQty = planQty
      }

      let timeStatus = defaultTimeStatus
      if (i % 4 === 0) timeStatus = 'Chậm hơn ĐM'
      else if (i % 4 === 1) timeStatus = 'Nhanh hơn ĐM'
      else if (i % 4 === 2) timeStatus = 'Đúng ĐM'
      else timeStatus = 'Chưa có dữ liệu'

      let capaStatus = defaultCapaStatus
      if (i % 3 === 0) capaStatus = 'Nhanh hơn ĐM'
      else if (i % 3 === 1) capaStatus = 'Chậm hơn ĐM'
      else capaStatus = 'Trống / Đúng capa'

      const operationNo = `QV2609-${String(3000 + idCounter)}(${String(100 + (idCounter % 900))})`
      const routingDocNo = `SO-QV05-${String(900 + (idCounter % 200))}`
      const prodTime = dpStatusCode === 'TRUOT_KH' ? 10.5 : 8
      const stdCapa = Math.round(planQty / 8)
      const actCapa = Math.round(actualQty / prodTime)

      list.push({
        id: `QV-PL-${String(idCounter).padStart(4, '0')}`,
        // Chuẩn hóa 100% trường dữ liệu theo Schema Khung đăng ký KHSX
        PicDp: pic,
        OperationNo: operationNo,
        OpDate: actualDate,
        RoutingDocNo: routingDocNo,
        RoutingDocDate: planDate,
        ItemCode: prod.code,
        ItemName: prod.name,
        OperationName: 'In / Bế / Dán hoàn thiện GS5',
        OpTypeName: 'Sản xuất chính',
        MachineName: machine.name,
        Unit: 'Chiếc',
        TargetPassQty: planQty,
        TargetProdQty: planQty,
        StatPassQty: actualQty,
        StartTime: '08:00',
        EndTime: '17:00',
        StandardProdTime: 8,
        ActualProdTime: prodTime,
        StandardCapa: stdCapa,
        ActualCapa: actCapa,
        StatusDpSx: dpStatusText,
        TimeStatus: timeStatus,
        CapaStatus: capaStatus,

        // Legacy / Normalized fields
        docNo: operationNo,
        orderNo: routingDocNo,
        planNo: `KH-QV-2026-W39-${String(idCounter).padStart(3, '0')}`,
        pic,
        machineCode: machine.code,
        machineName: machine.name,
        teamName: machine.team,
        itemCode: prod.code,
        itemName: prod.name,
        customer: prod.customer,
        planDate,
        actualDate,
        planQty,
        actualQty,
        dpStatusCode,
        dpStatusText,
        timeStatus,
        timeStatusText: timeStatus,
        capaStatus,
        capaStatusText: capaStatus,
        note:
          dpStatusCode === 'SX_SAI_NGAY'
            ? `Sản xuất lệch ${Math.abs(planDay - day)} ngày so với KHSX`
            : dpStatusCode === 'TRUOT_KH'
              ? 'Trượt tiến độ do thiếu phôi vật tư'
              : 'Lệnh điều phối hoàn thành đúng kế hoạch'
      })
      idCounter++
    }
  }

  makeItems(141, 'SX_SAI_NGAY', 'SX sai ngày KH', 'Chậm hơn ĐM', 'Chậm hơn ĐM')
  makeItems(103, 'TRUOT_KH', 'Trượt KH', 'Chậm hơn ĐM', 'Nhanh hơn ĐM')
  makeItems(21, 'KHOP_SL', 'Khớp số lượng', 'Đúng ĐM', 'Trống / Đúng capa')
  makeItems(11, 'KHOP_JOB', 'Khớp job', 'Đúng ĐM', 'Trống / Đúng capa')

  return list
}

export function useQuevoGs5PlanLogic({
  dataset = [],
  plantKey = 'quevo_gs5',
  plantName = 'Nhà máy GS5 Quế Võ',
  maskText = (t) => t
}) {
  // Bộ lọc dữ liệu (Chỉ giữ Ngày lệnh thao tác và PIC Điều phối)
  const [dateRange, setDateRange] = useState(['2026-09-11', '2026-09-30'])
  const [selectedPic, setSelectedPic] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditModalCategory, setAuditModalCategory] = useState('ALL')

  // Chart Modes (Cho phép chuyển đổi đa dạng giữa Donut, Gauge, Bar, Composed)
  const [dpChartMode, setDpChartMode] = useState('donut') // 'donut' | 'bar' | 'radial'
  const [timeCapaMode, setTimeCapaMode] = useState('donut') // 'donut' | 'bar'
  const [picChartMode, setPicChartMode] = useState('volume') // 'volume' | 'rate' | 'pass'

  // Screenshot & Chart Refs
  const [isCapturing, setIsCapturing] = useState(false)
  const reportRootRef = useRef(null)
  const chart1Ref = useRef(null)
  const chart2Ref = useRef(null)
  const chart3Ref = useRef(null)
  const chart4Ref = useRef(null)
  const chart5Ref = useRef(null)

  // Glide Data Grid State
  const [rowHeight, setRowHeight] = useState(30)
  const [colWidths, setColWidths] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: 'docNo', direction: 'asc' })
  const gridRef = useRef(null)

  // Danh sách rawData từ prop
  const rawData = useMemo(() => {
    if (Array.isArray(dataset)) return dataset
    return []
  }, [dataset])

  // Tự động đồng bộ dateRange theo min/max của "Ngày lệnh thao tác" (actualDate / OpDate) trong dataset
  useEffect(() => {
    if (!rawData || rawData.length === 0) return
    let minD = ''
    let maxD = ''
    rawData.forEach((item) => {
      const d = getCleanDate(item.actualDate || item.opDate || item.OpDate || item.prodDate)
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        if (!minD || d < minD) minD = d
        if (!maxD || d > maxD) maxD = d
      }
    })
    if (minD && maxD) {
      setDateRange([minD, maxD])
    }
  }, [rawData])

  // Filter options
  const filterOptions = useMemo(() => {
    const pics = new Set()
    const machines = new Map()

    rawData.forEach((item) => {
      const p = item.PicDp || item.pic || item.Pic
      if (p) pics.add(p)
      const mCode = item.MachineCode || item.machineCode
      const mName = item.MachineName || item.machineName || mCode
      if (mCode || mName) {
        machines.set(mCode || mName, mName)
      }
    })

    return {
      pics: Array.from(pics).sort(),
      machines: Array.from(machines.entries()).map(([code, name]) => ({ code, name }))
    }
  }, [rawData])

  // Trạng thái có đang lọc khác mặc định hay không
  const hasActiveFilters = useMemo(() => {
    return selectedPic !== 'ALL'
  }, [selectedPic])

  // Đặt lại bộ lọc
  const handleResetFilters = useCallback(() => {
    setSelectedPic('ALL')
  }, [])

  // Dữ liệu sau khi áp dụng toàn bộ bộ lọc trên Client-Side (Lọc theo PIC ĐP và Search)
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // 1. Lọc PIC Điều phối
      const itemPic = item.PicDp || item.pic || item.Pic || ''
      if (selectedPic !== 'ALL' && itemPic !== selectedPic) return false

      // 2. Tìm kiếm Search Text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.docNo && String(item.docNo).toLowerCase().includes(q)) ||
          (item.orderNo && String(item.orderNo).toLowerCase().includes(q)) ||
          (item.RoutingDocNo && String(item.RoutingDocNo).toLowerCase().includes(q)) ||
          (item.planNo && String(item.planNo).toLowerCase().includes(q)) ||
          (item.OperationNo && String(item.OperationNo).toLowerCase().includes(q)) ||
          (item.itemCode && String(item.itemCode).toLowerCase().includes(q)) ||
          (item.ItemCode && String(item.ItemCode).toLowerCase().includes(q)) ||
          (item.itemName && String(item.itemName).toLowerCase().includes(q)) ||
          (item.ItemName && String(item.ItemName).toLowerCase().includes(q)) ||
          (item.OperationName && String(item.OperationName).toLowerCase().includes(q)) ||
          (item.OpTypeName && String(item.OpTypeName).toLowerCase().includes(q)) ||
          (item.customer && String(item.customer).toLowerCase().includes(q)) ||
          (item.MachineName && String(item.MachineName).toLowerCase().includes(q)) ||
          (itemPic && itemPic.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [rawData, selectedPic, searchQuery])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData
    return [...filteredData].sort((a, b) => {
      let valA = a[sortConfig.key] ?? ''
      let valB = b[sortConfig.key] ?? ''
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
      }
      return sortConfig.direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
  }, [filteredData, sortConfig])

  // 2. KPI TỔNG QUAN
  const kpiMetrics = useMemo(() => {
    const totalOrders = filteredData.length
    let sxSaiNgayCount = 0
    let truotKhCount = 0
    let khopSlCount = 0
    let khopJobCount = 0

    let totalPlanQty = 0
    let totalActualQty = 0

    filteredData.forEach((item) => {
      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || '')

      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) sxSaiNgayCount++
      else if (st === 'TRUOT_KH' || text.includes('Trượt')) truotKhCount++
      else if (st === 'KHOP_SL' || text.includes('Khớp số lượng')) khopSlCount++
      else if (st === 'KHOP_JOB' || text.includes('Khớp job')) khopJobCount++

      totalPlanQty += Number(item.planQty) || 0
      totalActualQty += Number(item.actualQty) || 0
    })

    const calcRate = (cnt) => (totalOrders > 0 ? ((cnt / totalOrders) * 100).toFixed(1) : '0.0')

    return {
      totalOrders,
      sxSaiNgayCount,
      sxSaiNgayRate: calcRate(sxSaiNgayCount),
      truotKhCount,
      truotKhRate: calcRate(truotKhCount),
      khopSlCount,
      khopSlRate: calcRate(khopSlCount),
      khopJobCount,
      khopJobRate: calcRate(khopJobCount),
      totalPlanQty,
      totalActualQty,
      overallProgress:
        totalPlanQty > 0 ? ((totalActualQty / totalPlanQty) * 100).toFixed(1) : '100.0'
    }
  }, [filteredData])

  // 3. TRẠNG THÁI ĐP - SX (Biểu đồ & Khối phân loại)
  const dpStatusBreakdown = useMemo(() => {
    return [
      {
        name: 'SX sai ngày KH',
        count: kpiMetrics.sxSaiNgayCount,
        rate: Number(kpiMetrics.sxSaiNgayRate),
        color: '#ea580c',
        tag: 'Cảnh báo lệch ngày'
      },
      {
        name: 'Trượt KH',
        count: kpiMetrics.truotKhCount,
        rate: Number(kpiMetrics.truotKhRate),
        color: '#dc2626',
        tag: 'Cảnh báo trượt'
      },
      {
        name: 'Khớp số lượng',
        count: kpiMetrics.khopSlCount,
        rate: Number(kpiMetrics.khopSlRate),
        color: '#01411b',
        tag: 'Đạt chuẩn SL'
      },
      {
        name: 'Khớp job',
        count: kpiMetrics.khopJobCount,
        rate: Number(kpiMetrics.khopJobRate),
        color: '#059669',
        tag: 'Đạt chuẩn job'
      }
    ]
  }, [kpiMetrics])

  // 4. TRẠNG THÁI THỜI GIAN (So sánh thời điểm sản xuất với ĐM)
  const timeStatusBreakdown = useMemo(() => {
    let cham = 0
    let nhanh = 0
    let dung = 0
    let noData = 0

    filteredData.forEach((item) => {
      const t = String(item.timeStatus || item.timeStatusText || '')
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
  }, [filteredData])

  // 5. TRẠNG THÁI CAPA (Đánh giá theo năng lực/capacity)
  const capaStatusBreakdown = useMemo(() => {
    let nhanh = 0
    let cham = 0
    let trong = 0

    filteredData.forEach((item) => {
      const c = String(item.capaStatus || item.capaStatusText || '')
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
  }, [filteredData])

  // 6. THEO PIC ĐIỀU PHỐI (Gom nhóm và phân tích hiệu quả từng PIC)
  const picBreakdown = useMemo(() => {
    const map = new Map()

    filteredData.forEach((item) => {
      const p = item.pic || 'Chưa phân công'
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
      const text = String(item.dpStatusText || '')
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) rec.sxSaiNgay++
      else if (st === 'TRUOT_KH' || text.includes('Trượt')) rec.truotKh++
      else if (st === 'KHOP_SL' || text.includes('Khớp số lượng')) rec.khopSl++
      else if (st === 'KHOP_JOB' || text.includes('Khớp job')) rec.khopJob++

      rec.totalPlanQty += Number(item.planQty) || 0
      rec.totalActualQty += Number(item.actualQty) || 0
    })

    return Array.from(map.values())
      .map((row) => {
        const total = row.totalOrders || 1
        const khopTotal = (row.khopSl || 0) + (row.khopJob || 0)
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
  }, [filteredData])

  // 7. XU HƯỚNG ĐIỀU PHỐI THEO NGÀY (Daily Trend Timeline)
  const dailyTrendData = useMemo(() => {
    const map = new Map()

    filteredData.forEach((item) => {
      const d = item.actualDate || item.planDate || '2026-09-29'
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          displayDate: d.length >= 10 ? d.slice(5) : d,
          total: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          khopSl: 0,
          khopJob: 0
        })
      }
      const rec = map.get(d)
      rec.total++

      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || '')
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) rec.sxSaiNgay++
      else if (st === 'TRUOT_KH' || text.includes('Trượt')) rec.truotKh++
      else if (st === 'KHOP_SL' || text.includes('Khớp số lượng')) rec.khopSl++
      else if (st === 'KHOP_JOB' || text.includes('Khớp job')) rec.khopJob++
    })

    return Array.from(map.values())
      .map((item) => {
        const pass = item.khopSl + item.khopJob
        return {
          ...item,
          passRate: item.total > 0 ? Number(((pass / item.total) * 100).toFixed(1)) : 0
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredData])

  // 8. PHÂN TÍCH THEO TỔ / NHÓM CÔNG ĐOẠN SẢN XUẤT (Shopfloor Workload & Bottleneck)
  const teamBreakdown = useMemo(() => {
    const map = new Map()

    filteredData.forEach((item) => {
      const t = item.teamName || item.opTypeName || 'Tổ sản xuất chung'
      if (!map.has(t)) {
        map.set(t, {
          teamName: t,
          totalOrders: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          khopSl: 0,
          khopJob: 0,
          totalPlanQty: 0,
          totalActualQty: 0
        })
      }
      const rec = map.get(t)
      rec.totalOrders++
      const st = item.dpStatusCode || item.dpStatus
      const text = String(item.dpStatusText || '')
      if (st === 'SX_SAI_NGAY' || text.includes('sai ngày')) rec.sxSaiNgay++
      else if (st === 'TRUOT_KH' || text.includes('Trượt')) rec.truotKh++
      else if (st === 'KHOP_SL' || text.includes('Khớp số lượng')) rec.khopSl++
      else if (st === 'KHOP_JOB' || text.includes('Khớp job')) rec.khopJob++

      rec.totalPlanQty += Number(item.planQty) || 0
      rec.totalActualQty += Number(item.actualQty) || 0
    })

    return Array.from(map.values())
      .map((row) => {
        const total = row.totalOrders || 1
        const passCount = row.khopSl + row.khopJob
        return {
          ...row,
          sxSaiNgayRate: Number(((row.sxSaiNgay / total) * 100).toFixed(1)),
          truotKhRate: Number(((row.truotKh / total) * 100).toFixed(1)),
          passRate: Number(((passCount / total) * 100).toFixed(1)),
          fulfillmentRate:
            row.totalPlanQty > 0
              ? Number(((row.totalActualQty / row.totalPlanQty) * 100).toFixed(1))
              : 100
        }
      })
      .sort((a, b) => b.totalOrders - a.totalOrders)
  }, [filteredData])

  // 9. CHỈ SỐ CHUYÊN SÂU ĐIỀU HÀNH KHSX (Advanced Executive Metrics)
  const advancedPlanMetrics = useMemo(() => {
    const total = filteredData.length || 1
    let dungOrNhanhTime = 0
    let dungOrNhanhCapa = 0
    let totalDriftDays = 0
    let driftCount = 0

    filteredData.forEach((item) => {
      const timeStr = String(item.timeStatus || item.timeStatusText || '')
      if (timeStr.includes('Đúng') || timeStr.includes('Nhanh')) dungOrNhanhTime++

      const capaStr = String(item.capaStatus || item.capaStatusText || '')
      if (capaStr.includes('Nhanh') || capaStr.includes('Đúng') || capaStr.includes('Trống'))
        dungOrNhanhCapa++

      if (item.planDate && item.actualDate) {
        const pDate = new Date(item.planDate).getTime()
        const aDate = new Date(item.actualDate).getTime()
        if (!isNaN(pDate) && !isNaN(aDate)) {
          const diffDays = Math.round((aDate - pDate) / (1000 * 60 * 60 * 24))
          totalDriftDays += Math.abs(diffDays)
          driftCount++
        }
      }
    })

    const passOrders = kpiMetrics.khopSlCount + kpiMetrics.khopJobCount
    const scheduleAdherenceRate = total > 0 ? Number(((passOrders / total) * 100).toFixed(1)) : 0
    const timeComplianceRate = total > 0 ? Number(((dungOrNhanhTime / total) * 100).toFixed(1)) : 0
    const capaComplianceRate = total > 0 ? Number(((dungOrNhanhCapa / total) * 100).toFixed(1)) : 0
    const avgDriftDays = driftCount > 0 ? Number((totalDriftDays / driftCount).toFixed(1)) : 0

    return {
      scheduleAdherenceRate,
      timeComplianceRate,
      capaComplianceRate,
      avgDriftDays,
      totalPlanQty: kpiMetrics.totalPlanQty,
      totalActualQty: kpiMetrics.totalActualQty,
      qtyFulfillmentRate:
        kpiMetrics.totalPlanQty > 0
          ? Number(((kpiMetrics.totalActualQty / kpiMetrics.totalPlanQty) * 100).toFixed(1))
          : 0
    }
  }, [filteredData, kpiMetrics])

  // Columns Configuration cho Glide Data Grid
  const onColumnResize = useCallback((column, newSize) => {
    setColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const columns = useMemo(() => {
    return [
      { id: 'stt', title: 'STT', width: colWidths['stt'] || 45 },
      { id: 'docNo', title: 'Số LSX', width: colWidths['docNo'] || 140 },
      { id: 'orderNo', title: 'Đơn hàng (SO)', width: colWidths['orderNo'] || 135 },
      { id: 'dpStatus', title: 'Trạng thái ĐP-SX', width: colWidths['dpStatus'] || 155 },
      { id: 'timeStatus', title: 'Trạng thái Thời gian', width: colWidths['timeStatus'] || 145 },
      { id: 'capaStatus', title: 'Trạng thái Capa', width: colWidths['capaStatus'] || 135 },
      { id: 'pic', title: 'PIC Điều phối', width: colWidths['pic'] || 140 },
      { id: 'planDate', title: 'Ngày KH', width: colWidths['planDate'] || 95 },
      { id: 'actualDate', title: 'Ngày thực tế', width: colWidths['actualDate'] || 95 },
      { id: 'planQty', title: 'SL Kế hoạch', width: colWidths['planQty'] || 105 },
      { id: 'actualQty', title: 'SL Thực tế', width: colWidths['actualQty'] || 105 },
      { id: 'completionRate', title: 'Tỷ lệ HT', width: colWidths['completionRate'] || 80 },
      { id: 'machineCode', title: 'Mã máy', width: colWidths['machineCode'] || 100 },
      { id: 'machineName', title: 'Tên máy', width: colWidths['machineName'] || 160 },
      { id: 'itemCode', title: 'Mã sản phẩm', width: colWidths['itemCode'] || 130 },
      { id: 'itemName', title: 'Tên sản phẩm', width: colWidths['itemName'] || 230 },
      { id: 'customer', title: 'Khách hàng', width: colWidths['customer'] || 180 },
      { id: 'note', title: 'Ghi chú điều phối', width: colWidths['note'] || 200 }
    ]
  }, [colWidths])

  // 10. DETAIL TABLE (CHI TIẾT LỆNH ĐIỀU PHỐI KHSX THEO TIÊU CHUẨN ĐĂNG KÝ BÁO CÁO)
  const rawPlanCols = usePlanImportColumns()
  const [detailColWidths, setDetailColWidths] = useState({})
  const [detailSortConfig, setDetailSortConfig] = useState({ key: 'OperationNo', direction: 'asc' })
  const [detailSearchText, setDetailSearchText] = useState('')
  const [showDetailSearch, setShowDetailSearch] = useState(false)
  const detailGridRef = useRef(null)

  // Filtered & Sorted Detail List for Detail Table
  const displayDetailList = useMemo(() => {
    let list = [...filteredData]
    if (detailSearchText.trim()) {
      const q = detailSearchText.toLowerCase().trim()
      list = list.filter((item) => {
        return Object.values(item).some((val) =>
          String(val ?? '')
            .toLowerCase()
            .includes(q)
        )
      })
    }

    const { key, direction } = detailSortConfig
    if (key) {
      list.sort((a, b) => {
        let valA = a[key] ?? a[key.charAt(0).toLowerCase() + key.slice(1)] ?? ''
        let valB = b[key] ?? b[key.charAt(0).toLowerCase() + key.slice(1)] ?? ''
        if (typeof valA === 'number' || typeof valB === 'number') {
          const numA = Number(valA) || 0
          const numB = Number(valB) || 0
          return direction === 'asc' ? numA - numB : numB - numA
        }
        return direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      })
    }
    return list
  }, [filteredData, detailSearchText, detailSortConfig])

  // Columns for Glide Data Grid matching 100% Plan Import Registration schema
  const detailGridCols = useMemo(() => {
    return (rawPlanCols || [])
      .filter((c) => c.id && c.id !== 'WorkingTag' && !['RegCode', 'FactoryName', 'ApplyDate'].includes(c.id))
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
          width: detailColWidths[col.id] || col.width || 135
        }
      })
  }, [rawPlanCols, detailColWidths, detailSortConfig])

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

  const onDetailColumnResize = useCallback((column, newSize) => {
    setDetailColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

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

  // Copy table TSV
  const handleCopyTable = (dataToCopy, headers, keys) => {
    try {
      const headerRow = headers.join('\t')
      const bodyRows = dataToCopy
        .map((item) =>
          keys
            .map((k) => {
              const v = item[k] ?? item[k.charAt(0).toLowerCase() + k.slice(1)] ?? ''
              return typeof v === 'number' ? v : v || ''
            })
            .join('\t')
        )
        .join('\n')
      const tsv = `${headerRow}\n${bodyRows}`
      navigator.clipboard.writeText(tsv)
      alert('Đã sao chép dữ liệu bảng vào Clipboard (định dạng Excel/TSV)')
    } catch (err) {
      console.error('Copy error:', err)
    }
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

  const executeExportPlanExcel = useCallback(
    async ({ fileName, saveDirectory, overwriteExisting, includeHeaders, exportableCols }) => {
      const validCols = exportableCols || rawPlanCols.filter((c) => c.id && c.id !== 'WorkingTag')
      const plantDisplayName = plantKey === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ 1B' : 'NHÀ MÁY GS HÀ NỘI'
      const reportTitle = `BÁO CÁO LỆNH THEO TRẠNG THÁI ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT - ${plantDisplayName}`
      const dateStr = dateRange?.[0] && dateRange?.[1] ? `${dateRange[0]} đến ${dateRange[1]}` : ''
      const filterSummary = `Nhà máy: ${plantDisplayName}${dateStr ? ` | Ngày: ${dateStr}` : ''}`

      const wb = generateExcelWorkbook({
        data: displayDetailList,
        columns: validCols,
        sheetName: 'ChiTiet_DieuPhoi_KHSX',
        reportTitle,
        filterInfo: filterSummary,
        includeHeaders: includeHeaders !== false,
        formatDateFn: getCleanDate
      })

      await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
    },
    [displayDetailList, rawPlanCols, plantKey, dateRange]
  )

  const handleExportDetailExcel = handleOpenExportModal
  const handleExportExcel = handleOpenExportModal

  // Tải ảnh biểu đồ đơn lẻ
  const handleDownloadSingleChart = async (targetRef, chartName) => {
    await downloadSingleChart(targetRef, chartName)
  }

  // Chụp ảnh toàn bộ báo cáo chuyên nghiệp
  const handleCaptureScreenshot = async () => {
    const el = reportRootRef.current
    if (!el) return
    const dateStr = new Date().toISOString().slice(0, 10)
    await captureReportScreenshot({
      targetEl: el,
      fileName: `BaoCao_DieuPhoi_KHSX_${plantKey}_${dateStr}`,
      onStart: () => setIsCapturing(true),
      onEnd: () => setIsCapturing(false),
      onError: (err) => alert('Không thể xuất ảnh: ' + (err?.message || 'Lỗi chụp màn hình'))
    })
  }

  return {
    // Filters & State
    dateRange,
    setDateRange,
    selectedPic,
    setSelectedPic,
    searchQuery,
    setSearchQuery,
    handleResetFilters,
    hasActiveFilters,
    filterOptions,

    // Modal
    showFormulaModal,
    setShowFormulaModal,
    showAuditModal,
    setShowAuditModal,
    auditModalCategory,
    setAuditModalCategory,

    // Chart Modes & View Controls
    dpChartMode,
    setDpChartMode,
    timeCapaMode,
    setTimeCapaMode,
    picChartMode,
    setPicChartMode,

    // Data & Metrics
    rawData,
    filteredData,
    sortedData,
    displayDetailList,
    kpiMetrics,
    dpStatusBreakdown,
    timeStatusBreakdown,
    capaStatusBreakdown,
    picBreakdown,
    dailyTrendData,
    teamBreakdown,
    advancedPlanMetrics,

    // Grid & Detail Table
    gridRef,
    detailGridRef,
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    chart4Ref,
    chart5Ref,
    isCapturing,

    // Aliases and detail table bindings
    columns: detailGridCols,
    getCellContent: getDetailCellContent,
    onColumnResize: onDetailColumnResize,
    detailGridCols,
    getDetailCellContent,
    onDetailHeaderClicked,
    onDetailColumnResize,
    detailSortConfig,
    setDetailSortConfig,
    detailSearchText,
    setDetailSearchText,
    showDetailSearch,
    setShowDetailSearch,

    // Actions
    handleCopyTable,
    handleExportDetailExcel,
    handleExportExcel,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportPlanExcel,
    handleDownloadSingleChart,
    handleCaptureScreenshot
  }
}
