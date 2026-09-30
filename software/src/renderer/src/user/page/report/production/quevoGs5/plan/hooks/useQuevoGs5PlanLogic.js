/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { captureReportScreenshot, downloadSingleChart } from '../../../../common/screenshotHelper'

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

      list.push({
        id: `QV-PL-${String(idCounter).padStart(4, '0')}`,
        docNo: `QV2609-${String(3000 + idCounter)}(${String(100 + (idCounter % 900))})`,
        orderNo: `SO-QV05-${String(900 + (idCounter % 200))}`,
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
  const [picChartMode, setPicChartMode] = useState('composed') // 'composed' | 'stacked' | 'bar'

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
      if (item.pic) pics.add(item.pic)
      if (item.machineCode) {
        machines.set(item.machineCode, item.machineName || item.machineCode)
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
      if (selectedPic !== 'ALL' && item.pic !== selectedPic) return false

      // 2. Tìm kiếm Search Text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.docNo && item.docNo.toLowerCase().includes(q)) ||
          (item.orderNo && item.orderNo.toLowerCase().includes(q)) ||
          (item.planNo && item.planNo.toLowerCase().includes(q)) ||
          (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
          (item.itemName && item.itemName.toLowerCase().includes(q)) ||
          (item.customer && item.customer.toLowerCase().includes(q)) ||
          (item.machineCode && item.machineCode.toLowerCase().includes(q)) ||
          (item.machineName && item.machineName.toLowerCase().includes(q)) ||
          (item.pic && item.pic.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [rawData, dateRange, selectedPic, searchQuery])

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
        color: '#059669',
        tag: 'Đạt chuẩn SL'
      },
      {
        name: 'Khớp job',
        count: kpiMetrics.khopJobCount,
        rate: Number(kpiMetrics.khopJobRate),
        color: '#0284c7',
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
        color: '#059669'
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
        color: '#059669'
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
        return {
          ...row,
          sxSaiNgayRate: Number(((row.sxSaiNgay / total) * 100).toFixed(1)),
          truotKhRate: Number(((row.truotKh / total) * 100).toFixed(1)),
          khopSlRate: Number(((row.khopSl / total) * 100).toFixed(1)),
          khopJobRate: Number(((row.khopJob / total) * 100).toFixed(1)),
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

  // Cell Content Callback cho Glide Data Grid
  const getCellContent = useCallback(
    ([col, row]) => {
      const item = sortedData[row]
      if (!item) return { kind: GridCellKind.Loading, allowOverlay: false }

      const colId = columns[col]?.id

      switch (colId) {
        case 'stt':
          return {
            kind: GridCellKind.Number,
            data: row + 1,
            displayData: String(row + 1),
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#64748b' }
          }
        case 'docNo':
          return {
            kind: GridCellKind.Text,
            data: item.docNo || item.orderNo || item.planNo || '',
            displayData: item.docNo || item.orderNo || item.planNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
          }
        case 'orderNo':
          return {
            kind: GridCellKind.Text,
            data: item.orderNo || '',
            displayData: item.orderNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'dpStatus': {
          const txt = item.dpStatusText || item.dpStatus || 'Khớp số lượng'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'timeStatus': {
          const txt = item.timeStatusText || item.timeStatus || 'Đúng ĐM'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'capaStatus': {
          const txt = item.capaStatusText || item.capaStatus || 'Đúng capa'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'pic':
          return {
            kind: GridCellKind.Text,
            data: item.pic || 'Chưa phân công',
            displayData: item.pic || 'Chưa phân công',
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '500 12px' }
          }
        case 'planDate':
          return {
            kind: GridCellKind.Text,
            data: item.planDate || '',
            displayData: item.planDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#334155' }
          }
        case 'actualDate':
          return {
            kind: GridCellKind.Text,
            data: item.actualDate || item.prodDate || '',
            displayData: item.actualDate || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#334155' }
          }
        case 'planQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.planQty) || 0,
            displayData: (Number(item.planQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#334155' }
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.actualQty) || 0,
            displayData: (Number(item.actualQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
          }
        case 'completionRate': {
          const p = Number(item.planQty) || 0
          const a = Number(item.actualQty) || 0
          const rate = p > 0 ? ((a / p) * 100).toFixed(1) : '100.0'
          return {
            kind: GridCellKind.Text,
            data: `${rate}%`,
            displayData: `${rate}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: {
              textDark: '#0f172a',
              baseFontStyle: '600 12px'
            }
          }
        }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName || '',
            displayData: item.machineName || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'itemCode':
          return {
            kind: GridCellKind.Text,
            data: item.itemCode || '',
            displayData: item.itemCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#475569' }
          }
        case 'itemName':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.itemName || ''),
            displayData: maskText(item.itemName || ''),
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '400 12px' }
          }
        case 'customer':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.customer || ''),
            displayData: maskText(item.customer || ''),
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'note':
          return {
            kind: GridCellKind.Text,
            data: item.note || item.remark || '',
            displayData: item.note || item.remark || '',
            allowOverlay: false,
            themeOverride: { textDark: '#64748b' }
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [sortedData, columns, maskText]
  )

  // Xuất file Excel
  const handleExportExcel = () => {
    if (!sortedData.length) return
    const exportRows = sortedData.map((item, idx) => ({
      STT: idx + 1,
      'Số LSX': item.docNo || item.planNo || '',
      'Số Đơn Hàng (SO)': item.orderNo || '',
      'Trạng thái ĐP - SX': item.dpStatusText || item.dpStatus || '',
      'Trạng thái Thời gian': item.timeStatusText || item.timeStatus || '',
      'Trạng thái Capa': item.capaStatusText || item.capaStatus || '',
      'PIC Điều phối': item.pic || '',
      'Ngày kế hoạch': item.planDate || '',
      'Ngày thực tế': item.actualDate || item.prodDate || '',
      'SL Kế hoạch': Number(item.planQty) || 0,
      'SL Thực tế': Number(item.actualQty) || 0,
      'Tỷ lệ hoàn thành (%)':
        item.planQty > 0 ? Number(((item.actualQty / item.planQty) * 100).toFixed(1)) : 100,
      'Mã máy': item.machineCode || '',
      'Tên máy': item.machineName || '',
      'Mã sản phẩm': item.itemCode || '',
      'Tên sản phẩm': item.itemName || '',
      'Khách hàng': item.customer || '',
      'Ghi chú': item.note || item.remark || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCao_DieuPhoi_KHSX')
    XLSX.writeFile(
      wb,
      `BaoCao_DieuPhoi_KHSX_${plantKey}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

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
    kpiMetrics,
    dpStatusBreakdown,
    timeStatusBreakdown,
    capaStatusBreakdown,
    picBreakdown,
    dailyTrendData,
    teamBreakdown,
    advancedPlanMetrics,

    // Grid & Refs
    gridRef,
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    chart4Ref,
    chart5Ref,
    isCapturing,
    columns,
    getCellContent,
    onColumnResize,
    rowHeight,
    setRowHeight,
    sortConfig,
    setSortConfig,

    // Actions
    handleExportExcel,
    handleDownloadSingleChart,
    handleCaptureScreenshot
  }
}
