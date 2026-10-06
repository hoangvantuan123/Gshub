/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo, useRef, useCallback } from 'react'
import { Eye, EyeOff, Search, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { Button } from '@renderer/components/ui/button'
import ExportExcelModal from '@renderer/user/components/modal/ExportExcelModal'
import { SearchableMultiSelectDropdown } from '../../summary/common/SearchableMultiSelectDropdown'
import { saveWorkbookToFile } from '@renderer/utils/exportExcelUtils'

// Lấy thứ trong tuần tiếng Việt
const getVNDayOfWeek = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return days[d.getDay()]
}

// Lấy thứ viết tắt chuẩn tiếng Việt (T2, T3, T4, T5, T6, T7, CN)
const getVNShortDayOfWeek = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return days[d.getDay()]
}

// Kiểm tra máy thủ công (Tên hoặc mã có chứa THUCONG / THỦ CÔNG)
const isManualMachine = (mCode = '', mName = '') => {
  const s = `${mCode} ${mName}`.toLowerCase()
  return (
    s.includes('thucong') ||
    s.includes('thủ công') ||
    s.includes('thu cong') ||
    s.includes('thủ_công') ||
    s.includes('thu_cong') ||
    s.includes('ghim thủ công') ||
    s.includes('dán thủ công') ||
    s.includes('bồi thủ công')
  )
}

// Tính trước style và nội dung của từng ô (chạy 1 lần trong useMemo để tối ưu hiệu năng)
const computeCellMeta = (hours, isManual, shortDate, mCode, mName) => {
  let hBg = '#ffffff'
  let hColor = '#cbd5e1'
  let hText = '-'
  let isOver24 = false

  if (hours > 0) {
    hText = hours % 1 === 0 ? String(hours) : String(Number(hours.toFixed(1)))
    if (hours > 24 && !isManual) {
      hBg = '#dc2626'
      hColor = '#ffffff'
      isOver24 = true
    } else if (hours >= 14) {
      hBg = '#16a34a'
      hColor = '#ffffff'
    } else if (hours >= 8) {
      hBg = '#e0f2fe'
      hColor = '#0369a1'
    } else {
      hBg = '#fef3c7'
      hColor = '#b45309'
    }
  }

  const tooltip = isOver24
    ? `CẢNH BÁO QUÁ TRẦN (>24H/NGÀY): ${mCode} (${mName}) - Ngày ${shortDate}: ${hours}h`
    : `${mCode} (${mName}) - Ngày ${shortDate}: ${hours > 0 ? `${hours}h` : 'Nghỉ (0h)'}`

  return {
    hours,
    isOver24,
    hBg,
    hColor,
    hText,
    tooltip
  }
}

export function MachineRuntimeSection({
  displayMachineList = [],
  machineGrandTotal = null,
  machineTimelineBreakdown = {
    dailyList: [],
    monthlyList: [],
    quarterlyList: [],
    machineList: [],
    machineClusters: []
  },
  plantName = 'Nhà máy GS Hà Nội',
  totalDays = 1,
  standardCapacityHours = 24,
  sectionNumber = 2,
  showManualMachines: propShowManual,
  setShowManualMachines: propSetShowManual
}) {
  const sectionRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeams, setSelectedTeams] = useState([]) // Multi-select Nhóm máy
  const [selectedMachines, setSelectedMachines] = useState([]) // Multi-select Cụm máy
  const [selectedMachineRow, setSelectedMachineRow] = useState(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  // Mặc định ẩn máy thủ công
  const [localShowManual, setLocalShowManual] = useState(false)
  const showManual = propShowManual !== undefined ? propShowManual : localShowManual
  const setShowManual = propSetShowManual || setLocalShowManual

  const dailyList = useMemo(() => {
    return machineTimelineBreakdown?.dailyList || []
  }, [machineTimelineBreakdown])

  // Danh sách máy gốc kèm thông tin tổ/cụm máy
  const rawMachineList = useMemo(() => {
    if (machineTimelineBreakdown?.machineList?.length > 0) {
      return machineTimelineBreakdown.machineList
    }
    if (displayMachineList?.length > 0) {
      return displayMachineList.map((m) => m.machineCode || m.machineName).filter(Boolean)
    }
    return []
  }, [machineTimelineBreakdown, displayMachineList])

  // Sinh đầy đủ danh sách ngày (ví dụ: lọc Tháng 10 sẽ có đủ 31 cột ngày từ 01 đến 31)
  const allPeriodDates = useMemo(() => {
    if (!dailyList || dailyList.length === 0) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const daysInMonth = new Date(year, month, 0).getDate()
      const res = []
      for (let day = 1; day <= daysInMonth; day++) {
        const dd = String(day).padStart(2, '0')
        const mm = String(month).padStart(2, '0')
        const dStr = `${year}-${mm}-${dd}`
        res.push({
          dateKey: dStr,
          shortLabel: dd,
          dayOfWeek: getVNDayOfWeek(dStr)
        })
      }
      return res
    }

    const rawDates = dailyList.map((d) => d.date).filter(Boolean)
    if (rawDates.length === 0) return []

    const sortedDates = [...rawDates].sort()
    const firstDateStr = sortedDates[0]
    const lastDateStr = sortedDates[sortedDates.length - 1]

    if (firstDateStr.length >= 7 && firstDateStr.slice(0, 7) === lastDateStr.slice(0, 7)) {
      const yearMonth = firstDateStr.slice(0, 7)
      const [y, m] = yearMonth.split('-').map(Number)
      const daysInMonth = new Date(y, m, 0).getDate()
      const res = []
      for (let day = 1; day <= daysInMonth; day++) {
        const dd = String(day).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        const dStr = `${y}-${mm}-${dd}`
        res.push({
          dateKey: dStr,
          shortLabel: dd,
          dayOfWeek: getVNDayOfWeek(dStr)
        })
      }
      return res
    }

    try {
      const start = new Date(firstDateStr)
      const end = new Date(lastDateStr)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const res = []
        const curr = new Date(start)
        while (curr <= end) {
          const y = curr.getFullYear()
          const m = String(curr.getMonth() + 1).padStart(2, '0')
          const d = String(curr.getDate()).padStart(2, '0')
          const dStr = `${y}-${m}-${d}`
          res.push({
            dateKey: dStr,
            shortLabel: d,
            dayOfWeek: getVNDayOfWeek(dStr)
          })
          curr.setDate(curr.getDate() + 1)
        }
        return res
      }
    } catch (e) {
      // Fallback
    }

    return dailyList.map((d) => ({
      dateKey: d.date,
      shortLabel: d.shortDate || (d.date && d.date.length >= 10 ? d.date.slice(8, 10) : d.date),
      dayOfWeek: getVNDayOfWeek(d.date)
    }))
  }, [dailyList])

  // Xử lý dữ liệu Heatmap, Đánh giá xu hướng và Thống kê từng máy (Tối ưu hóa tối đa)
  const heatmapData = useMemo(() => {
    const dailyDataMap = new Map()
    for (let i = 0; i < dailyList.length; i++) {
      const d = dailyList[i]
      if (d.date) dailyDataMap.set(d.date, d)
    }

    const daysCount = allPeriodDates.length || 1
    const halfLen = Math.floor(daysCount / 2) || 1
    const list = []
    let totalAllRuntime = 0
    let totalAllTickets = 0
    let totalAllActualQty = 0
    let activeMachinesCount = 0
    let over24MachinesCount = 0

    for (let mIdx = 0; mIdx < rawMachineList.length; mIdx++) {
      const mCode = rawMachineList[mIdx]
      const cluster = machineTimelineBreakdown?.machineClusters?.find((c) => c.machineCode === mCode)
      const disp = displayMachineList.find((m) => (m.machineCode || m.machineName) === mCode)
      const mName = cluster?.machineName || disp?.machineName || disp?.machineDesc || mCode
      const team = cluster?.teamName || disp?.team || disp?.teamName || 'Khác'
      const isManual = isManualMachine(mCode, mName)

      let totalRuntime = 0
      let totalTickets = 0
      let totalActualQty = 0
      let activeDaysCount = 0
      const activeValues = []
      const daysData = new Array(daysCount)
      let hasOver24 = false

      for (let dIdx = 0; dIdx < daysCount; dIdx++) {
        const dateObj = allPeriodDates[dIdx]
        const dayItem = dailyDataMap.get(dateObj.dateKey)
        const rt = dayItem ? Number(dayItem[`${mCode}_runtime`] ?? dayItem[mCode] ?? 0) : 0
        const tk = dayItem ? Number(dayItem[`${mCode}_tickets`] ?? 0) : 0
        const qty = dayItem ? Number(dayItem[`${mCode}_actualQty`] ?? 0) : 0

        totalRuntime += rt
        totalTickets += tk
        totalActualQty += qty

        if (rt > 0) {
          activeDaysCount++
          activeValues.push(rt)
        }

        const cellMeta = computeCellMeta(
          rt,
          isManual,
          dateObj.shortLabel,
          mCode,
          mName
        )

        if (cellMeta.isOver24) {
          hasOver24 = true
        }

        daysData[dIdx] = {
          date: dateObj.dateKey,
          shortDate: dateObj.shortLabel,
          ticketCount: tk,
          actualQty: qty,
          ...cellMeta
        }
      }

      // TB/NG: Giờ chạy trung bình trên mỗi ngày máy có hoạt động thực tế (>0h)
      const avgDailyHours =
        activeDaysCount > 0
          ? Number((totalRuntime / activeDaysCount).toFixed(1))
          : 0

      // TB toàn kỳ (chia đều cho toàn bộ ngày)
      const avgPeriodHours = Number((totalRuntime / daysCount).toFixed(1))

      // Đánh giá tốc độ tăng trưởng CHỈ TRÊN CÁC NGÀY CÓ GIÁ TRỊ THỰC TẾ (> 0h)
      let trendPct = 0
      let trendText = 'Ổn định'
      let trendColor = '#475569'
      let trendSign = ''

      if (activeValues.length === 0) {
        trendText = 'Nghỉ chạy'
        trendColor = '#94a3b8'
      } else if (activeValues.length === 1) {
        trendText = 'Ổn định'
        trendColor = '#0284c7'
        trendSign = `${activeValues[0]}h`
      } else if (activeValues.length === 2) {
        const v1 = activeValues[0]
        const v2 = activeValues[1]
        if (v1 > 0) {
          trendPct = Number((((v2 - v1) / v1) * 100).toFixed(0))
        } else {
          trendPct = 100
        }

        if (trendPct >= 10) {
          trendText = 'Tích cực'
          trendColor = '#16a34a'
          trendSign = `+${trendPct}%`
        } else if (trendPct <= -10) {
          trendText = 'Giảm tải'
          trendColor = '#dc2626'
          trendSign = `${trendPct}%`
        } else {
          trendText = 'Ổn định'
          trendColor = '#475569'
          trendSign = trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`
        }
      } else {
        // activeValues.length >= 3: So sánh nửa sau với nửa đầu của các ngày có chạy
        const mid = Math.floor(activeValues.length / 2)
        const firstHalf = activeValues.slice(0, mid)
        const secondHalf = activeValues.slice(mid)
        const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

        if (avg1 > 0) {
          trendPct = Number((((avg2 - avg1) / avg1) * 100).toFixed(0))
        } else {
          trendPct = 100
        }

        if (trendPct >= 10) {
          trendText = 'Tích cực'
          trendColor = '#16a34a'
          trendSign = `+${trendPct}%`
        } else if (trendPct <= -10) {
          trendText = 'Giảm tải'
          trendColor = '#dc2626'
          trendSign = `${trendPct}%`
        } else {
          trendText = 'Ổn định'
          trendColor = '#475569'
          trendSign = trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`
        }
      }

      if (totalRuntime > 0) {
        activeMachinesCount++
      }
      if (hasOver24) {
        over24MachinesCount++
      }

      totalAllRuntime += totalRuntime
      totalAllTickets += totalTickets
      totalAllActualQty += totalActualQty

      list.push({
        machineCode: mCode,
        machineName: mName,
        teamName: team,
        isManual,
        hasOver24,
        totalRuntime: Number(totalRuntime.toFixed(1)),
        activeDaysCount,
        avgDailyHours,
        avgPeriodHours,
        trendPct,
        trendText,
        trendColor,
        trendSign,
        totalTickets,
        totalActualQty,
        daysData
      })
    }

    return {
      dates: allPeriodDates,
      list,
      kpis: {
        totalMachines: list.length,
        activeMachinesCount,
        inactiveMachinesCount: Math.max(0, list.length - activeMachinesCount),
        totalAllRuntime: Number(totalAllRuntime.toFixed(1)),
        avgHoursPerMachinePerDay:
          list.length > 0 && daysCount > 0
            ? Number((totalAllRuntime / (list.length * daysCount)).toFixed(1))
            : 0,
        over24MachinesCount
      }
    }
  }, [rawMachineList, dailyList, allPeriodDates, displayMachineList, machineTimelineBreakdown])

  // Số lượng máy thủ công
  const manualMachineCount = useMemo(() => {
    return heatmapData.list.filter((m) => m.isManual).length
  }, [heatmapData.list])

  // Danh sách options cho Multi-select Nhóm máy
  const teamDropdownOptions = useMemo(() => {
    const set = new Set()
    heatmapData.list.forEach((m) => {
      if (showManual || !m.isManual) {
        if (m.teamName) set.add(m.teamName)
      }
    })
    return Array.from(set).sort().map((team) => ({
      value: team,
      label: team
    }))
  }, [heatmapData.list, showManual])

  // Danh sách options cho Multi-select Cụm máy (tự động ăn theo Nhóm máy đang chọn)
  const machineDropdownOptions = useMemo(() => {
    let list = heatmapData.list
    if (!showManual) {
      list = list.filter((m) => !m.isManual)
    }
    if (selectedTeams.length > 0) {
      const teamSet = new Set(selectedTeams)
      list = list.filter((m) => teamSet.has(m.teamName))
    }
    return list.map((m) => ({
      value: m.machineCode,
      label: `${m.machineCode} - ${m.machineName}`,
      searchKey: `${m.machineCode} ${m.machineName} ${m.teamName}`
    }))
  }, [heatmapData.list, showManual, selectedTeams])

  // Lọc máy theo thanh tìm kiếm, Dropdown multi-select & Ẩn máy thủ công
  const filteredHeatmapList = useMemo(() => {
    let res = heatmapData.list
    if (!showManual) {
      res = res.filter((m) => !m.isManual)
    }
    if (selectedTeams.length > 0) {
      const teamSet = new Set(selectedTeams)
      res = res.filter((m) => teamSet.has(m.teamName))
    }
    if (selectedMachines.length > 0) {
      const machineSet = new Set(selectedMachines)
      res = res.filter((m) => machineSet.has(m.machineCode))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      res = res.filter(
        (m) =>
          m.machineCode.toLowerCase().includes(q) ||
          m.machineName.toLowerCase().includes(q) ||
          m.teamName.toLowerCase().includes(q)
      )
    }
    return res
  }, [heatmapData.list, showManual, selectedTeams, selectedMachines, searchQuery])

  // Thống kê nhanh cho danh sách hiển thị
  const filteredSummaryKpi = useMemo(() => {
    const count = filteredHeatmapList.length
    const days = heatmapData.dates.length || 1
    let sumRuntime = 0
    let active = 0
    let over24 = 0

    for (let i = 0; i < count; i++) {
      const m = filteredHeatmapList[i]
      sumRuntime += m.totalRuntime
      if (m.totalRuntime > 0) active++
      if (m.hasOver24) over24++
    }

    const avgDailyPerMachine =
      count > 0 && days > 0 ? Number((sumRuntime / (count * days)).toFixed(1)) : 0

    return {
      count,
      active,
      inactive: Math.max(0, count - active),
      sumRuntime: Number(sumRuntime.toFixed(1)),
      avgDailyPerMachine,
      over24
    }
  }, [filteredHeatmapList, heatmapData.dates.length])

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Danh sách cột phục vụ ExportExcelModal
  const matrixExcelColumns = useMemo(() => {
    const cols = [
      { id: 'MachineCode', title: 'Mã máy', width: 100 },
      { id: 'MachineName', title: 'Tên máy / Thiết bị', width: 180 },
      { id: 'TeamName', title: 'Tổ / Nhóm máy', width: 120 },
      { id: 'TotalRuntime', title: 'Tổng giờ chạy (h)', width: 110 },
      { id: 'ActiveDaysCount', title: 'Số ngày chạy', width: 100 },
      { id: 'AvgDailyHours', title: 'TB/ngày chạy (h)', width: 110 },
      { id: 'TrendText', title: 'Đánh giá xu hướng', width: 130 }
    ]
    heatmapData.dates.forEach((d) => {
      const shortDay = getVNShortDayOfWeek(d.dateKey)
      cols.push({
        id: `Date_${d.dateKey}`,
        title: shortDay ? `${d.shortLabel} (${shortDay})` : d.shortLabel,
        width: 70
      })
    })
    return cols
  }, [heatmapData.dates])

  // Xuất file Excel bảng giờ chạy máy thông qua khung chuẩn hệ thống
  const executeExportMatrixExcel = useCallback(
    async ({ fileName, saveDirectory, overwriteExisting }) => {
      try {
        const aoaRows = []

        // 1. Tiêu đề báo cáo
        aoaRows.push([`BÁO CÁO THỜI GIAN CHẠY MÁY CHI TIẾT THEO NGÀY`])
        aoaRows.push([
          `Nhà máy: ${plantName} | Số lượng máy: ${filteredHeatmapList.length} máy | Số ngày: ${heatmapData.dates.length} ngày`
        ])
        aoaRows.push([
          `Ghi chú công thức TB/NG: Giờ chạy trung bình trên các ngày máy có hoạt động thực tế (>0h)`
        ])
        aoaRows.push([`Ngày xuất báo cáo: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`])
        aoaRows.push([]) // Dòng trống

        // 2. Dòng tiêu đề cột (Headers)
        const headerRow = [
          'STT',
          'Mã máy',
          'Tên máy / Thiết bị',
          'Tổ / Nhóm máy',
          'Tổng giờ chạy (h)',
          'Số ngày chạy',
          'TB/ngày chạy (h)',
          'Đánh giá xu hướng'
        ]

        heatmapData.dates.forEach((d) => {
          const shortDay = getVNShortDayOfWeek(d.dateKey)
          headerRow.push(shortDay ? `${d.shortLabel} (${shortDay})` : d.shortLabel)
        })
        aoaRows.push(headerRow)

        // 3. Dữ liệu từng máy
        filteredHeatmapList.forEach((m, idx) => {
          const row = [
            idx + 1,
            m.machineCode,
            m.machineName,
            m.teamName,
            m.totalRuntime,
            m.activeDaysCount,
            m.avgDailyHours,
            `${m.trendText} ${m.trendSign ? `(${m.trendSign})` : ''}`
          ]

          m.daysData.forEach((d) => {
            row.push(d.runtimeHours)
          })

          aoaRows.push(row)
        })

        // 4. Tạo Sheet & format độ rộng cột
        const ws = XLSX.utils.aoa_to_sheet(aoaRows)

        const colWidths = [
          { wch: 6 }, // STT
          { wch: 15 }, // Mã máy
          { wch: 28 }, // Tên máy
          { wch: 16 }, // Tổ / Nhóm
          { wch: 16 }, // Tổng giờ
          { wch: 14 }, // Số ngày chạy
          { wch: 16 }, // TB ngày chạy
          { wch: 20 } // Đánh giá xu hướng
        ]
        heatmapData.dates.forEach(() => {
          colWidths.push({ wch: 8 })
        })
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'GioChayMay')

        await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
      } catch (err) {
        console.error('Lỗi khi xuất Excel bảng giờ chạy máy:', err)
      }
    },
    [filteredHeatmapList, heatmapData.dates, plantName]
  )

  return (
    <div
      ref={sectionRef}
      style={{
        width: '100%',
        background: '#ffffff',
        padding: '16px 20px',
        marginBottom: 36,
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <style>{`
        .machine-matrix-row:hover td.sticky-col {
          background-color: #f1f5f9 !important;
        }
        .machine-matrix-row.selected td.sticky-col {
          background-color: #eff6ff !important;
        }
        .machine-matrix-row:hover td.matrix-cell {
          filter: brightness(0.96);
        }
        .matrix-cell {
          user-select: none;
          transition: filter 0.1s ease;
        }
      `}</style>

      {/* 1. TIÊU ĐỀ HẠNG MỤC & MÔ TẢ TỰ NHIÊN */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 15.5,
            fontWeight: 700,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>{sectionNumber}. THỜI GIAN CHẠY MÁY THEO NGÀY CỦA TỪNG THIẾT BỊ</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
          Theo dõi tổng số giờ chạy máy, số ngày chạy thực tế và số giờ vận hành chi tiết từng ngày của{' '}
          <b style={{ color: '#0f172a' }}>{filteredSummaryKpi.count} máy sản xuất</b> tại {plantName} trong{' '}
          <b style={{ color: '#0f172a' }}>{heatmapData.dates.length} ngày</b>.
        </div>
      </div>

      {/* 2. THANH BỘ LỌC & CÔNG CỤ CHUẨN ERP VỚI MULTI-SELECT DROPDOWNS */}
      <div
        className="screenshot-hide"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          userSelect: 'none'
        }}
      >
        {/* Nhóm điều khiển bên trái: Nút phẳng Ẩn/Hiện máy thủ công (chỉ có icon mắt & text) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: showManual ? '#b45309' : '#64748b',
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'color 0.15s ease'
            }}
            title="Bật/tắt hiển thị các máy / tổ thủ công"
          >
            {showManual ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>
              {showManual
                ? 'Ẩn máy thủ công'
                : `Hiện máy thủ công ${manualMachineCount > 0 ? `(${manualMachineCount})` : ''}`}
            </span>
          </button>
        </div>

        {/* Nhóm điều khiển bên phải: Multi-Select Nhóm, Máy, Tìm kiếm phẳng & Nút Xuất ảnh / Xuất Excel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* 1. Lọc Multi-select Nhóm máy */}
          {teamDropdownOptions.length > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Nhóm:</span>
              <SearchableMultiSelectDropdown
                options={teamDropdownOptions}
                value={selectedTeams}
                onChange={(vals) => {
                  setSelectedTeams(vals)
                  setSelectedMachines([])
                }}
                placeholder="Tất cả nhóm"
                minWidth="130px"
                maxWidth="180px"
                dropdownWidth="260px"
              />
            </div>
          )}

          {/* 2. Lọc Multi-select Cụm máy */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Máy:</span>
            <SearchableMultiSelectDropdown
              options={machineDropdownOptions}
              value={selectedMachines}
              onChange={setSelectedMachines}
              placeholder="Tất cả máy"
              minWidth="130px"
              maxWidth="180px"
              dropdownWidth="300px"
            />
          </div>

          {/* 3. Ô tìm kiếm phẳng (Không viền, không nền) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              background: 'transparent',
              border: 'none',
              padding: '0 4px',
              gap: 6
            }}
          >
            <Search size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm máy..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 12,
                color: '#0f172a',
                width: 90,
                background: 'transparent'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 2px',
                  lineHeight: 1
                }}
                title="Xóa tìm kiếm"
              >
                x
              </button>
            )}
          </div>

          {/* 4. Nút Xuất Excel riêng cho bảng này */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            style={{
              height: 28,
              padding: '0 8px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#01411b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
            className="hover:text-emerald-700 hover:bg-emerald-50"
            title="Xuất file Excel bảng giờ chạy máy chi tiết theo ngày"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span>Xuất Excel</span>
          </Button>
        </div>
      </div>

      {/* 3. THÔNG SỐ TỔNG HỢP NHANH (PARAMETER SUMMARY BAR) */}
      <div
        style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          padding: '6px 12px',
          fontSize: 11.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px 16px',
          color: '#475569'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span>
            Tổng số máy:{' '}
            <b style={{ color: '#0f172a' }}>{filteredSummaryKpi.count.toLocaleString('vi-VN')}</b>
          </span>
          <span>
            Đang chạy:{' '}
            <b style={{ color: '#15803d' }}>{filteredSummaryKpi.active.toLocaleString('vi-VN')}</b>
          </span>
          {filteredSummaryKpi.inactive > 0 && (
            <span>
              Không chạy:{' '}
              <b style={{ color: '#94a3b8' }}>
                {filteredSummaryKpi.inactive.toLocaleString('vi-VN')}
              </b>
            </span>
          )}
          <span>
            Tổng giờ chạy:{' '}
            <b style={{ color: '#0284c7' }}>
              {filteredSummaryKpi.sumRuntime.toLocaleString('vi-VN')}h
            </b>
          </span>
          <span title="Giờ chạy trung bình trên mỗi máy trên tổng số ngày trong kỳ">
            TB toàn kỳ / máy:{' '}
            <b style={{ color: '#334155' }}>
              {filteredSummaryKpi.avgDailyPerMachine.toLocaleString('vi-VN')}h/ngày
            </b>
          </span>
        </div>
      </div>

      {/* 4. CHÚ THÍCH MÀU SẮC ĐỒNG BỘ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px 14px',
          fontSize: 11.5,
          padding: '6px 12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          userSelect: 'none'
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: '#334155',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontSize: 11
          }}
        >
          CHÚ THÍCH:
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: '#dc2626',
              borderRadius: 2,
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#dc2626', fontWeight: 700 }}>Quá 24h/ngày (Bất thường)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: '#16a34a',
              borderRadius: 2,
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#15803d', fontWeight: 600 }}>Chạy tốt (14 – 24h)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              borderRadius: 2,
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#0369a1', fontWeight: 500 }}>Bình thường (8 – 14h)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 2,
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#b45309', fontWeight: 500 }}>Chạy ít (&lt; 8h)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>Không chạy (0h / -)</span>
        </div>
      </div>

      {/* 5. BẢNG MATRIX SỐ LIỆU CHUẨN ERP: Ô ĐẦY TRÀN VIỀN, SIÊU NHẸ VÀ TẢI NHANH */}
      <div
        className="matrix-table-wrapper"
        style={{
          width: '100%',
          overflowX: 'auto',
          borderTop: '2px solid #0f172a',
          borderBottom: '2px solid #0f172a',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        <table
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'collapse',
            fontSize: 11.5,
            textAlign: 'center',
            tableLayout: 'fixed',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <colgroup>
            <col style={{ width: 32 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 145 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 65 }} />
            <col style={{ width: 95 }} />
            {heatmapData.dates.map((d, i) => (
              <col key={d.dateKey || i} style={{ width: 28 }} />
            ))}
          </colgroup>

          <thead>
            <tr style={{ borderBottom: '1.5px solid #0f172a', background: '#f8fafc', height: 32 }}>
              {/* 1. STT (Ghim) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 2px',
                  fontWeight: 600,
                  color: '#334155',
                  textTransform: 'uppercase',
                  fontSize: 11
                }}
              >
                STT
              </th>

              {/* 2. MÃ MÁY (Ghim) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 32,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 6px',
                  fontWeight: 600,
                  color: '#334155',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  whiteSpace: 'nowrap'
                }}
              >
                MÃ MÁY
              </th>

              {/* 3. TÊN MÁY (Ghim) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 117,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 8px',
                  fontWeight: 600,
                  color: '#334155',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  whiteSpace: 'nowrap'
                }}
              >
                TÊN MÁY / THIẾT BỊ
              </th>

              {/* 4. TỔNG GIỜ (H) (Ghim) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 262,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 6px',
                  fontWeight: 600,
                  color: '#0284c7',
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  whiteSpace: 'nowrap'
                }}
              >
                TỔNG (H)
              </th>

              {/* 5. TB/NG (H) (Ghim) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 332,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 6px',
                  fontWeight: 600,
                  color: '#334155',
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  whiteSpace: 'nowrap'
                }}
                title="Giờ chạy trung bình trên các ngày máy có hoạt động thực tế (>0h)"
              >
                TB/NG
              </th>

              {/* 6. ĐÁNH GIÁ XU HƯỚNG (Ghim & có viền phân cách) */}
              <th
                className="sticky-col"
                style={{
                  position: 'sticky',
                  left: 397,
                  zIndex: 20,
                  background: '#f8fafc',
                  padding: '6px 6px',
                  fontWeight: 600,
                  color: '#334155',
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  borderRight: '2px solid #cbd5e1',
                  boxShadow: '3px 0 6px -2px rgba(0,0,0,0.08)'
                }}
                title="Đánh giá xu hướng giờ chạy nửa sau kỳ so với nửa đầu kỳ"
              >
                ĐÁNH GIÁ
              </th>

              {/* 7. CÁC CỘT NGÀY (28px) */}
              {heatmapData.dates.map((d, idx) => (
                <th
                  key={d.dateKey || idx}
                  style={{
                    padding: '6px 0',
                    fontWeight: 600,
                    color: '#334155',
                    textTransform: 'uppercase',
                    fontSize: 10.5,
                    borderLeft: '1px solid #e2e8f0',
                    textAlign: 'center'
                  }}
                  title={`${d.dayOfWeek} ${d.dateKey}`}
                >
                  {d.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredHeatmapList.map((m, idx) => {
              const isSelected = selectedMachineRow === m.machineCode
              const stickyBg = isSelected ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'

              return (
                <tr
                  key={m.machineCode}
                  onClick={() => setSelectedMachineRow(m.machineCode)}
                  className={`machine-matrix-row ${isSelected ? 'selected' : ''}`}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    cursor: 'pointer',
                    minHeight: 28
                  }}
                >
                  {/* 1. STT (Ghim) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 2px',
                      color: '#64748b',
                      fontWeight: 500,
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {idx + 1}
                  </td>

                  {/* 2. MÃ MÁY (Ghim) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 32,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 6px',
                      fontWeight: 600,
                      color: isSelected ? '#2563eb' : '#0f172a',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'middle'
                    }}
                    title={m.machineCode}
                  >
                    {m.machineCode}
                  </td>

                  {/* 3. TÊN MÁY (Ghim & Cho phép xuống dòng nếu tên dài) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 117,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 8px',
                      fontWeight: 500,
                      color: isSelected ? '#1d4ed8' : '#334155',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: 1.25,
                      fontSize: 11,
                      verticalAlign: 'middle'
                    }}
                    title={m.machineName}
                  >
                    {m.machineName}
                  </td>

                  {/* 4. TỔNG GIỜ (H) (Ghim) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 262,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0284c7',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle'
                    }}
                  >
                    {m.totalRuntime.toLocaleString('vi-VN')}
                  </td>

                  {/* 5. TB/NG (H) (Ghim) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 332,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#334155',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle'
                    }}
                    title={`TB ${m.avgDailyHours}h / ngày có chạy (${m.activeDaysCount}/${heatmapData.dates.length} ngày chạy, TB toàn kỳ: ${m.avgPeriodHours}h/ngày)`}
                  >
                    {m.avgDailyHours.toLocaleString('vi-VN')}
                  </td>

                  {/* 6. ĐÁNH GIÁ XU HƯỚNG (Ghim & có viền phân cách) */}
                  <td
                    className="sticky-col"
                    style={{
                      position: 'sticky',
                      left: 397,
                      zIndex: 10,
                      background: stickyBg,
                      padding: '4px 6px',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      fontSize: 11,
                      color: m.trendColor,
                      borderRight: '2px solid #cbd5e1',
                      boxShadow: '3px 0 6px -2px rgba(0,0,0,0.08)',
                      verticalAlign: 'middle'
                    }}
                    title={`Đánh giá xu hướng: ${m.trendText} ${m.trendSign ? `(${m.trendSign})` : ''}`}
                  >
                    <span>
                      {m.trendText} {m.trendSign ? `(${m.trendSign})` : ''}
                    </span>
                  </td>

                  {/* 7. Heatmap cells cho từng ngày (Direct <td>, Không bị che phủ màu khi hover row) */}
                  {m.daysData.map((d, dIdx) => {
                    return (
                      <td
                        key={d.date || dIdx}
                        className="matrix-cell"
                        style={{
                          padding: 0,
                          height: 28,
                          background: d.hBg,
                          color: d.hColor,
                          fontWeight: 600,
                          fontSize: 10.5,
                          fontVariantNumeric: 'tabular-nums',
                          borderLeft: '1px solid #e2e8f0',
                          verticalAlign: 'middle',
                          textAlign: 'center'
                        }}
                        title={d.tooltip}
                      >
                        {d.hText}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL XUẤT EXCEL CHUẨN HỆ THỐNG CHO BẢNG GIỜ CHẠY MÁY */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="XÁC NHẬN XUẤT EXCEL - THỜI GIAN CHẠY MÁY THEO NGÀY"
        reportName={`Báo cáo Thời gian chạy máy theo ngày (${plantName})`}
        totalRows={filteredHeatmapList.length}
        loadedCount={filteredHeatmapList.length}
        columns={matrixExcelColumns}
        activeFilters={{
          FactoryName: plantName,
          TotalMachines: `${filteredHeatmapList.length} máy`,
          TotalDays: `${heatmapData.dates.length} ngày`
        }}
        defaultFileName={`BaoCao_GioChayMay_${plantName.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`}
        onConfirmExport={executeExportMatrixExcel}
      />
    </div>
  )
}

export default MachineRuntimeSection
