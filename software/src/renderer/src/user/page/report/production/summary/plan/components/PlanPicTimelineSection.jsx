/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo, useRef, useEffect } from 'react'
import { TableProperties, ChevronDown, Check, TrendingUp } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { getWeekPeriodInfo } from '../utils/planChartCalculations'
import { SearchableMultiSelectDropdown } from '../../common/SearchableMultiSelectDropdown'

// 4 Nhóm trạng thái kế hoạch & màu sắc chuẩn
const STATUS_CONFIG = {
  khopSl: { name: 'Khớp SL', color: '#10b981', label: 'Khớp SL' }, // Green
  khopJob: { name: 'Khớp Job', color: '#3b82f6', label: 'Khớp Job' }, // Blue
  sxSaiNgay: { name: 'Sai ngày', color: '#f97316', label: 'Sai ngày' }, // Orange
  truotKh: { name: 'Trượt KH', color: '#ef4444', label: 'Trượt KH' } // Red
}

// Bảng màu phân biệt cho đường tăng trưởng của từng PIC
const PIC_LINE_PALETTE = [
  '#4f46e5', // Indigo
  '#0284c7', // Sky Blue
  '#0d9488', // Teal
  '#e11d48', // Rose
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#059669', // Emerald
  '#ea580c', // Orange
  '#db2777', // Pink
  '#2563eb', // Blue
  '#9333ea', // Violet
  '#16a34a' // Green
]

const getPicColor = (name = '', idx = 0) => {
  if (!name) return PIC_LINE_PALETTE[idx % PIC_LINE_PALETTE.length]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % PIC_LINE_PALETTE.length
  }
  return PIC_LINE_PALETTE[(hash + idx) % PIC_LINE_PALETTE.length]
}

// Lấy thứ trong tuần tiếng Việt
const getVNDayOfWeek = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return days[d.getDay()]
}

// Format dd/MM/yyyy
const formatVNDateFull = (dateStr) => {
  if (!dateStr) return ''
  if (dateStr.includes('/')) return dateStr
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

// Lấy tên ngắn gọn của PIC để hiển thị dưới cột
const getShortPicName = (fullName) => {
  if (!fullName || fullName === 'Chưa phân công') return 'Khác'
  const parts = String(fullName).trim().split(' ')
  return parts[parts.length - 1] || fullName
}

/**
 * Tooltip nổi bật hiển thị chi tiết khi hover vào cột hoặc điểm xu hướng
 */
function PlanTooltipPopup({ hoveredBar }) {
  if (!hoveredBar) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: Math.max(10, (hoveredBar.x || 0) + (hoveredBar.isSummary ? 0 : 45) - 90),
        top: Math.max(10, (hoveredBar.y || 0) - 120),
        background: '#ffffff',
        border: hoveredBar.isTrendPoint
          ? `1.5px solid ${hoveredBar.picColor || '#6366f1'}`
          : '1.5px solid #3b82f6',
        borderRadius: 6,
        padding: '8px 12px',
        boxShadow:
          '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
        zIndex: 50,
        pointerEvents: 'none',
        minWidth: 200,
        boxSizing: 'border-box'
      }}
    >
      {hoveredBar.isTrendPoint ? (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: hoveredBar.picColor || '#4338ca',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 4,
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: hoveredBar.picColor || '#4338ca',
                display: 'inline-block'
              }}
            />
            <span>{hoveredBar.fullDateStr}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#334155', marginBottom: 4 }}>
            PIC: <b style={{ color: hoveredBar.picColor || '#0f172a' }}>{hoveredBar.picName}</b>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 4
            }}
          >
            Khối lượng:{' '}
            <b style={{ color: hoveredBar.picColor || '#4338ca' }}>
              {hoveredBar.totalOrders} lệnh
            </b>
          </div>
          <div style={{ fontSize: 11.5, color: '#334155' }}>
            Tăng trưởng so với kỳ trước:{' '}
            {hoveredBar.growthPct !== null ? (
              <b
                style={{
                  color:
                    hoveredBar.growthPct > 0
                      ? '#16a34a'
                      : hoveredBar.growthPct < 0
                        ? '#dc2626'
                        : '#475569'
                }}
              >
                {hoveredBar.growthPct > 0
                  ? `+${hoveredBar.growthPct}%`
                  : `${hoveredBar.growthPct}%`}
              </b>
            ) : (
              <span style={{ color: '#64748b' }}>Kỳ đầu tiên</span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#1e3a8a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 4,
              marginBottom: 6
            }}
          >
            {hoveredBar.picName} - {hoveredBar.fullDateStr}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 6
            }}
          >
            Tổng lệnh: {hoveredBar.totalOrders}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              fontSize: 11.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: STATUS_CONFIG.khopSl.color,
                  borderRadius: 2
                }}
              />
              <span style={{ color: '#334155' }}>Khớp SL:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: 'auto' }}>
                {hoveredBar.khopSl} ({hoveredBar.khopSlRate}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: STATUS_CONFIG.khopJob.color,
                  borderRadius: 2
                }}
              />
              <span style={{ color: '#334155' }}>Khớp Job:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: 'auto' }}>
                {hoveredBar.khopJob} ({hoveredBar.khopJobRate}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: STATUS_CONFIG.sxSaiNgay.color,
                  borderRadius: 2
                }}
              />
              <span style={{ color: '#334155' }}>Sai ngày:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: 'auto' }}>
                {hoveredBar.sxSaiNgay} ({hoveredBar.sxSaiNgayRate}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: STATUS_CONFIG.truotKh.color,
                  borderRadius: 2
                }}
              />
              <span style={{ color: '#334155' }}>Trượt KH:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: 'auto' }}>
                {hoveredBar.truotKh} ({hoveredBar.truotKhRate}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PlanPicTimelineSection({
  picTimelineBreakdown = {
    dailyList: [],
    monthlyList: [],
    quarterlyList: [],
    picList: []
  },
  picBreakdown = [],
  plantName = 'Nhà máy GS Hà Nội',
  totalDays = 1,
  selectedPic = 'ALL',
  onSelectPic,
  picOptions = []
}) {
  // 1. Quản lý Tab chuẩn ERP giống Section 3 & 4
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' (Diễn biến theo thời gian) | 'summary' (Cơ cấu tổng hợp)
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'weekly' | 'monthly' | 'quarterly'
  const [selectedPicList, setSelectedPicList] = useState([]) // Mảng các PIC được chọn (Rỗng = Tất cả)
  const [showTable, setShowTable] = useState(true)
  const [showGrowthLine, setShowGrowthLine] = useState(true) // Bật/tắt đường xu hướng tăng trưởng

  // 4 Trạng thái chuỗi dữ liệu (Bật/tắt theo Legend)
  const [visibleSeries, setVisibleSeries] = useState({
    khopSl: true,
    khopJob: true,
    sxSaiNgay: true,
    truotKh: true
  })

  // Hàm bật/tắt hiển thị từng nhóm kết quả (Click để bật/tắt, Click đúp để chỉ hiện 1 nhóm)
  const handleToggleSeries = (key, e) => {
    e?.stopPropagation()
    setVisibleSeries((prev) => {
      // Nếu click đúp hoặc Alt click: chỉ hiện duy nhất mục này
      if (e?.altKey || e?.detail === 2) {
        return {
          khopSl: key === 'khopSl',
          khopJob: key === 'khopJob',
          sxSaiNgay: key === 'sxSaiNgay',
          truotKh: key === 'truotKh'
        }
      }
      const next = { ...prev, [key]: !prev[key] }
      // Nếu tắt hết cả 4 mục thì tự khôi phục bật lại tất cả
      const hasActive = Object.values(next).some(Boolean)
      if (!hasActive) {
        return { khopSl: true, khopJob: true, sxSaiNgay: true, truotKh: true }
      }
      return next
    })
  }

  // Tooltip hover
  const [hoveredBar, setHoveredBar] = useState(null)
  const chartContainerRef = useRef(null)

  // Danh sách toàn bộ PIC
  const allPicList = useMemo(() => {
    if (picOptions && picOptions.length > 0) {
      const list = picOptions
        .map((o) => (typeof o === 'string' ? o : o.value || o.name || o.label))
        .filter((x) => Boolean(x) && x !== 'ALL')
      if (list.length > 0) return list
    }
    if (picTimelineBreakdown?.picList?.length > 0) return picTimelineBreakdown.picList
    if (picBreakdown?.length > 0) return picBreakdown.map((p) => p.pic || p.name).filter(Boolean)
    return []
  }, [picOptions, picTimelineBreakdown, picBreakdown])

  // Options dạng mảng cho SearchableMultiSelectDropdown
  const picDropdownOptions = useMemo(() => {
    return allPicList.map((p) => ({ value: p, label: p }))
  }, [allPicList])

  // Lọc danh sách PIC theo multi-select dropdown
  const activePicList = useMemo(() => {
    if (selectedPicList && selectedPicList.length > 0) {
      return allPicList.filter((p) => selectedPicList.includes(p))
    }
    return allPicList
  }, [allPicList, selectedPicList])

  const dailyList = picTimelineBreakdown?.dailyList || []
  const quarterlyList = picTimelineBreakdown?.quarterlyList || []

  // Gom nhóm dữ liệu theo Tuần (Weekly)
  const weeklyList = useMemo(() => {
    if (picTimelineBreakdown?.weeklyList?.length > 0) {
      return picTimelineBreakdown.weeklyList
    }
    if (!dailyList || dailyList.length === 0) return []

    const map = new Map()
    dailyList.forEach((dayItem) => {
      const dateStr = dayItem.date || dayItem.StatDate || dayItem.prodDate || ''
      const { weekKey, shortDate: wShort, displayDate: wLabel } = getWeekPeriodInfo(dateStr)

      if (!map.has(weekKey)) {
        map.set(weekKey, {
          date: weekKey,
          shortDate: wShort,
          periodLabel: wLabel,
          name: wShort,
          totalOrders: 0,
          khopSl: 0,
          khopJob: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          picStats: {}
        })
      }
      const agg = map.get(weekKey)
      agg.totalOrders += Number(dayItem.totalOrders || 0)
      agg.khopSl += Number(dayItem.khopSl || 0)
      agg.khopJob += Number(dayItem.khopJob || 0)
      agg.sxSaiNgay += Number(dayItem.sxSaiNgay || 0)
      agg.truotKh += Number(dayItem.truotKh || 0)

      if (dayItem.picStats) {
        Object.entries(dayItem.picStats).forEach(([p, stats]) => {
          if (!agg.picStats[p]) {
            agg.picStats[p] = { totalOrders: 0, khopSl: 0, khopJob: 0, sxSaiNgay: 0, truotKh: 0 }
          }
          agg.picStats[p].totalOrders += Number(stats.totalOrders || 0)
          agg.picStats[p].khopSl += Number(stats.khopSl || 0)
          agg.picStats[p].khopJob += Number(stats.khopJob || 0)
          agg.picStats[p].sxSaiNgay += Number(stats.sxSaiNgay || 0)
          agg.picStats[p].truotKh += Number(stats.truotKh || 0)
        })
      }
      allPicList.forEach((p) => {
        if (dayItem[`${p}_orders`]) {
          agg[`${p}_orders`] = (agg[`${p}_orders`] || 0) + Number(dayItem[`${p}_orders`] || 0)
          agg[`${p}_khopSl`] = (agg[`${p}_khopSl`] || 0) + Number(dayItem[`${p}_khopSl`] || 0)
          agg[`${p}_khopJob`] = (agg[`${p}_khopJob`] || 0) + Number(dayItem[`${p}_khopJob`] || 0)
          agg[`${p}_sxSaiNgay`] = (agg[`${p}_sxSaiNgay`] || 0) + Number(dayItem[`${p}_sxSaiNgay`] || 0)
          agg[`${p}_truotKh`] = (agg[`${p}_truotKh`] || 0) + Number(dayItem[`${p}_truotKh`] || 0)
        }
      })
    })

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [picTimelineBreakdown, dailyList, allPicList])

  // Gom nhóm dữ liệu theo Tháng (Monthly)
  const monthlyList = useMemo(() => {
    if (picTimelineBreakdown?.monthlyList?.length > 0) {
      return picTimelineBreakdown.monthlyList
    }
    if (!dailyList || dailyList.length === 0) return []

    const map = new Map()
    dailyList.forEach((dayItem) => {
      const dateStr = dayItem.date || dayItem.StatDate || dayItem.prodDate || ''
      if (!dateStr || dateStr.length < 7) return
      const mKey = dateStr.slice(0, 7)
      const parts = mKey.split('-')
      const mLabel = parts.length === 2 ? `Tháng ${parseInt(parts[1], 10)}/${parts[0]}` : mKey
      const mShort = parts.length === 2 ? `T${parseInt(parts[1], 10)}/${parts[0].slice(2)}` : mKey

      if (!map.has(mKey)) {
        map.set(mKey, {
          date: mKey,
          shortDate: mShort,
          periodLabel: mLabel,
          name: mLabel,
          totalOrders: 0,
          khopSl: 0,
          khopJob: 0,
          sxSaiNgay: 0,
          truotKh: 0,
          picStats: {}
        })
      }
      const agg = map.get(mKey)
      agg.totalOrders += Number(dayItem.totalOrders || 0)
      agg.khopSl += Number(dayItem.khopSl || 0)
      agg.khopJob += Number(dayItem.khopJob || 0)
      agg.sxSaiNgay += Number(dayItem.sxSaiNgay || 0)
      agg.truotKh += Number(dayItem.truotKh || 0)

      if (dayItem.picStats) {
        Object.entries(dayItem.picStats).forEach(([p, stats]) => {
          if (!agg.picStats[p]) {
            agg.picStats[p] = { totalOrders: 0, khopSl: 0, khopJob: 0, sxSaiNgay: 0, truotKh: 0 }
          }
          agg.picStats[p].totalOrders += Number(stats.totalOrders || 0)
          agg.picStats[p].khopSl += Number(stats.khopSl || 0)
          agg.picStats[p].khopJob += Number(stats.khopJob || 0)
          agg.picStats[p].sxSaiNgay += Number(stats.sxSaiNgay || 0)
          agg.picStats[p].truotKh += Number(stats.truotKh || 0)
        })
      }
      allPicList.forEach((p) => {
        if (dayItem[`${p}_orders`]) {
          agg[`${p}_orders`] = (agg[`${p}_orders`] || 0) + Number(dayItem[`${p}_orders`] || 0)
          agg[`${p}_khopSl`] = (agg[`${p}_khopSl`] || 0) + Number(dayItem[`${p}_khopSl`] || 0)
          agg[`${p}_khopJob`] = (agg[`${p}_khopJob`] || 0) + Number(dayItem[`${p}_khopJob`] || 0)
          agg[`${p}_sxSaiNgay`] = (agg[`${p}_sxSaiNgay`] || 0) + Number(dayItem[`${p}_sxSaiNgay`] || 0)
          agg[`${p}_truotKh`] = (agg[`${p}_truotKh`] || 0) + Number(dayItem[`${p}_truotKh`] || 0)
        }
      })
    })

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [picTimelineBreakdown, dailyList, allPicList])

  // Danh sách chu kỳ dữ liệu đang kích hoạt (Ngày / Tuần / Tháng / Quý)
  const activeTimelineList = useMemo(() => {
    if (periodType === 'weekly' && weeklyList.length > 0) {
      return weeklyList
    }
    if (periodType === 'monthly' && monthlyList.length > 0) {
      return monthlyList
    }
    if (periodType === 'quarterly' && quarterlyList.length > 0) {
      return quarterlyList
    }
    return dailyList
  }, [periodType, weeklyList, monthlyList, quarterlyList, dailyList])

  // Dữ liệu từng mốc thời gian & từng PIC trong mốc đó
  const timelineData = useMemo(() => {
    return activeTimelineList.map((item, idx) => {
      const dateStr = item.date || item.periodKey || `item_${idx}`
      const shortLabel =
        item.shortDate ||
        item.name ||
        (dateStr.length >= 10 ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}` : dateStr)
      const fullDateStr =
        periodType === 'daily'
          ? formatVNDateFull(dateStr)
          : item.periodLabel || item.name || shortLabel

      // Số liệu từng PIC trong mốc này
      const picsInPeriod = activePicList.map((p) => {
        const stat = item.picStats?.[p] || {
          totalOrders: item[`${p}_orders`] || item[p] || 0,
          khopSl: item[`${p}_khopSl`] || 0,
          khopJob: item[`${p}_khopJob`] || 0,
          sxSaiNgay: item[`${p}_sxSaiNgay`] || 0,
          truotKh: item[`${p}_truotKh`] || 0
        }
        const total = stat.totalOrders || 0
        const khopSl = stat.khopSl || 0
        const khopJob = stat.khopJob || 0
        const sxSaiNgay = stat.sxSaiNgay || 0
        const truotKh = stat.truotKh || 0

        return {
          fullName: p,
          shortName: getShortPicName(p),
          totalOrders: total,
          khopSl,
          khopJob,
          sxSaiNgay,
          truotKh,
          khopSlRate: total > 0 ? Number(((khopSl / total) * 100).toFixed(1)) : 0,
          khopJobRate: total > 0 ? Number(((khopJob / total) * 100).toFixed(1)) : 0,
          sxSaiNgayRate: total > 0 ? Number(((sxSaiNgay / total) * 100).toFixed(1)) : 0,
          truotKhRate: total > 0 ? Number(((truotKh / total) * 100).toFixed(1)) : 0
        }
      })

      // Sắp xếp PIC theo tổng lệnh giảm dần mặc định
      picsInPeriod.sort((a, b) => b.totalOrders - a.totalOrders)

      // Tổng cộng trong mốc này
      const periodTotalOrders = picsInPeriod.reduce((sum, p) => sum + p.totalOrders, 0)
      const periodKhopSl = picsInPeriod.reduce((sum, p) => sum + p.khopSl, 0)
      const periodKhopJob = picsInPeriod.reduce((sum, p) => sum + p.khopJob, 0)
      const periodSxSaiNgay = picsInPeriod.reduce((sum, p) => sum + p.sxSaiNgay, 0)
      const periodTruotKh = picsInPeriod.reduce((sum, p) => sum + p.truotKh, 0)

      return {
        dateKey: dateStr,
        fullDateStr,
        shortLabel,
        periodTotalOrders,
        periodKhopSl,
        periodKhopJob,
        periodSxSaiNgay,
        periodTruotKh,
        periodKhopSlRate:
          periodTotalOrders > 0
            ? Number(((periodKhopSl / periodTotalOrders) * 100).toFixed(1))
            : 0,
        periodKhopJobRate:
          periodTotalOrders > 0
            ? Number(((periodKhopJob / periodTotalOrders) * 100).toFixed(1))
            : 0,
        periodSxSaiNgayRate:
          periodTotalOrders > 0
            ? Number(((periodSxSaiNgay / periodTotalOrders) * 100).toFixed(1))
            : 0,
        periodTruotKhRate:
          periodTotalOrders > 0
            ? Number(((periodTruotKh / periodTotalOrders) * 100).toFixed(1))
            : 0,
        pics: picsInPeriod
      }
    })
  }, [activeTimelineList, activePicList, periodType])

  // Tối đa 7 ngày trên mỗi hàng biểu đồ (tự động ngắt dòng khi > 7 ngày)
  const MAX_DAYS_PER_ROW = 7

  // Phân chia dữ liệu dòng thời gian thành từng khối hàng (mỗi hàng tối đa 7 ngày)
  const timelineChunks = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return []
    const chunks = []
    for (let i = 0; i < timelineData.length; i += MAX_DAYS_PER_ROW) {
      chunks.push(timelineData.slice(i, i + MAX_DAYS_PER_ROW))
    }
    return chunks
  }, [timelineData])

  // Tính toán % tăng trưởng xuyên suốt cho từng PIC trên toàn bộ chuỗi thời gian
  const picGrowthMap = useMemo(() => {
    const prevVals = new Map()
    const map = new Map()

    timelineData.forEach((item) => {
      item.pics.forEach((pic) => {
        const vKhopSl = visibleSeries.khopSl ? pic.khopSl : 0
        const vKhopJob = visibleSeries.khopJob ? pic.khopJob : 0
        const vSxSaiNgay = visibleSeries.sxSaiNgay ? pic.sxSaiNgay : 0
        const vTruotKh = visibleSeries.truotKh ? pic.truotKh : 0
        const vTotal = vKhopSl + vKhopJob + vSxSaiNgay + vTruotKh

        const key = `${item.dateKey}_${pic.fullName}`
        const prev = prevVals.get(pic.fullName)
        let growthPct = null
        if (prev !== undefined && prev !== null) {
          if (prev > 0) {
            growthPct = Number((((vTotal - prev) / prev) * 100).toFixed(1))
          } else if (prev === 0 && vTotal > 0) {
            growthPct = 100
          } else if (prev === 0 && vTotal === 0) {
            growthPct = 0
          }
        }
        map.set(key, growthPct)
        prevVals.set(pic.fullName, vTotal)
      })
    })
    return map
  }, [timelineData, visibleSeries])

  // Dữ liệu Cơ cấu tổng hợp gom lại theo từng PIC (Cho Tab Summary)
  const picSummaryData = useMemo(() => {
    const list = activePicList.map((p) => {
      let totalOrders = 0
      let totalKhopSl = 0
      let totalKhopJob = 0
      let totalSxSaiNgay = 0
      let totalTruotKh = 0

      activeTimelineList.forEach((item) => {
        const stat = item.picStats?.[p] || {
          totalOrders: item[`${p}_orders`] || item[p] || 0,
          khopSl: item[`${p}_khopSl`] || 0,
          khopJob: item[`${p}_khopJob`] || 0,
          sxSaiNgay: item[`${p}_sxSaiNgay`] || 0,
          truotKh: item[`${p}_truotKh`] || 0
        }
        totalOrders += stat.totalOrders || 0
        totalKhopSl += stat.khopSl || 0
        totalKhopJob += stat.khopJob || 0
        totalSxSaiNgay += stat.sxSaiNgay || 0
        totalTruotKh += stat.truotKh || 0
      })

      const totalPass = totalKhopSl + totalKhopJob
      const passRate = totalOrders > 0 ? Number(((totalPass / totalOrders) * 100).toFixed(1)) : 0
      const khopSlRate =
        totalOrders > 0 ? Number(((totalKhopSl / totalOrders) * 100).toFixed(1)) : 0
      const khopJobRate =
        totalOrders > 0 ? Number(((totalKhopJob / totalOrders) * 100).toFixed(1)) : 0
      const sxSaiNgayRate =
        totalOrders > 0 ? Number(((totalSxSaiNgay / totalOrders) * 100).toFixed(1)) : 0
      const truotKhRate =
        totalOrders > 0 ? Number(((totalTruotKh / totalOrders) * 100).toFixed(1)) : 0

      return {
        fullName: p,
        shortName: getShortPicName(p),
        totalOrders,
        khopSl: totalKhopSl,
        khopJob: totalKhopJob,
        sxSaiNgay: totalSxSaiNgay,
        truotKh: totalTruotKh,
        totalPass,
        passRate,
        khopSlRate,
        khopJobRate,
        sxSaiNgayRate,
        truotKhRate
      }
    })

    return list.sort((a, b) => b.totalOrders - a.totalOrders)
  }, [activePicList, activeTimelineList])

  // Tổng cộng toàn xưởng cho Table Footer
  const tableGrandTotal = useMemo(() => {
    const totalOrders = picSummaryData.reduce((sum, p) => sum + p.totalOrders, 0)
    const khopSl = picSummaryData.reduce((sum, p) => sum + p.khopSl, 0)
    const khopJob = picSummaryData.reduce((sum, p) => sum + p.khopJob, 0)
    const sxSaiNgay = picSummaryData.reduce((sum, p) => sum + p.sxSaiNgay, 0)
    const truotKh = picSummaryData.reduce((sum, p) => sum + p.truotKh, 0)
    const totalPass = khopSl + khopJob
    const passRate = totalOrders > 0 ? Number(((totalPass / totalOrders) * 100).toFixed(1)) : 0
    const khopSlRate = totalOrders > 0 ? Number(((khopSl / totalOrders) * 100).toFixed(1)) : 0
    const khopJobRate = totalOrders > 0 ? Number(((khopJob / totalOrders) * 100).toFixed(1)) : 0
    const sxSaiNgayRate = totalOrders > 0 ? Number(((sxSaiNgay / totalOrders) * 100).toFixed(1)) : 0
    const truotKhRate = totalOrders > 0 ? Number(((truotKh / totalOrders) * 100).toFixed(1)) : 0

    return {
      totalOrders,
      khopSl,
      khopJob,
      sxSaiNgay,
      truotKh,
      totalPass,
      passRate,
      khopSlRate,
      khopJobRate,
      sxSaiNgayRate,
      truotKhRate
    }
  }, [picSummaryData])

  // Tính Y-Max cho biểu đồ (Số lượng lệnh theo các chuỗi đang bật)
  const maxYValue = useMemo(() => {
    let max = 0
    if (viewTab === 'timeline') {
      timelineData.forEach((d) => {
        d.pics.forEach((p) => {
          let total = 0
          if (visibleSeries.khopSl) total += Number(p.khopSl || 0)
          if (visibleSeries.khopJob) total += Number(p.khopJob || 0)
          if (visibleSeries.sxSaiNgay) total += Number(p.sxSaiNgay || 0)
          if (visibleSeries.truotKh) total += Number(p.truotKh || 0)
          if (total > max) max = total
        })
      })
    } else {
      picSummaryData.forEach((p) => {
        let total = 0
        if (visibleSeries.khopSl) total += Number(p.khopSl || 0)
        if (visibleSeries.khopJob) total += Number(p.khopJob || 0)
        if (visibleSeries.sxSaiNgay) total += Number(p.sxSaiNgay || 0)
        if (visibleSeries.truotKh) total += Number(p.truotKh || 0)
        if (total > max) max = total
      })
    }
    if (max <= 0) return 100
    const rounded = Math.ceil((max + 10) / 20) * 20
    return Math.max(rounded, 40)
  }, [timelineData, picSummaryData, viewTab, visibleSeries])

  // Trục Y ticks
  const yTicks = useMemo(() => {
    const ticks = []
    const step = maxYValue <= 100 ? 20 : maxYValue <= 200 ? 20 : 50
    for (let v = 0; v <= maxYValue; v += step) {
      ticks.push(v)
    }
    return ticks
  }, [maxYValue])

  // ResizeObserver đo lường chiều rộng khung biểu đồ thực tế để dãn cách tự động
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!chartContainerRef.current) return
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const w = chartContainerRef.current.clientWidth
        if (w > 0) setContainerWidth(w)
      }
    }
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(chartContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Kích thước SVG & Điều chỉnh độ rộng cột thông minh theo chiều rộng màn hình
  const chartHeight = 280
  const yAxisWidth = 45
  const topPadding = 30
  const bottomPicNameHeight = 55
  const bottomDateBoxHeight = 32
  const availablePlotHeight = chartHeight - topPadding
  const availablePlotWidth = Math.max((containerWidth || 1000) - yAxisWidth - 8, 300)

  const isSinglePic = activePicList.length === 1
  const minBarWidth = isSinglePic ? 24 : 12

  const scaleY = (val) => {
    if (maxYValue <= 0) return availablePlotHeight
    return availablePlotHeight - (val / maxYValue) * availablePlotHeight
  }

  const heightFromVal = (val) => {
    if (maxYValue <= 0) return 0
    return (val / maxYValue) * availablePlotHeight
  }

  const totalChartHeight =
    chartHeight +
    (viewTab === 'timeline'
      ? bottomPicNameHeight + bottomDateBoxHeight + 10
      : bottomPicNameHeight + 20)

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        padding: '8px 0',
        marginBottom: 36,
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. Header (NẰM Ở TRÊN CÙNG ĐỘC LẬP) */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>2. TỔNG LỆNH VÀ CƠ CẤU KẾT QUẢ THEO NGÀY ĐĂNG KÝ KẾ HOẠCH, SO SÁNH GIỮA CÁC PIC</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
          Theo dõi khối lượng lệnh và cơ cấu kết quả điều phối (Khớp SL, Khớp Job, Sai ngày, Trượt KH) của{' '}
          <b>{activePicList.length} nhân sự điều phối (PIC)</b> tại {plantName}.
        </div>
      </div>

      {/* 2. Thanh công cụ & Bộ lọc chuẩn ERP (HÀNG RIÊNG BIỆT DƯỚI TIÊU ĐỀ) */}
      <div
        className="screenshot-hide"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14
        }}
      >
        {/* Nhóm điều khiển bên trái: Chế độ xem & Chu kỳ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Toggle View: Diễn biến vs Cơ cấu */}
          <Tabs value={viewTab} onValueChange={setViewTab}>
            <TabsList>
              <TabsTrigger value="timeline">Diễn biến theo thời gian</TabsTrigger>
              <TabsTrigger value="summary">Cơ cấu tổng hợp</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period selector if in timeline mode: Ngày / Tuần / Tháng / Quý */}
          {viewTab === 'timeline' && (
            <Tabs value={periodType} onValueChange={setPeriodType}>
              <TabsList>
                <TabsTrigger value="daily">Ngày</TabsTrigger>
                <TabsTrigger value="weekly">Tuần</TabsTrigger>
                {monthlyList.length > 0 && <TabsTrigger value="monthly">Tháng</TabsTrigger>}
                {quarterlyList.length > 0 && <TabsTrigger value="quarterly">Quý</TabsTrigger>}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Nhóm điều khiển bên phải: Bộ lọc PIC (Multi-select) & Mở bảng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Bộ lọc PIC Đa lựa chọn có tìm kiếm chuẩn ERP */}
          {viewTab === 'timeline' && (
            <SearchableMultiSelectDropdown
              options={picDropdownOptions}
              value={selectedPicList}
              onChange={setSelectedPicList}
              placeholder={`Tất cả PIC (${allPicList.length})`}
              minWidth="160px"
              maxWidth="280px"
              dropdownWidth="280px"
            />
          )}

          {/* Nút Đóng / Mở bảng số liệu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            className={`uppercase text-[11px] font-semibold ${
              showTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng chi tiết"
          >
            <TableProperties size={13} className={showTable ? 'text-blue-600' : 'text-slate-500'} />
            <span>{showTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KHUNG BIỂU ĐỒ (VUÔNG VỨC borderRadius: 0, VIỀN PHẲNG GIỐNG Y HỆT MỤC 1) */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 0,
          padding: '16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Thanh chú giải (Legend) phẳng chuẩn ERP - Nhấp để bật/tắt chỉ tiêu hoặc Line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 14,
            userSelect: 'none'
          }}
        >
          {/* 4 Nhóm trạng thái kế hoạch & Đường tăng trưởng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px 20px'
            }}
          >
            {[
              { key: 'khopSl', label: 'Khớp SL', color: STATUS_CONFIG.khopSl.color },
              { key: 'khopJob', label: 'Khớp Job', color: STATUS_CONFIG.khopJob.color },
              { key: 'sxSaiNgay', label: 'Sai ngày', color: STATUS_CONFIG.sxSaiNgay.color },
              { key: 'truotKh', label: 'Trượt KH', color: STATUS_CONFIG.truotKh.color }
            ].map((item) => {
              const isVisible = visibleSeries[item.key] !== false
              return (
                <div
                  key={item.key}
                  onClick={(e) => handleToggleSeries(item.key, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isVisible ? 700 : 500,
                    color: isVisible ? '#1e293b' : '#94a3b8',
                    textDecoration: isVisible ? 'none' : 'line-through',
                    opacity: isVisible ? 1 : 0.55,
                    transition: 'all 0.15s ease'
                  }}
                  title={`Bấm để ${isVisible ? 'ẩn' : 'hiện'} nhóm "${item.label}"`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: isVisible ? item.color : '#cbd5e1',
                      borderRadius: 2,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              )
            })}

            {/* Đường xu hướng tăng trưởng trong Legend (Click để ẩn/hiện trực tiếp) */}
            {viewTab === 'timeline' && (
              <div
                onClick={() => setShowGrowthLine((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: showGrowthLine ? 700 : 500,
                  color: showGrowthLine ? '#4338ca' : '#94a3b8',
                  textDecoration: showGrowthLine ? 'none' : 'line-through',
                  opacity: showGrowthLine ? 1 : 0.55,
                  transition: 'all 0.15s ease'
                }}
                title={`Bấm để ${showGrowthLine ? 'ẩn' : 'hiện'} đường line tăng trưởng của từng PIC`}
              >
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 16 }}>
                  <span
                    style={{
                      width: 16,
                      height: 2,
                      backgroundColor: showGrowthLine ? '#6366f1' : '#cbd5e1',
                      borderRadius: 1
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: 4,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: `1.5px solid ${showGrowthLine ? '#6366f1' : '#cbd5e1'}`
                    }}
                  />
                </div>
                <span>Line tăng trưởng từng PIC</span>
              </div>
            )}
          </div>
        </div>

        {/* Khung vẽ SVG Biểu đồ cột xếp chồng (Tự động ngắt dòng tối đa 7 ngày/dòng) */}
        <div
          ref={chartContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: 4
          }}
        >
          {viewTab === 'timeline' ? (
            /* TAB 1: DIỄN BIẾN THEO THỜI GIAN (TỰ ĐỘNG NGẮT DÒNG TỐI ĐA 7 NGÀY/DÒNG) */
            timelineChunks.length === 0 ? (
              <div
                style={{
                  height: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 13
                }}
              >
                Không có dữ liệu trong khoảng thời gian đã chọn
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {timelineChunks.map((chunk, rowIdx) => {
                  const picCount = Math.max(activePicList.length, 1)
                  const groupWidth = availablePlotWidth / Math.max(chunk.length, 1)

                  const rowPicTracks = new Map()
                  activePicList.forEach((p, idx) => {
                    rowPicTracks.set(p, {
                      picName: p,
                      color: getPicColor(p, idx),
                      points: []
                    })
                  })

                  let currentX = 0
                  const dayGroups = chunk.map((item, dIdx) => {
                    const groupStartX = currentX
                    currentX += groupWidth

                    const maxBarW = isSinglePic ? 34 : 22
                    const availableForBars = groupWidth - 18
                    const barWidth = Math.min(
                      maxBarW,
                      Math.max(minBarWidth, Math.floor(availableForBars / picCount) - 3)
                    )
                    const barGap = isSinglePic ? 0 : Math.min(6, Math.max(2, Math.floor(barWidth * 0.2)))
                    const contentWidth = picCount * barWidth + Math.max(0, picCount - 1) * barGap
                    const dayPadding = Math.max(6, (groupWidth - contentWidth) / 2)

                    return (
                      <g key={`timeline-group-${item.dateKey || dIdx}`}>
                        {dIdx > 0 && (
                          <line
                            x1={groupStartX}
                            y1={topPadding}
                            x2={groupStartX}
                            y2={topPadding + availablePlotHeight + bottomPicNameHeight}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                          />
                        )}

                        {item.pics.map((pic, pIdx) => {
                          const barX = groupStartX + dayPadding + pIdx * (barWidth + barGap)
                          const totalOrders = pic.totalOrders || 0

                          const vKhopSl = visibleSeries.khopSl ? pic.khopSl : 0
                          const vKhopJob = visibleSeries.khopJob ? pic.khopJob : 0
                          const vSxSaiNgay = visibleSeries.sxSaiNgay ? pic.sxSaiNgay : 0
                          const vTruotKh = visibleSeries.truotKh ? pic.truotKh : 0
                          const vTotal = vKhopSl + vKhopJob + vSxSaiNgay + vTruotKh

                          const hKhopSl = heightFromVal(vKhopSl)
                          const hKhopJob = heightFromVal(vKhopJob)
                          const hSxSaiNgay = heightFromVal(vSxSaiNgay)
                          const hTruotKh = heightFromVal(vTruotKh)

                          const baseBottom = topPadding + availablePlotHeight
                          const yKhopSl = baseBottom - hKhopSl
                          const yKhopJob = yKhopSl - hKhopJob
                          const ySxSaiNgay = yKhopJob - hSxSaiNgay
                          const yTruotKh = ySxSaiNgay - hTruotKh
                          const topY = baseBottom - heightFromVal(vTotal)

                          const growthPct = picGrowthMap.get(`${item.dateKey}_${pic.fullName}`) ?? null
                          const track = rowPicTracks.get(pic.fullName)
                          if (track) {
                            track.points.push({
                              x: barX + barWidth / 2,
                              y: topY,
                              value: vTotal,
                              growthPct,
                              dateKey: item.dateKey,
                              fullDateStr: item.fullDateStr,
                              shortLabel: item.shortLabel,
                              picName: pic.fullName,
                              color: track.color
                            })
                          }

                          const isHovered =
                            hoveredBar?.rowIdx === rowIdx &&
                            hoveredBar?.dateKey === item.dateKey &&
                            hoveredBar?.picName === pic.fullName

                          return (
                            <g
                              key={`bar-${item.dateKey}-${pic.fullName}-${pIdx}`}
                              onMouseEnter={() => {
                                setHoveredBar({
                                  rowIdx,
                                  dateKey: item.dateKey,
                                  fullDateStr: item.fullDateStr,
                                  picName: pic.fullName,
                                  picColor: track?.color || '#3b82f6',
                                  totalOrders,
                                  khopSl: pic.khopSl,
                                  khopJob: pic.khopJob,
                                  sxSaiNgay: pic.sxSaiNgay,
                                  truotKh: pic.truotKh,
                                  khopSlRate: pic.khopSlRate,
                                  khopJobRate: pic.khopJobRate,
                                  sxSaiNgayRate: pic.sxSaiNgayRate,
                                  truotKhRate: pic.truotKhRate,
                                  x: barX + barWidth / 2,
                                  y: topY
                                })
                              }}
                              onMouseLeave={() => setHoveredBar(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isHovered && (
                                <rect
                                  x={barX - 2}
                                  y={topY - 4}
                                  width={barWidth + 4}
                                  height={baseBottom - topY + 4}
                                  fill="rgba(59, 130, 246, 0.1)"
                                  stroke={track?.color || '#3b82f6'}
                                  strokeWidth="1.5"
                                />
                              )}

                              {hKhopSl > 0 && (
                                <rect
                                  x={barX}
                                  y={yKhopSl}
                                  width={barWidth}
                                  height={hKhopSl}
                                  fill={STATUS_CONFIG.khopSl.color}
                                />
                              )}

                              {hKhopJob > 0 && (
                                <rect
                                  x={barX}
                                  y={yKhopJob}
                                  width={barWidth}
                                  height={hKhopJob}
                                  fill={STATUS_CONFIG.khopJob.color}
                                />
                              )}

                              {hSxSaiNgay > 0 && (
                                <rect
                                  x={barX}
                                  y={ySxSaiNgay}
                                  width={barWidth}
                                  height={hSxSaiNgay}
                                  fill={STATUS_CONFIG.sxSaiNgay.color}
                                />
                              )}

                              {hTruotKh > 0 && (
                                <rect
                                  x={barX}
                                  y={yTruotKh}
                                  width={barWidth}
                                  height={hTruotKh}
                                  fill={STATUS_CONFIG.truotKh.color}
                                />
                              )}

                              {totalOrders > 0 && (
                                <text
                                  x={barX + barWidth / 2}
                                  y={topY - 5}
                                  fill="#0f172a"
                                  fontSize={10}
                                  fontWeight={700}
                                  textAnchor="middle"
                                >
                                  {totalOrders}
                                </text>
                              )}

                              <text
                                x={barX + barWidth / 2 + 3}
                                y={baseBottom + 8}
                                fill="#334155"
                                fontSize={10.5}
                                fontWeight={600}
                                textAnchor="start"
                                transform={`rotate(90, ${barX + barWidth / 2 + 3}, ${baseBottom + 8})`}
                              >
                                {pic.shortName}
                              </text>
                            </g>
                          )
                        })}

                        <g
                          transform={`translate(${groupStartX}, ${topPadding + availablePlotHeight + bottomPicNameHeight})`}
                        >
                          <rect
                            x="0"
                            y="0"
                            width={groupWidth}
                            height={bottomDateBoxHeight}
                            fill="#f8fafc"
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                          <text
                            x={groupWidth / 2}
                            y={bottomDateBoxHeight / 2 + 4}
                            fill="#0f172a"
                            fontSize={11.5}
                            fontWeight={700}
                            textAnchor="middle"
                          >
                            {item.shortLabel}
                          </text>
                        </g>
                      </g>
                    )
                  })

                  return (
                    <div
                      key={`timeline-row-${rowIdx}`}
                      style={{
                        position: 'relative',
                        width: '100%',
                        borderBottom: rowIdx < timelineChunks.length - 1 ? '1px dashed #cbd5e1' : 'none',
                        paddingBottom: rowIdx < timelineChunks.length - 1 ? 16 : 4
                      }}
                    >
                      {timelineChunks.length > 1 && (
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#334155',
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: '#1e293b'
                            }}
                          >
                            {periodType === 'daily'
                              ? `Đợt ${rowIdx + 1}: ${chunk[0]?.shortLabel} → ${chunk[chunk.length - 1]?.shortLabel}`
                              : `Dòng ${rowIdx + 1}`}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                            ({chunk.length} {periodType === 'daily' ? 'ngày' : 'kỳ'})
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', width: '100%' }}>
                        {/* Trục Y cho dòng này */}
                        <div
                          style={{
                            width: yAxisWidth,
                            minWidth: yAxisWidth,
                            height: totalChartHeight
                          }}
                        >
                          <svg width={yAxisWidth} height={totalChartHeight}>
                            <text
                              x={14}
                              y={chartHeight / 2}
                              fill="#475569"
                              fontSize={11.5}
                              fontWeight={600}
                              textAnchor="middle"
                              transform={`rotate(-90, 14, ${chartHeight / 2})`}
                            >
                              Số lệnh
                            </text>
                            {yTicks.map((tick) => {
                              const yPos = topPadding + scaleY(tick)
                              return (
                                <text
                                  key={`ytick-lbl-${rowIdx}-${tick}`}
                                  x={yAxisWidth - 6}
                                  y={yPos + 4}
                                  fill="#64748b"
                                  fontSize={11}
                                  fontWeight={500}
                                  textAnchor="end"
                                >
                                  {tick}
                                </text>
                              )
                            })}
                            <line
                              x1={yAxisWidth - 1}
                              y1={topPadding}
                              x2={yAxisWidth - 1}
                              y2={topPadding + availablePlotHeight}
                              stroke="#e2e8f0"
                              strokeWidth="1"
                            />
                          </svg>
                        </div>

                        {/* SVG vẽ dữ liệu cho dòng này */}
                        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                          <svg
                            width="100%"
                            height={totalChartHeight}
                            style={{ overflow: 'visible' }}
                          >
                            {yTicks.map((tick) => {
                              const yPos = topPadding + scaleY(tick)
                              return (
                                <line
                                  key={`grid-line-${rowIdx}-${tick}`}
                                  x1={0}
                                  y1={yPos}
                                  x2="100%"
                                  y2={yPos}
                                  stroke="#f1f5f9"
                                  strokeDasharray="3 3"
                                  strokeWidth="1"
                                />
                              )
                            })}

                            <line
                              x1={0}
                              y1={topPadding + availablePlotHeight}
                              x2="100%"
                              y2={topPadding + availablePlotHeight}
                              stroke="#e2e8f0"
                              strokeWidth="1"
                            />

                            {dayGroups}

                            {/* Đường xu hướng tăng trưởng từng PIC */}
                            {showGrowthLine && (
                              <g key={`growth-trend-lines-row-${rowIdx}`}>
                                {Array.from(rowPicTracks.values()).map((track, tIdx) => {
                                  if (track.points.length < 2) return null

                                  const isThisPicHovered = hoveredBar?.picName === track.picName
                                  const isAnyPicHovered = Boolean(hoveredBar?.picName)
                                  const lineOpacity = isThisPicHovered ? 1 : isAnyPicHovered ? 0.25 : 0.85
                                  const lineWidth = isThisPicHovered ? 3.5 : 2

                                  return (
                                    <g key={`track-${track.picName}-${rowIdx}-${tIdx}`}>
                                      <polyline
                                        points={track.points.map((p) => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke={track.color}
                                        strokeWidth={lineWidth}
                                        strokeOpacity={lineOpacity}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
                                      />

                                      {track.points.map((pt, pIdx) => {
                                        const isPointHovered =
                                          hoveredBar?.rowIdx === rowIdx &&
                                          hoveredBar?.dateKey === pt.dateKey &&
                                          hoveredBar?.picName === pt.picName &&
                                          hoveredBar?.isTrendPoint === true

                                        return (
                                          <g
                                            key={`trend-pt-${track.picName}-${rowIdx}-${pIdx}`}
                                            onMouseEnter={() => {
                                              setHoveredBar({
                                                rowIdx,
                                                isTrendPoint: true,
                                                dateKey: pt.dateKey,
                                                fullDateStr: pt.fullDateStr,
                                                picName: pt.picName,
                                                picColor: pt.color,
                                                totalOrders: pt.value,
                                                growthPct: pt.growthPct,
                                                x: pt.x,
                                                y: pt.y
                                              })
                                            }}
                                            onMouseLeave={() => setHoveredBar(null)}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            {isPointHovered && (
                                              <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={8}
                                                fill={pt.color}
                                                fillOpacity={0.25}
                                                stroke={pt.color}
                                                strokeWidth={1.5}
                                              />
                                            )}
                                            <circle
                                              cx={pt.x}
                                              cy={pt.y}
                                              r={isPointHovered ? 5.5 : 3.5}
                                              fill="#ffffff"
                                              stroke={pt.color}
                                              strokeWidth={isPointHovered ? 2.5 : 2}
                                              strokeOpacity={isThisPicHovered ? 1 : isAnyPicHovered ? 0.35 : 0.9}
                                            />

                                            {(isPointHovered || (isSinglePic && pt.growthPct !== null)) &&
                                              pt.growthPct !== null && (
                                                <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                                                  <rect
                                                    x="-20"
                                                    y="-9"
                                                    width="40"
                                                    height="14"
                                                    rx="3"
                                                    fill={
                                                      pt.growthPct > 0
                                                        ? '#dcfce7'
                                                        : pt.growthPct < 0
                                                          ? '#fee2e2'
                                                          : '#f1f5f9'
                                                    }
                                                    stroke={
                                                      pt.growthPct > 0
                                                        ? '#86efac'
                                                        : pt.growthPct < 0
                                                          ? '#fca5a5'
                                                          : '#cbd5e1'
                                                    }
                                                    strokeWidth="0.8"
                                                  />
                                                  <text
                                                    x="0"
                                                    y="1.5"
                                                    fill={
                                                      pt.growthPct > 0
                                                        ? '#15803d'
                                                        : pt.growthPct < 0
                                                          ? '#b91c1c'
                                                          : '#475569'
                                                    }
                                                    fontSize="9"
                                                    fontWeight="700"
                                                    textAnchor="middle"
                                                  >
                                                    {pt.growthPct > 0 ? `+${pt.growthPct}%` : `${pt.growthPct}%`}
                                                  </text>
                                                </g>
                                              )}
                                          </g>
                                        )
                                      })}
                                    </g>
                                  )
                                })}
                              </g>
                            )}
                          </svg>
                        </div>
                      </div>

                      {/* Tooltip hiển thị cho riêng dòng này */}
                      {hoveredBar && hoveredBar.rowIdx === rowIdx && (
                        <PlanTooltipPopup hoveredBar={hoveredBar} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* TAB 2: CƠ CẤU TỔNG HỢP */
            <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
              <div
                style={{
                  width: yAxisWidth,
                  minWidth: yAxisWidth,
                  height: totalChartHeight
                }}
              >
                <svg width={yAxisWidth} height={totalChartHeight}>
                  <text
                    x={14}
                    y={chartHeight / 2}
                    fill="#475569"
                    fontSize={11.5}
                    fontWeight={600}
                    textAnchor="middle"
                    transform={`rotate(-90, 14, ${chartHeight / 2})`}
                  >
                    Số lệnh
                  </text>
                  {yTicks.map((tick) => {
                    const yPos = topPadding + scaleY(tick)
                    return (
                      <text
                        key={`ytick-sum-${tick}`}
                        x={yAxisWidth - 6}
                        y={yPos + 4}
                        fill="#64748b"
                        fontSize={11}
                        fontWeight={500}
                        textAnchor="end"
                      >
                        {tick}
                      </text>
                    )
                  })}
                  <line
                    x1={yAxisWidth - 1}
                    y1={topPadding}
                    x2={yAxisWidth - 1}
                    y2={topPadding + availablePlotHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: totalPlotWidth, position: 'relative' }}>
                <svg
                  width="100%"
                  height={totalChartHeight}
                  style={{ overflow: 'visible' }}
                >
                  {yTicks.map((tick) => {
                    const yPos = topPadding + scaleY(tick)
                    return (
                      <line
                        key={`grid-sum-${tick}`}
                        x1={0}
                        y1={yPos}
                        x2="100%"
                        y2={yPos}
                        stroke="#f1f5f9"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    )
                  })}

                  <line
                    x1={0}
                    y1={topPadding + availablePlotHeight}
                    x2="100%"
                    y2={topPadding + availablePlotHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  {(() => {
                    const summaryCount = picSummaryData.length
                    const isSummaryExpanded =
                      summaryCount > 0 && summaryCount * 55 + 40 <= availablePlotWidth
                    const slotWidth = isSummaryExpanded ? availablePlotWidth / summaryCount : 48
                    const summaryBarWidth = isSummaryExpanded
                      ? Math.min(32, Math.max(18, Math.floor(slotWidth * 0.45)))
                      : 24
                    const summaryBarGap = 16

                    return picSummaryData.map((pic, pIdx) => {
                      const barX = isSummaryExpanded
                        ? pIdx * slotWidth + (slotWidth - summaryBarWidth) / 2
                        : 20 + pIdx * (summaryBarWidth + summaryBarGap)
                      const totalOrders = pic.totalOrders || 0

                      const vKhopSl = visibleSeries.khopSl ? pic.khopSl : 0
                      const vKhopJob = visibleSeries.khopJob ? pic.khopJob : 0
                      const vSxSaiNgay = visibleSeries.sxSaiNgay ? pic.sxSaiNgay : 0
                      const vTruotKh = visibleSeries.truotKh ? pic.truotKh : 0
                      const vTotal = vKhopSl + vKhopJob + vSxSaiNgay + vTruotKh

                      const hKhopSl = heightFromVal(vKhopSl)
                      const hKhopJob = heightFromVal(vKhopJob)
                      const hSxSaiNgay = heightFromVal(vSxSaiNgay)
                      const hTruotKh = heightFromVal(vTruotKh)

                      const baseBottom = topPadding + availablePlotHeight
                      const yKhopSl = baseBottom - hKhopSl
                      const yKhopJob = yKhopSl - hKhopJob
                      const ySxSaiNgay = yKhopJob - hSxSaiNgay
                      const yTruotKh = ySxSaiNgay - hTruotKh
                      const topY = baseBottom - heightFromVal(vTotal)

                      const isHovered =
                        hoveredBar?.dateKey === 'SUMMARY' && hoveredBar?.picName === pic.fullName

                      return (
                        <g
                          key={`sum-bar-${pic.fullName}-${pIdx}`}
                          onMouseEnter={() => {
                            setHoveredBar({
                              isSummary: true,
                              dateKey: 'SUMMARY',
                              fullDateStr: 'Toàn bộ kỳ kế hoạch',
                              picName: pic.fullName,
                              totalOrders,
                              khopSl: pic.khopSl,
                              khopJob: pic.khopJob,
                              sxSaiNgay: pic.sxSaiNgay,
                              truotKh: pic.truotKh,
                              khopSlRate: pic.khopSlRate,
                              khopJobRate: pic.khopJobRate,
                              sxSaiNgayRate: pic.sxSaiNgayRate,
                              truotKhRate: pic.truotKhRate,
                              x: barX + summaryBarWidth / 2,
                              y: topY
                            })
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {isHovered && (
                            <rect
                              x={barX - 2}
                              y={topY - 4}
                              width={summaryBarWidth + 4}
                              height={baseBottom - topY + 4}
                              fill="rgba(59, 130, 246, 0.1)"
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                            />
                          )}

                          {hKhopSl > 0 && (
                            <rect
                              x={barX}
                              y={yKhopSl}
                              width={summaryBarWidth}
                              height={hKhopSl}
                              fill={STATUS_CONFIG.khopSl.color}
                            />
                          )}
                          {hKhopJob > 0 && (
                            <rect
                              x={barX}
                              y={yKhopJob}
                              width={summaryBarWidth}
                              height={hKhopJob}
                              fill={STATUS_CONFIG.khopJob.color}
                            />
                          )}
                          {hSxSaiNgay > 0 && (
                            <rect
                              x={barX}
                              y={ySxSaiNgay}
                              width={summaryBarWidth}
                              height={hSxSaiNgay}
                              fill={STATUS_CONFIG.sxSaiNgay.color}
                            />
                          )}
                          {hTruotKh > 0 && (
                            <rect
                              x={barX}
                              y={yTruotKh}
                              width={summaryBarWidth}
                              height={hTruotKh}
                              fill={STATUS_CONFIG.truotKh.color}
                            />
                          )}

                          {totalOrders > 0 && (
                            <text
                              x={barX + summaryBarWidth / 2}
                              y={topY - 5}
                              fill="#0f172a"
                              fontSize={10.5}
                              fontWeight={700}
                              textAnchor="middle"
                            >
                              {totalOrders}
                            </text>
                          )}

                          <text
                            x={barX + summaryBarWidth / 2 + 3}
                            y={baseBottom + 8}
                            fill="#334155"
                            fontSize={11}
                            fontWeight={600}
                            textAnchor="start"
                            transform={`rotate(90, ${barX + summaryBarWidth / 2 + 3}, ${baseBottom + 8})`}
                          >
                            {pic.shortName}
                          </text>
                        </g>
                      )
                    })
                  })()}
                </svg>
              </div>

              {hoveredBar && hoveredBar.dateKey === 'SUMMARY' && (
                <PlanTooltipPopup hoveredBar={hoveredBar} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. BẢNG TỔNG HỢP SỐ LIỆU CHUẨN HỆ THỐNG (CHUẨN OPENAI / FINANCIAL TABLE GIỐNG MỤC 1) */}
      {showTable && (
        <div style={{ width: '100%', marginTop: 18, marginBottom: 8, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              fontSize: 12,
              textAlign: 'left',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #0f172a', background: '#f8fafc' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    width: 50,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    minWidth: 160,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Nhân sự (PIC)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#01411b',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tổng lệnh
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#16a34a',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp SL
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#8b5cf6',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp Job
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#ea580c',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Sai ngày
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#dc2626',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Trượt KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#047857',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tỷ lệ Đạt KHSX
                </th>
              </tr>
            </thead>
            <tbody>
              {picSummaryData.map((pic, idx) => (
                <tr
                  key={pic.fullName}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getPicColor(pic.fullName, idx),
                        display: 'inline-block'
                      }}
                    />
                    <span>{pic.fullName}</span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#01411b'
                    }}
                  >
                    {pic.totalOrders.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: '#16a34a',
                      fontWeight: 600
                    }}
                  >
                    <span>{pic.khopSl.toLocaleString('vi-VN')}</span>
                    <span style={{ fontSize: 10.5, color: '#64748b', marginLeft: 4 }}>
                      ({pic.khopSlRate}%)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: '#8b5cf6',
                      fontWeight: 600
                    }}
                  >
                    <span>{pic.khopJob.toLocaleString('vi-VN')}</span>
                    <span style={{ fontSize: 10.5, color: '#64748b', marginLeft: 4 }}>
                      ({pic.khopJobRate}%)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: '#ea580c',
                      fontWeight: 600
                    }}
                  >
                    <span>{pic.sxSaiNgay.toLocaleString('vi-VN')}</span>
                    <span style={{ fontSize: 10.5, color: '#64748b', marginLeft: 4 }}>
                      ({pic.sxSaiNgayRate}%)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: '#dc2626',
                      fontWeight: 600
                    }}
                  >
                    <span>{pic.truotKh.toLocaleString('vi-VN')}</span>
                    <span style={{ fontSize: 10.5, color: '#64748b', marginLeft: 4 }}>
                      ({pic.truotKhRate}%)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: pic.passRate >= 80 ? '#16a34a' : '#d97706'
                    }}
                  >
                    {pic.passRate}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: '2px solid #0f172a',
                  background: '#f8fafc',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                <td colSpan={2} style={{ padding: '10px 12px', textTransform: 'uppercase' }}>
                  TỔNG CỘNG TOÀN XƯỞNG ({picSummaryData.length} PIC)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b'
                  }}
                >
                  {tableGrandTotal.totalOrders.toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#16a34a'
                  }}
                >
                  {tableGrandTotal.khopSl.toLocaleString('vi-VN')} ({tableGrandTotal.khopSlRate}%)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#8b5cf6'
                  }}
                >
                  {tableGrandTotal.khopJob.toLocaleString('vi-VN')} ({tableGrandTotal.khopJobRate}%)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#ea580c'
                  }}
                >
                  {tableGrandTotal.sxSaiNgay.toLocaleString('vi-VN')} ({tableGrandTotal.sxSaiNgayRate}%)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#dc2626'
                  }}
                >
                  {tableGrandTotal.truotKh.toLocaleString('vi-VN')} ({tableGrandTotal.truotKhRate}%)
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#047857' }}>
                  {tableGrandTotal.passRate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
