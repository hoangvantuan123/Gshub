/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { GridCellKind } from '@glideapps/glide-data-grid'

// Helper tạo dữ liệu mẫu chuẩn 276 lệnh điều phối GS1 Hà Nội
export function generateDefaultHanoiGs1PlanData() {
  const pics = ['Đỗ Đức Huy', 'Nguyễn Thị Lan', 'Trần Văn Minh', 'Lê Thị Thu', 'Hoàng Đình Nam']
  const machines = [
    { code: 'OFFSET-01', name: 'Máy In Offset Heidelberg XL-106', team: 'Tổ In Offset' },
    { code: 'OFFSET-02', name: 'Máy In Komori Lithrone G40', team: 'Tổ In Offset' },
    { code: 'BOI-01', name: 'Máy Bồi Tự Động Sakurai 1450', team: 'Tổ Bồi/Bế' },
    { code: 'BE-01', name: 'Máy Bế Tự Động Bobst Novacut 106', team: 'Tổ Bồi/Bế' },
    { code: 'BE-02', name: 'Máy Bế Tự Động Sanwa TRP-1060', team: 'Tổ Bồi/Bế' },
    { code: 'DAN-01', name: 'Máy Dán Hộp MegaFold 1050', team: 'Tổ Dán & Đóng Gói' },
    { code: 'DAN-02', name: 'Máy Dán Hộp SBL-1050', team: 'Tổ Dán & Đóng Gói' },
    { code: 'SONG-01', name: 'Dây Chuyền Tạo Sóng Carton 2.5m', team: 'Tổ Máy Sóng' }
  ]

  const items = [
    { code: 'BOX-IP16-PRO', name: 'Hộp cứng điện thoại IP16 Pro', customer: 'Foxconn Việt Nam Group' },
    { code: 'PK-SAMSUNG-A55', name: 'Bao bì phụ kiện Samsung Galaxy A55', customer: 'Samsung Electronics VN' },
    { code: 'LBL-VINAMILK-100', name: 'Nhãn hộp sữa Vinamilk 100% 180ml', customer: 'Vinamilk CP Sữa VN' },
    { code: 'BOX-PHARMA-B12', name: 'Vỏ hộp thuốc B-Complex 100ml', customer: 'Dược phẩm Nam Hà' },
    { code: 'CTN-CANON-PRT', name: 'Thùng carton 5 lớp máy in Canon', customer: 'Canon Electronics VN' },
    { code: 'BOX-COFFEE-TRUNGO', name: 'Hộp cà phê hòa tan Trung Nguyên Legend', customer: 'Tập đoàn Trung Nguyên' },
    { code: 'BAG-GIFT-KRAFT', name: 'Túi quà tặng giấy Kraft quai xoắn', customer: 'Unilever Việt Nam' }
  ]

  // Tổng: 276 lệnh:
  // - 141 SX sai ngày KH (51.1%)
  // - 103 Trượt KH (37.3%)
  // - 21 Khớp số lượng (7.6%)
  // - 11 Khớp job (4.0%)
  const list = []
  let idCounter = 1

  const makeItems = (count, dpStatusCode, dpStatusText, defaultTimeStatus, defaultCapaStatus) => {
    for (let i = 0; i < count; i++) {
      const day = 11 + (i % 20) // Từ 11/09 đến 30/09
      const planDay = Math.min(30, day + (dpStatusCode === 'SX_SAI_NGAY' ? (i % 2 === 0 ? -2 : 3) : 0))
      const planDate = `2026-09-${String(planDay).padStart(2, '0')}`
      const actualDate = `2026-09-${String(day).padStart(2, '0')}`

      const pic = pics[i % pics.length]
      const machine = machines[i % machines.length]
      const prod = items[i % items.length]

      const planQty = (Math.floor(i * 37) % 50 + 5) * 1000
      let actualQty = planQty
      if (dpStatusCode === 'TRUOT_KH') {
        actualQty = Math.floor(planQty * (0.6 + ((i % 30) / 100)))
      } else if (dpStatusCode === 'SX_SAI_NGAY') {
        actualQty = Math.floor(planQty * (0.9 + ((i % 15) / 100)))
      } else if (dpStatusCode === 'KHOP_JOB') {
        actualQty = planQty
      }

      // Time status: Chậm hơn ĐM, Nhanh hơn ĐM, Đúng ĐM, Chưa có dữ liệu
      let timeStatus = defaultTimeStatus
      if (i % 4 === 0) timeStatus = 'Chậm hơn ĐM'
      else if (i % 4 === 1) timeStatus = 'Nhanh hơn ĐM'
      else if (i % 4 === 2) timeStatus = 'Đúng ĐM'
      else timeStatus = 'Chưa có dữ liệu'

      // Capa status: Nhanh hơn ĐM, Chậm hơn ĐM, Trống / Đúng capa
      let capaStatus = defaultCapaStatus
      if (i % 3 === 0) capaStatus = 'Nhanh hơn ĐM'
      else if (i % 3 === 1) capaStatus = 'Chậm hơn ĐM'
      else capaStatus = 'Trống / Đúng capa'

      list.push({
        id: `HN-PL-${String(idCounter).padStart(4, '0')}`,
        docNo: `LSX-HN-2609-${String(idCounter).padStart(4, '0')}`,
        orderNo: `SO-2609-${String(1000 + (idCounter % 500))}`,
        planNo: `KH-HN-2026-W39-${String(idCounter).padStart(3, '0')}`,
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
        note: dpStatusCode === 'SX_SAI_NGAY' ? `Sản xuất lệch ${Math.abs(planDay - day)} ngày so với KHSX` : (dpStatusCode === 'TRUOT_KH' ? 'Trượt tiến độ do thiếu phôi vật tư' : 'Lệnh điều phối hoàn thành đúng kế hoạch')
      })
      idCounter++
    }
  }

  // 141 SX sai ngày KH
  makeItems(141, 'SX_SAI_NGAY', 'SX sai ngày KH', 'Chậm hơn ĐM', 'Chậm hơn ĐM')
  // 103 Trượt KH
  makeItems(103, 'TRUOT_KH', 'Trượt KH', 'Chậm hơn ĐM', 'Nhanh hơn ĐM')
  // 21 Khớp số lượng
  makeItems(21, 'KHOP_SL', 'Khớp số lượng', 'Đúng ĐM', 'Trống / Đúng capa')
  // 11 Khớp job
  makeItems(11, 'KHOP_JOB', 'Khớp job', 'Đúng ĐM', 'Trống / Đúng capa')

  return list
}

export function useHanoiGs1PlanLogic({
  dataset = [],
  plantName = 'Nhà máy GS1 Hà Nội',
  maskText = (t) => t
}) {
  // Bộ lọc dữ liệu
  const [dateRange, setDateRange] = useState(['2026-09-11', '2026-09-30'])
  const [selectedPic, setSelectedPic] = useState('ALL')
  const [selectedDpStatus, setSelectedDpStatus] = useState('ALL')
  const [selectedTimeStatus, setSelectedTimeStatus] = useState('ALL')
  const [selectedCapaStatus, setSelectedCapaStatus] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditModalCategory, setAuditModalCategory] = useState('ALL')

  // Glide Data Grid State
  const [rowHeight, setRowHeight] = useState(30)
  const [colWidths, setColWidths] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: 'docNo', direction: 'asc' })
  const gridRef = useRef(null)
  const reportContainerRef = useRef(null)

  // Danh sách rawData từ prop hoặc fallback mock 276 items
  const rawData = useMemo(() => {
    if (dataset && dataset.length > 0) return dataset
    return generateDefaultHanoiGs1PlanData()
  }, [dataset])

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

  // Dữ liệu sau khi áp dụng toàn bộ bộ lọc
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // 1. Lọc Ngày (PlanDate hoặc ActualDate nằm trong khoảng)
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = item.actualDate || item.planDate || item.prodDate || ''
        if (itemDate && (itemDate < dateRange[0] || itemDate > dateRange[1])) {
          return false
        }
      }

      // 2. Lọc PIC Điều phối
      if (selectedPic !== 'ALL' && item.pic !== selectedPic) return false

      // 3. Lọc Trạng thái ĐP - SX
      if (selectedDpStatus !== 'ALL') {
        const st = item.dpStatusCode || item.dpStatus
        if (selectedDpStatus === 'SX_SAI_NGAY' && st !== 'SX_SAI_NGAY' && !String(item.dpStatusText || '').includes('sai ngày')) return false
        if (selectedDpStatus === 'TRUOT_KH' && st !== 'TRUOT_KH' && !String(item.dpStatusText || '').includes('Trượt')) return false
        if (selectedDpStatus === 'KHOP_SL' && st !== 'KHOP_SL' && !String(item.dpStatusText || '').includes('Khớp số lượng')) return false
        if (selectedDpStatus === 'KHOP_JOB' && st !== 'KHOP_JOB' && !String(item.dpStatusText || '').includes('Khớp job')) return false
      }

      // 4. Lọc Trạng thái thời gian
      if (selectedTimeStatus !== 'ALL') {
        const t = item.timeStatus || item.timeStatusText || ''
        if (selectedTimeStatus === 'CHAM_DM' && !t.includes('Chậm')) return false
        if (selectedTimeStatus === 'NHANH_DM' && !t.includes('Nhanh')) return false
        if (selectedTimeStatus === 'DUNG_DM' && !t.includes('Đúng')) return false
        if (selectedTimeStatus === 'NO_DATA' && !t.includes('Chưa có')) return false
      }

      // 5. Lọc Trạng thái capa
      if (selectedCapaStatus !== 'ALL') {
        const c = item.capaStatus || item.capaStatusText || ''
        if (selectedCapaStatus === 'NHANH_DM' && !c.includes('Nhanh')) return false
        if (selectedCapaStatus === 'CHAM_DM' && !c.includes('Chậm')) return false
        if (selectedCapaStatus === 'TRONG_HOAC_DUNG' && !c.includes('Trống') && !c.includes('Đúng')) return false
      }

      // 6. Lọc Máy
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false

      // 7. Tìm kiếm Search Text
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
  }, [rawData, dateRange, selectedPic, selectedDpStatus, selectedTimeStatus, selectedCapaStatus, selectedMachine, searchQuery])

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
      overallProgress: totalPlanQty > 0 ? ((totalActualQty / totalPlanQty) * 100).toFixed(1) : '100.0'
    }
  }, [filteredData])

  // 3. TRẠNG THÁI ĐP - SX (Biểu đồ & Khối phân loại)
  const dpStatusBreakdown = useMemo(() => {
    return [
      { name: 'SX sai ngày KH', count: kpiMetrics.sxSaiNgayCount, rate: Number(kpiMetrics.sxSaiNgayRate), color: '#c27803', tag: 'Cảnh báo' },
      { name: 'Trượt KH', count: kpiMetrics.truotKhCount, rate: Number(kpiMetrics.truotKhRate), color: '#b91c1c', tag: 'Cảnh báo trượt' },
      { name: 'Khớp số lượng', count: kpiMetrics.khopSlCount, rate: Number(kpiMetrics.khopSlRate), color: '#0f766e', tag: 'Đạt chuẩn' },
      { name: 'Khớp job', count: kpiMetrics.khopJobCount, rate: Number(kpiMetrics.khopJobRate), color: '#2b6b79', tag: 'Đạt chuẩn' }
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
      { name: 'Chậm hơn ĐM', count: cham, rate: Number(((cham / total) * 100).toFixed(1)), color: '#b91c1c' },
      { name: 'Nhanh hơn ĐM', count: nhanh, rate: Number(((nhanh / total) * 100).toFixed(1)), color: '#0284c7' },
      { name: 'Đúng ĐM', count: dung, rate: Number(((dung / total) * 100).toFixed(1)), color: '#0f766e' },
      { name: 'Chưa có dữ liệu', count: noData, rate: Number(((noData / total) * 100).toFixed(1)), color: '#64748b' }
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
      { name: 'Nhanh hơn ĐM', count: nhanh, rate: Number(((nhanh / total) * 100).toFixed(1)), color: '#2b6b79' },
      { name: 'Chậm hơn ĐM', count: cham, rate: Number(((cham / total) * 100).toFixed(1)), color: '#c27803' },
      { name: 'Trống / Đúng capa', count: trong, rate: Number(((trong / total) * 100).toFixed(1)), color: '#0f766e' }
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
          progressRate: row.totalPlanQty > 0 ? Number(((row.totalActualQty / row.totalPlanQty) * 100).toFixed(1)) : 100
        }
      })
      .sort((a, b) => b.totalOrders - a.totalOrders)
  }, [filteredData])

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
      { id: 'docNo', title: 'Số LSX', width: colWidths['docNo'] || 135 },
      { id: 'orderNo', title: 'Đơn hàng (SO)', width: colWidths['orderNo'] || 120 },
      { id: 'dpStatus', title: 'Trạng thái ĐP-SX', width: colWidths['dpStatus'] || 155 },
      { id: 'timeStatus', title: 'Trạng thái Thời gian', width: colWidths['timeStatus'] || 145 },
      { id: 'capaStatus', title: 'Trạng thái Capa', width: colWidths['capaStatus'] || 135 },
      { id: 'pic', title: 'PIC Điều phối', width: colWidths['pic'] || 130 },
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
            themeOverride: { textDark: '#2563eb', baseFontStyle: '700 12px' }
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
          let color = '#0f766e'
          if (txt.includes('sai ngày')) color = '#d97706'
          else if (txt.includes('Trượt')) color = '#be123c'
          else if (txt.includes('job')) color = '#2563eb'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: color, baseFontStyle: '700 12px' }
          }
        }
        case 'timeStatus': {
          const txt = item.timeStatusText || item.timeStatus || 'Đúng ĐM'
          let color = '#0f766e'
          if (txt.includes('Chậm')) color = '#be123c'
          else if (txt.includes('Nhanh')) color = '#0284c7'
          else if (txt.includes('Chưa có')) color = '#64748b'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: color, baseFontStyle: '600 12px' }
          }
        }
        case 'capaStatus': {
          const txt = item.capaStatusText || item.capaStatus || 'Đúng capa'
          let color = '#0f766e'
          if (txt.includes('Chậm')) color = '#d97706'
          else if (txt.includes('Nhanh')) color = '#2563eb'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: color, baseFontStyle: '600 12px' }
          }
        }
        case 'pic':
          return {
            kind: GridCellKind.Text,
            data: item.pic || 'Chưa phân công',
            displayData: item.pic || 'Chưa phân công',
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
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
            themeOverride: {
              textDark: item.planDate && item.actualDate && item.planDate !== item.actualDate ? '#d97706' : '#334155',
              baseFontStyle: item.planDate && item.actualDate && item.planDate !== item.actualDate ? '700 12px' : '400 12px'
            }
          }
        case 'planQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.planQty) || 0,
            displayData: (Number(item.planQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#1e293b' }
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.actualQty) || 0,
            displayData: (Number(item.actualQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#047857', baseFontStyle: '700 12px' }
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
              textDark: Number(rate) >= 95 ? '#047857' : '#be123c',
              baseFontStyle: '700 12px'
            }
          }
        }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#0284c7', baseFontStyle: '600 12px' }
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
            themeOverride: { textDark: '#0f172a', baseFontStyle: '500 12px' }
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

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedPic('ALL')
    setSelectedDpStatus('ALL')
    setSelectedTimeStatus('ALL')
    setSelectedCapaStatus('ALL')
    setSelectedMachine('ALL')
    setSearchQuery('')
    setDateRange(['2026-09-11', '2026-09-30'])
  }

  const hasActiveFilters =
    selectedPic !== 'ALL' ||
    selectedDpStatus !== 'ALL' ||
    selectedTimeStatus !== 'ALL' ||
    selectedCapaStatus !== 'ALL' ||
    selectedMachine !== 'ALL' ||
    searchQuery.trim() !== ''

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
      'Tỷ lệ hoàn thành (%)': item.planQty > 0 ? Number(((item.actualQty / item.planQty) * 100).toFixed(1)) : 100,
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
    XLSX.writeFile(wb, `BaoCao_DieuPhoi_KHSX_GS1_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Chụp ảnh toàn bộ báo cáo
  const handleTakeScreenshot = async () => {
    if (!reportContainerRef.current) return
    try {
      const canvas = await html2canvas(reportContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      const link = document.createElement('a')
      link.download = `BaoCao_KHSX_GS1_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error capturing screenshot:', err)
    }
  }

  return {
    // Filters & State
    dateRange,
    setDateRange,
    selectedPic,
    setSelectedPic,
    selectedDpStatus,
    setSelectedDpStatus,
    selectedTimeStatus,
    setSelectedTimeStatus,
    selectedCapaStatus,
    setSelectedCapaStatus,
    selectedMachine,
    setSelectedMachine,
    searchQuery,
    setSearchQuery,
    handleResetFilters,
    hasActiveFilters,
    filterOptions,

    // Modal
    showAuditModal,
    setShowAuditModal,
    auditModalCategory,
    setAuditModalCategory,

    // Data & Metrics
    rawData,
    filteredData,
    sortedData,
    kpiMetrics,
    dpStatusBreakdown,
    timeStatusBreakdown,
    capaStatusBreakdown,
    picBreakdown,

    // Grid
    gridRef,
    reportContainerRef,
    columns,
    getCellContent,
    onColumnResize,
    rowHeight,
    setRowHeight,
    sortConfig,
    setSortConfig,

    // Actions
    handleExportExcel,
    handleTakeScreenshot
  }
}
