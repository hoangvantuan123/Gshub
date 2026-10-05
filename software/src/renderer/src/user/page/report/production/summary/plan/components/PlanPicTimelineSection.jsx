/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useRef, useEffect, useMemo } from 'react'
import { TableProperties, RotateCcw, ChevronDown, Check, X, Filter } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList
} from 'recharts'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

// Mini Sparkline SVG thanh mảnh chuẩn BI hiển thị biến động độ khớp (Khớp SL + Job)
function CleanSparkline({ data = [], color = '#059669', width = 90, height = 22 }) {
  if (!data || data.length === 0) return <span style={{ color: '#cbd5e1' }}>—</span>
  const vals = data.map((d) => d.passOrders || d.orders || 0)
  const maxVal = Math.max(1, ...vals)
  const minVal = Math.min(0, ...vals)
  const range = maxVal - minVal || 1
  const step = data.length > 1 ? width / (data.length - 1) : width

  const points = data
    .map((d, idx) => {
      const val = d.passOrders !== undefined ? d.passOrders : d.orders || 0
      const x = idx * step
      const y = height - Math.round(((val - minVal) / range) * (height - 6)) - 3
      return `${x},${y}`
    })
    .join(' ')

  const fillPoints = `0,${height} ${points} ${width},${height}`

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill={`url(#grad-spark-${color.replace('#', '')})`} points={fillPoints} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.length > 0 && (
          <circle
            cx={(data.length - 1) * step}
            cy={height - Math.round(((vals[vals.length - 1] - minVal) / range) * (height - 6)) - 3}
            r="3"
            fill={color}
          />
        )}
      </svg>
    </div>
  )
}

// Custom Executive Dropdown chuẩn ERP cho "Soi PIC" hỗ trợ chọn nhiều người điều phối
function PicSelectorDropdown({
  selectedPics = [],
  onTogglePic,
  onSelectAll,
  onClear,
  picList = []
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchKey, setSearchKey] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Đóng dropdown khi bấm ra ngoài hoặc ấn ESC
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Lọc danh sách PIC theo từ khóa tìm kiếm
  const filteredPics = useMemo(() => {
    if (!searchKey.trim()) return picList
    const q = searchKey.toLowerCase().trim()
    return picList.filter((p) => p.toLowerCase().includes(q))
  }, [picList, searchKey])

  const isAll = !selectedPics || selectedPics.length === 0
  const selectedCount = selectedPics?.length || 0

  const getButtonText = () => {
    if (isAll) return 'Toàn xưởng (Tất cả)'
    if (selectedCount === 1) return selectedPics[0]
    if (selectedCount === 2) return `${selectedPics[0]}, ${selectedPics[1]}`
    return `${selectedCount} PIC (${selectedPics[0]}, +${selectedCount - 1})`
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: 28,
        border: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
        borderRadius: 4,
        background: '#ffffff',
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Label Prefix "Soi PIC:" */}
      <div
        style={{
          height: '100%',
          fontSize: 11.5,
          fontWeight: 700,
          color: '#334155',
          background: '#f1f5f9',
          padding: '0 8px',
          borderRight: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
          display: 'inline-flex',
          alignItems: 'center',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box'
        }}
      >
        Soi PIC:
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '100%',
          border: 'none',
          background: isAll ? '#ffffff' : '#eff6ff',
          padding: '0 8px 0 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          minWidth: 150,
          maxWidth: 240,
          justifyContent: 'space-between',
          textAlign: 'left',
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isAll ? '#0f172a' : '#1d4ed8',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}
          title={!isAll ? selectedPics.join(', ') : 'Toàn xưởng'}
        >
          {getButtonText()}
        </span>
        <ChevronDown
          size={13}
          style={{
            color: '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0
          }}
        />
      </button>

      {/* Dropdown Overlay Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 100,
            minWidth: 240,
            width: 'max-content',
            maxWidth: 320,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 5,
            boxShadow:
              '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {/* Search Box */}
          <div
            style={{
              padding: '6px 8px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm tên PIC..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                padding: '4px 8px',
                background: '#ffffff',
                fontSize: 12,
                outline: 'none',
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Quick Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              fontSize: 11,
              fontWeight: 600,
              color: '#475569'
            }}
          >
            <span>{isAll ? 'Toàn xưởng (Tất cả)' : `Đã chọn: ${selectedCount} PIC`}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isAll && (
                <button
                  type="button"
                  onClick={() => onClear()}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Bỏ chọn
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectAll()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: isAll ? '#1d4ed8' : '#2563eb',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Toàn xưởng
              </button>
            </div>
          </div>

          {/* List Options */}
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
            {/* Option "Toàn xưởng" */}
            <div
              onClick={() => onSelectAll()}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isAll ? 700 : 500,
                color: isAll ? '#1d4ed8' : '#0f172a',
                background: isAll ? '#eff6ff' : 'transparent',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                if (!isAll) e.currentTarget.style.background = '#f8fafc'
              }}
              onMouseLeave={(e) => {
                if (!isAll) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: isAll ? '1.5px solid #2563eb' : '1.5px solid #94a3b8',
                  background: isAll ? '#2563eb' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isAll && <Check size={10} color="#ffffff" strokeWidth={3} />}
              </div>
              <span style={{ fontWeight: 700 }}>Toàn xưởng (Tất cả)</span>
            </div>

            {/* Danh sách từng tên PIC với Checkbox */}
            {filteredPics.map((p) => {
              const isSelected = !isAll && selectedPics.includes(p)

              return (
                <div
                  key={p}
                  onClick={() => onTogglePic(p)}
                  style={{
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#1d4ed8' : '#0f172a',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: isSelected ? '1.5px solid #2563eb' : '1.5px solid #94a3b8',
                      background: isSelected ? '#2563eb' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}
                  >
                    {p}
                  </span>
                </div>
              )
            })}

            {filteredPics.length === 0 && (
              <div
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: 11.5,
                  color: '#94a3b8'
                }}
              >
                Không có tên phù hợp
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Custom Bar Shape vẽ từng cột đứng riêng biệt (không xếp chồng) và tự động nối đường giữa các đỉnh của cột cùng loại qua các ngày
const CustomBarWithPeak = (props) => {
  const {
    x,
    y,
    width,
    height,
    value,
    index,
    fill,
    stroke,
    dashArray,
    seriesKey,
    collectorRef,
    isRate
  } = props

  if (x === undefined || y === undefined || width === undefined || height === undefined) return null

  const cx = x + width / 2
  const cy = y

  if (collectorRef && collectorRef.current) {
    if (!collectorRef.current[seriesKey]) {
      collectorRef.current[seriesKey] = []
    }
    collectorRef.current[seriesKey][index] = { cx, cy, value }
  }

  const prev = collectorRef?.current?.[seriesKey]?.[index - 1]
  const validVal = value !== null && value !== undefined && !isNaN(value)
  const displayVal =
    validVal && Number(value) > 0
      ? isRate
        ? `${value}%`
        : Number(value).toLocaleString('vi-VN')
      : null

  return (
    <g className={`custom-pic-bar-${seriesKey}-${index}`}>
      {/* 1. Thân cột */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(0, height)}
        fill={fill}
        stroke={stroke || fill}
        strokeWidth={1}
        rx={2}
        ry={2}
      />

      {/* 2. Đường nối từ đỉnh cột ngày trước đến đỉnh cột ngày này */}
      {prev && prev.cx !== undefined && !isNaN(prev.cx) && !isNaN(prev.cy) && (
        <line
          x1={prev.cx}
          y1={prev.cy}
          x2={cx}
          y2={cy}
          stroke={stroke || fill}
          strokeWidth={2}
          strokeDasharray={dashArray || undefined}
          strokeLinecap="round"
        />
      )}

      {/* 3. Điểm đánh dấu đỉnh */}
      <circle cx={cx} cy={cy} r={3} fill={fill} stroke="#ffffff" strokeWidth={1.5} />

      {/* 4. Nhãn số lượng / % trên đỉnh cột */}
      {displayVal && (
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize={9.5} fontWeight={700}>
          {displayVal}
        </text>
      )}
    </g>
  )
}

const renderVLineLabel = (props) => {
  const { x, y, value } = props
  if (value === undefined || value === null) return null
  return (
    <text
      x={x}
      y={y - 10}
      fill="#2563eb"
      textAnchor="middle"
      dominantBaseline="auto"
      fontSize={10.5}
      fontWeight={700}
    >
      {`${value}%`}
    </text>
  )
}

export function PlanPicTimelineSection({
  picTimelineBreakdown = {
    dailyList: [],
    monthlyList: [],
    quarterlyList: [],
    picList: [],
    picGrowthList: []
  },
  plantName = 'Nhà máy',
  totalDays = 1,
  selectedPic = 'ALL',
  onSelectPic
}) {
  const [selectedPics, setSelectedPics] = useState([])
  const [chartMode, setChartMode] = useState('volume') // 'volume' | 'rate'
  const [showTable, setShowTable] = useState(true)

  const pointsCollector = useMemo(() => ({ current: {} }), [])
  pointsCollector.current = {}

  const monthlyList = picTimelineBreakdown?.monthlyList || []
  const dailyList = picTimelineBreakdown?.dailyList || []
  const quarterlyList = picTimelineBreakdown?.quarterlyList || []
  const picList = picTimelineBreakdown?.picList || []

  // Quyết định danh sách chu kỳ thời gian: Ưu tiên Tháng nếu >= 2 tháng, ngược lại dùng Quý hoặc Ngày
  const { periodList, periodType } = useMemo(() => {
    if (monthlyList.length >= 2) return { periodList: monthlyList, periodType: 'Tháng' }
    if (quarterlyList.length >= 2) return { periodList: quarterlyList, periodType: 'Quý' }
    return { periodList: dailyList, periodType: 'Ngày' }
  }, [monthlyList, quarterlyList, dailyList])

  const isAll = !selectedPics || selectedPics.length === 0

  // Lấy dữ liệu chuỗi thời gian cho Biểu đồ (Toàn xưởng hoặc nhiều PIC đang chọn)
  const chartData = useMemo(() => {
    return periodList.map((period, pIdx) => {
      const pName = period.name || period.periodLabel || period.periodKey || `Kỳ ${pIdx + 1}`

      if (isAll) {
        const total = period.totalOrders || 0
        const khopSl = period.khopSl || 0
        const khopJob = period.khopJob || 0
        const sxSaiNgay = period.sxSaiNgay || 0
        const truotKh = period.truotKh || 0
        const passOrders = khopSl + khopJob
        const passRate = total > 0 ? Number(((passOrders / total) * 100).toFixed(1)) : 0
        const khopSlRate = total > 0 ? Number(((khopSl / total) * 100).toFixed(1)) : 0
        const khopJobRate = total > 0 ? Number(((khopJob / total) * 100).toFixed(1)) : 0
        const sxSaiNgayRate = total > 0 ? Number(((sxSaiNgay / total) * 100).toFixed(1)) : 0
        const truotKhRate = total > 0 ? Number(((truotKh / total) * 100).toFixed(1)) : 0

        return {
          name: pName,
          periodKey: period.periodKey || pName,
          totalOrders: total,
          khopSl,
          khopJob,
          sxSaiNgay,
          truotKh,
          passOrders,
          passRate,
          khopSlRate,
          khopJobRate,
          sxSaiNgayRate,
          truotKhRate
        }
      }

      // Khi chọn 1 hoặc nhiều PIC cụ thể
      let total = 0
      let khopSl = 0
      let khopJob = 0
      let sxSaiNgay = 0
      let truotKh = 0

      selectedPics.forEach((p) => {
        const stat = period.picStats?.[p] || {
          totalOrders: period[`${p}_orders`] || period[p] || 0,
          khopSl: period[`${p}_khopSl`] || 0,
          khopJob: period[`${p}_khopJob`] || 0,
          sxSaiNgay: period[`${p}_sxSaiNgay`] || 0,
          truotKh: period[`${p}_truotKh`] || 0
        }
        total += stat.totalOrders || 0
        khopSl += stat.khopSl || 0
        khopJob += stat.khopJob || 0
        sxSaiNgay += stat.sxSaiNgay || 0
        truotKh += stat.truotKh || 0
      })

      const passOrders = khopSl + khopJob
      const passRate = total > 0 ? Number(((passOrders / total) * 100).toFixed(1)) : 0
      const khopSlRate = total > 0 ? Number(((khopSl / total) * 100).toFixed(1)) : 0
      const khopJobRate = total > 0 ? Number(((khopJob / total) * 100).toFixed(1)) : 0
      const sxSaiNgayRate = total > 0 ? Number(((sxSaiNgay / total) * 100).toFixed(1)) : 0
      const truotKhRate = total > 0 ? Number(((truotKh / total) * 100).toFixed(1)) : 0

      return {
        name: pName,
        periodKey: period.periodKey || pName,
        totalOrders: total,
        khopSl,
        khopJob,
        sxSaiNgay,
        truotKh,
        passOrders,
        passRate,
        khopSlRate,
        khopJobRate,
        sxSaiNgayRate,
        truotKhRate
      }
    })
  }, [periodList, selectedPics, isAll])

  // Tính toán dữ liệu ma trận tổng hợp tốc độ tăng trưởng và độ khớp của từng PIC
  const matrixData = useMemo(() => {
    const list = picList.map((p) => {
      let totalOrders = 0
      let totalKhopSl = 0
      let totalKhopJob = 0
      let totalSxSaiNgay = 0
      let totalTruotKh = 0

      const series = periodList.map((period) => {
        const stat = period.picStats?.[p] || {
          totalOrders: period[`${p}_orders`] || period[p] || 0,
          khopSl: period[`${p}_khopSl`] || 0,
          khopJob: period[`${p}_khopJob`] || 0,
          sxSaiNgay: period[`${p}_sxSaiNgay`] || 0,
          truotKh: period[`${p}_truotKh`] || 0
        }

        const orders = stat.totalOrders || 0
        const khopSl = stat.khopSl || 0
        const khopJob = stat.khopJob || 0
        const passOrders = khopSl + khopJob

        totalOrders += orders
        totalKhopSl += khopSl
        totalKhopJob += khopJob
        totalSxSaiNgay += stat.sxSaiNgay || 0
        totalTruotKh += stat.truotKh || 0

        return {
          name: period.name || period.periodLabel || period.periodKey,
          periodKey: period.periodKey || period.name,
          orders,
          khopSl,
          khopJob,
          passOrders,
          passRate: orders > 0 ? Number(((passOrders / orders) * 100).toFixed(1)) : 0
        }
      })

      const totalPass = totalKhopSl + totalKhopJob
      const firstPeriodKhopSl = series.length > 0 ? series[0].khopSl : 0
      const lastPeriodKhopSl = series.length > 0 ? series[series.length - 1].khopSl : 0
      const khopSlDiff = lastPeriodKhopSl - firstPeriodKhopSl

      let passGrowthRate = 0 // Tốc độ tăng trưởng Khớp Số Lượng (%)
      if (firstPeriodKhopSl > 0) {
        passGrowthRate = Number(
          (((lastPeriodKhopSl - firstPeriodKhopSl) / firstPeriodKhopSl) * 100).toFixed(1)
        )
      } else if (lastPeriodKhopSl > 0) {
        passGrowthRate = 100
      }

      const firstPeriodOrders = series.length > 0 ? series[0].orders : 0
      const lastPeriodOrders = series.length > 0 ? series[series.length - 1].orders : 0
      let ordersGrowthRate = 0
      if (firstPeriodOrders > 0) {
        ordersGrowthRate = Number(
          (((lastPeriodOrders - firstPeriodOrders) / firstPeriodOrders) * 100).toFixed(1)
        )
      } else if (lastPeriodOrders > 0) {
        ordersGrowthRate = 100
      }

      const passRate = totalOrders > 0 ? Number(((totalPass / totalOrders) * 100).toFixed(1)) : 0
      const khopSlRate =
        totalOrders > 0 ? Number(((totalKhopSl / totalOrders) * 100).toFixed(1)) : 0
      const khopJobRate =
        totalOrders > 0 ? Number(((totalKhopJob / totalOrders) * 100).toFixed(1)) : 0

      const isUp = passGrowthRate > 5 || khopSlDiff >= 2
      const isDown = passGrowthRate < -5 || khopSlDiff <= -2
      const trend = isUp ? 'UP' : isDown ? 'DOWN' : 'STABLE'

      return {
        pic: p,
        totalOrders,
        khopSl: totalKhopSl,
        khopJob: totalKhopJob,
        totalPass,
        sxSaiNgay: totalSxSaiNgay,
        truotKh: totalTruotKh,
        khopSlRate,
        khopJobRate,
        passRate,
        firstPeriodKhopSl,
        lastPeriodKhopSl,
        khopSlDiff,
        passGrowthRate,
        ordersGrowthRate,
        trend,
        series
      }
    })

    return list.sort((a, b) => b.khopSl - a.khopSl || b.totalOrders - a.totalOrders)
  }, [picList, periodList])

  // Tổng hợp toàn xưởng
  const grandSummary = useMemo(() => {
    const totalOrders = matrixData.reduce((sum, r) => sum + r.totalOrders, 0)
    const khopSl = matrixData.reduce((sum, r) => sum + r.khopSl, 0)
    const khopJob = matrixData.reduce((sum, r) => sum + r.khopJob, 0)
    const totalPass = khopSl + khopJob
    const sxSaiNgay = matrixData.reduce((sum, r) => sum + r.sxSaiNgay, 0)
    const truotKh = matrixData.reduce((sum, r) => sum + r.truotKh, 0)

    const firstKhopSl = matrixData.reduce((sum, r) => sum + r.firstPeriodKhopSl, 0)
    const lastKhopSl = matrixData.reduce((sum, r) => sum + r.lastPeriodKhopSl, 0)
    const khopSlDiff = lastKhopSl - firstKhopSl
    const passGrowthRate =
      firstKhopSl > 0 ? Number((((lastKhopSl - firstKhopSl) / firstKhopSl) * 100).toFixed(1)) : 0

    const passRate = totalOrders > 0 ? Number(((totalPass / totalOrders) * 100).toFixed(1)) : 0
    const khopSlRate = totalOrders > 0 ? Number(((khopSl / totalOrders) * 100).toFixed(1)) : 0
    const khopJobRate = totalOrders > 0 ? Number(((khopJob / totalOrders) * 100).toFixed(1)) : 0

    return {
      totalOrders,
      khopSl,
      khopJob,
      totalPass,
      sxSaiNgay,
      truotKh,
      firstKhopSl,
      lastKhopSl,
      khopSlDiff,
      passGrowthRate,
      passRate,
      khopSlRate,
      khopJobRate
    }
  }, [matrixData])

  // Xử lý chọn/bỏ chọn nhiều PIC
  const handleTogglePic = (picName) => {
    setSelectedPics((prev) => {
      if (prev.includes(picName)) {
        return prev.filter((p) => p !== picName)
      } else {
        return [...prev, picName]
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedPics([])
  }

  const handleClear = () => {
    setSelectedPics([])
  }

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* Header Hạng mục */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div>
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
            <span>3. TỐC ĐỘ TĂNG TRƯỞNG PIC THEO THÁNG & DIỄN BIẾN ĐỘ KHỚP KHSX</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
            Theo dõi tốc độ tăng trưởng, độ <b>Khớp số lượng</b> và <b>Khớp công việc (Job)</b> của
            từng nhân sự điều phối (PIC) trải dài qua {periodList.length} {periodType.toLowerCase()}{' '}
            tại {plantName || 'Nhà máy'}.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className={`uppercase text-[11px] font-semibold ${
              showTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp ma trận tăng trưởng"
          >
            <TableProperties size={13} className={showTable ? 'text-blue-600' : 'text-slate-500'} />
            <span>{showTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* KHUNG BIỂU ĐỒ DIỄN BIẾN ĐỘ KHỚP VÀ TỐC ĐỘ TĂNG TRƯỞNG TRẢI DÀI THEO THỜI GIAN */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '16px',
          marginBottom: 16
        }}
      >
        {/* Thanh chuyển chế độ & Điều khiển biểu đồ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>
                {isAll
                  ? `Diễn biến độ khớp & tăng trưởng toàn xưởng theo ${periodType.toLowerCase()}`
                  : selectedPics.length === 1
                    ? `Diễn biến độ khớp & tăng trưởng của PIC: ${selectedPics[0]}`
                    : `Diễn biến độ khớp & tăng trưởng của ${selectedPics.length} PIC (${selectedPics.join(', ')})`}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {chartMode === 'rate'
                ? `Tỷ lệ % Khớp SL, Khớp Job qua từng ${periodType.toLowerCase()}${!isAll ? ` cho ${selectedPics.length} PIC đã chọn` : ''}`
                : `Phân bổ chi tiết số lệnh Khớp SL, Khớp Job, Sai ngày và Trượt KH qua từng ${periodType.toLowerCase()}${!isAll ? ` cho ${selectedPics.length} PIC đã chọn` : ''}`}
            </div>

            {/* Hiển thị danh sách PIC đang lọc nhanh */}
            {!isAll && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginTop: 6
                }}
              >
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  Đang chọn ({selectedPics.length}):
                </span>
                {selectedPics.map((p) => (
                  <span
                    key={p}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => handleTogglePic(p)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#3b82f6',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title={`Bỏ chọn ${p}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginLeft: 2
                  }}
                >
                  Xem toàn xưởng
                </button>
              </div>
            )}
          </div>

          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {/* Bộ chọn PIC Dropdown chuẩn ERP hỗ trợ chọn nhiều người */}
            <PicSelectorDropdown
              selectedPics={selectedPics}
              onTogglePic={handleTogglePic}
              onSelectAll={handleSelectAll}
              onClear={handleClear}
              picList={picList}
            />

            {/* Mode Switcher Tabs */}
            <Tabs value={chartMode} onValueChange={setChartMode} className="w-auto">
              <TabsList variant="line">
                <TabsTrigger value="volume" variant="line">
                  Khối lượng (Lệnh)
                </TabsTrigger>
                <TabsTrigger value="rate" variant="line">
                  Tỷ lệ khớp (%)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Khung vẽ Recharts */}
        <div style={{ height: 340, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'rate' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 25, right: 30, left: 10, bottom: 10 }}
                barGap={2}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 11.5, fill: '#0f172a', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip unit="%" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11.5, fontWeight: 700 }}
                />
                <Bar
                  dataKey="khopSlRate"
                  name="Khớp số lượng (%)"
                  fill="#01411b"
                  stroke="#01411b"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#01411b"
                      stroke="#01411b"
                      seriesKey="khopSlRate"
                      collectorRef={pointsCollector}
                      isRate={true}
                    />
                  )}
                />
                <Bar
                  dataKey="khopJobRate"
                  name="Khớp job (%)"
                  fill="#059669"
                  stroke="#059669"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#059669"
                      stroke="#059669"
                      seriesKey="khopJobRate"
                      collectorRef={pointsCollector}
                      isRate={true}
                    />
                  )}
                />
                <Bar
                  dataKey="sxSaiNgayRate"
                  name="SX sai ngày KH (%)"
                  fill="#ea580c"
                  stroke="#ea580c"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#ea580c"
                      stroke="#ea580c"
                      seriesKey="sxSaiNgayRate"
                      collectorRef={pointsCollector}
                      isRate={true}
                    />
                  )}
                />
                <Bar
                  dataKey="truotKhRate"
                  name="Trượt KH (%)"
                  fill="#dc2626"
                  stroke="#dc2626"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#dc2626"
                      stroke="#dc2626"
                      seriesKey="truotKhRate"
                      collectorRef={pointsCollector}
                      isRate={true}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="Tỷ lệ Tổng Khớp (%)"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563eb' }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="passRate" content={renderVLineLabel} />
                </Line>
              </ComposedChart>
            ) : (
              <ComposedChart
                data={chartData}
                margin={{ top: 25, right: 30, left: 10, bottom: 10 }}
                barGap={2}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 11.5, fill: '#0f172a', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => v.toLocaleString('vi-VN')}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#2563eb"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#2563eb' }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip unit=" LSX" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11.5, fontWeight: 700 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="khopSl"
                  name="Khớp số lượng"
                  fill="#01411b"
                  stroke="#01411b"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#01411b"
                      stroke="#01411b"
                      seriesKey="khopSl"
                      collectorRef={pointsCollector}
                      isRate={false}
                    />
                  )}
                />
                <Bar
                  yAxisId="left"
                  dataKey="khopJob"
                  name="Khớp công việc (Job)"
                  fill="#059669"
                  stroke="#059669"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#059669"
                      stroke="#059669"
                      seriesKey="khopJob"
                      collectorRef={pointsCollector}
                      isRate={false}
                    />
                  )}
                />
                <Bar
                  yAxisId="left"
                  dataKey="sxSaiNgay"
                  name="SX sai ngày KH"
                  fill="#ea580c"
                  stroke="#ea580c"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#ea580c"
                      stroke="#ea580c"
                      seriesKey="sxSaiNgay"
                      collectorRef={pointsCollector}
                      isRate={false}
                    />
                  )}
                />
                <Bar
                  yAxisId="left"
                  dataKey="truotKh"
                  name="Trượt KH"
                  fill="#dc2626"
                  stroke="#dc2626"
                  barSize={periodList.length > 20 ? 8 : periodList.length > 10 ? 12 : 18}
                  isAnimationActive={false}
                  shape={(props) => (
                    <CustomBarWithPeak
                      {...props}
                      fill="#dc2626"
                      stroke="#dc2626"
                      seriesKey="truotKh"
                      collectorRef={pointsCollector}
                      isRate={false}
                    />
                  )}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="passRate"
                  name="Tỷ lệ Tổng Khớp (%)"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563eb' }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="passRate" content={renderVLineLabel} />
                </Line>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* BẢNG MA TRẬN ĐÁNH GIÁ TỐC ĐỘ TĂNG TRƯỞNG & ĐỘ KHỚP THEO PIC (CHUẨN ERP, KHÔNG CÓ CỘT TỔNG ĐẠT CHUẨN) */}
      {showTable && (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              fontSize: 12,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'left'
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #0f172a', background: '#f8fafc' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    minWidth: 160
                  }}
                >
                  Nhân sự PIC
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    minWidth: 90
                  }}
                >
                  Tổng lệnh
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#01411b',
                    textTransform: 'uppercase',
                    minWidth: 110
                  }}
                >
                  Khớp SL
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#059669',
                    textTransform: 'uppercase',
                    minWidth: 110
                  }}
                >
                  Khớp Job
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#ea580c',
                    textTransform: 'uppercase',
                    minWidth: 100
                  }}
                >
                  Sai ngày KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#dc2626',
                    textTransform: 'uppercase',
                    minWidth: 90
                  }}
                >
                  Trượt KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    minWidth: 125
                  }}
                >
                  Tăng trưởng Khớp SL %
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    minWidth: 120
                  }}
                >
                  Tăng trưởng Tổng %
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    minWidth: 105
                  }}
                >
                  Xu hướng
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    minWidth: 115
                  }}
                >
                  Đánh giá
                </th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, idx) => {
                const isSelected = !isAll && selectedPics.includes(row.pic)
                const isUp = row.trend === 'UP'
                const isDown = row.trend === 'DOWN'
                const rateColor = isUp ? '#16a34a' : isDown ? '#dc2626' : '#475569'
                const sparkColor = isUp ? '#16a34a' : isDown ? '#ea580c' : '#64748b'
                const sign = row.passGrowthRate > 0 ? '+' : ''

                return (
                  <tr
                    key={idx}
                    onClick={() => handleTogglePic(row.pic)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: isSelected
                        ? '#eff6ff'
                        : idx % 2 === 1
                          ? '#fafafa'
                          : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    title={`Nhấp để chọn/bỏ chọn PIC: ${row.pic}`}
                  >
                    {/* Cột 1: Tên PIC */}
                    <td
                      style={{
                        padding: '9px 12px',
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? '#1d4ed8' : '#0f172a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            border: isSelected ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                            background: isSelected ? '#2563eb' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {isSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <span>{row.pic}</span>
                      </div>
                    </td>

                    {/* Cột 2: Tổng lệnh */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    >
                      {row.totalOrders.toLocaleString('vi-VN')}
                    </td>

                    {/* Cột 3: Khớp Số Lượng */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#01411b'
                      }}
                    >
                      <div>{row.khopSl.toLocaleString('vi-VN')}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>{row.khopSlRate}%</div>
                    </td>

                    {/* Cột 4: Khớp Job */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#059669'
                      }}
                    >
                      <div>{row.khopJob.toLocaleString('vi-VN')}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>{row.khopJobRate}%</div>
                    </td>

                    {/* Cột 5: Sai ngày KH */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: row.sxSaiNgay > 0 ? '#ea580c' : '#94a3b8'
                      }}
                    >
                      {row.sxSaiNgay.toLocaleString('vi-VN')}
                    </td>

                    {/* Cột 6: Trượt KH */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: row.truotKh > 0 ? '#dc2626' : '#94a3b8'
                      }}
                    >
                      {row.truotKh.toLocaleString('vi-VN')}
                    </td>

                    {/* Cột 7: Tăng trưởng Khớp lệnh % (Hiển thị thuần chữ) */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: rateColor
                      }}
                    >
                      {sign}
                      {row.passGrowthRate}%
                    </td>

                    {/* Cột 8: Tăng trưởng Tổng lệnh % */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: row.ordersGrowthRate >= 0 ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {row.ordersGrowthRate > 0
                        ? `+${row.ordersGrowthRate}%`
                        : `${row.ordersGrowthRate}%`}
                    </td>

                    {/* Cột 9: Đồ thị Sparkline diễn biến độ khớp */}
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <CleanSparkline data={row.series} color={sparkColor} width={85} height={20} />
                    </td>

                    {/* Cột 10: Đánh giá (Hiển thị thuần chữ) */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'center',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: rateColor
                      }}
                    >
                      {isUp ? 'TĂNG TRƯỞNG' : isDown ? 'SUY GIẢM' : 'ỔN ĐỊNH'}
                    </td>
                  </tr>
                )
              })}

              {/* Dòng Tổng cộng */}
              {matrixData.length > 0 && (
                <tr
                  style={{
                    borderTop: '2px solid #0f172a',
                    background: '#f8fafc',
                    fontWeight: 800
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                    TỔNG CỘNG ({matrixData.length} PIC)
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>
                    {grandSummary.totalOrders.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                    <div>{grandSummary.khopSl.toLocaleString('vi-VN')}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>
                      {grandSummary.khopSlRate}%
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>
                    <div>{grandSummary.khopJob.toLocaleString('vi-VN')}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>
                      {grandSummary.khopJobRate}%
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ea580c' }}>
                    {grandSummary.sxSaiNgay.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>
                    {grandSummary.truotKh.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: grandSummary.passGrowthRate >= 0 ? '#16a34a' : '#dc2626'
                    }}
                  >
                    {grandSummary.passGrowthRate > 0
                      ? `+${grandSummary.passGrowthRate}%`
                      : `${grandSummary.passGrowthRate}%`}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>—</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                    {(grandSummary.khopSl + grandSummary.khopJob).toLocaleString('vi-VN')} Khớp
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      fontSize: 11.5,
                      fontWeight: 800,
                      color:
                        grandSummary.passGrowthRate > 5
                          ? '#16a34a'
                          : grandSummary.passGrowthRate < -5
                            ? '#dc2626'
                            : '#475569'
                    }}
                  >
                    {grandSummary.passGrowthRate > 5
                      ? 'TĂNG TRƯỞNG'
                      : grandSummary.passGrowthRate < -5
                        ? 'SUY GIẢM'
                        : 'ỔN ĐỊNH'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PlanPicTimelineSection
