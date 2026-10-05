/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  Cell,
  LabelList
} from 'recharts'
import { Eye, EyeOff, TableProperties, ChevronDown, Check, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'

const MACHINE_PALETTE = [
  '#01411b',
  '#0284c7',
  '#d97706',
  '#8b5cf6',
  '#dc2626',
  '#0d9488',
  '#ea580c',
  '#475569',
  '#16a34a',
  '#e11d48',
  '#0891b2',
  '#7c3aed',
  '#65a30d',
  '#ca8a04',
  '#4338ca',
  '#059669',
  '#db2777',
  '#2563eb',
  '#9333ea',
  '#b45309',
  '#047857',
  '#be123c',
  '#0369a1',
  '#6d28d9',
  '#374151',
  '#15803d',
  '#c026d3',
  '#0e7490'
]

// Custom Dropdown cho phép chọn 1 hoặc nhiều Cụm máy để "Soi cụm máy"
function MachineSelectorDropdown({
  selectedMachines = [],
  onToggleMachine,
  onSelectAll,
  onClear,
  machineList = []
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchKey, setSearchKey] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

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

  const filteredMachines = useMemo(() => {
    if (!searchKey.trim()) return machineList
    const q = searchKey.toLowerCase().trim()
    return machineList.filter((m) => {
      const code = typeof m === 'string' ? m : m.machineCode || m.machineName || ''
      const name = typeof m === 'string' ? m : m.machineName || ''
      return code.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    })
  }, [machineList, searchKey])

  const isAll = !selectedMachines || selectedMachines.length === 0
  const selectedCount = selectedMachines?.length || 0

  const getButtonText = () => {
    if (isAll) return 'Toàn xưởng (Tất cả cụm máy)'
    if (selectedCount === 1) return selectedMachines[0]
    if (selectedCount === 2) return `${selectedMachines[0]}, ${selectedMachines[1]}`
    return `${selectedCount} cụm máy (${selectedMachines[0]}, +${selectedCount - 1})`
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
        Soi cụm máy:
      </div>

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
          minWidth: 160,
          maxWidth: 260,
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
          title={!isAll ? selectedMachines.join(', ') : 'Toàn xưởng'}
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

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 100,
            minWidth: 260,
            width: 'max-content',
            maxWidth: 340,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 5,
            boxShadow:
              '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
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
              placeholder="Tìm mã máy / cụm máy..."
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
            <span>{isAll ? 'Toàn xưởng (Tất cả)' : `Đã chọn: ${selectedCount} cụm máy`}</span>
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

          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
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
              <span style={{ fontWeight: 700 }}>Toàn xưởng (Tất cả cụm máy)</span>
            </div>

            {filteredMachines.map((m) => {
              const mCode = typeof m === 'string' ? m : m.machineCode || m.machineName || ''
              const mName = typeof m === 'string' ? m : m.machineName || mCode
              const isSelected = selectedMachines.includes(mCode)
              return (
                <div
                  key={mCode}
                  onClick={() => onToggleMachine(mCode)}
                  style={{
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? '#1d4ed8' : '#334155',
                    background: isSelected ? '#f0fdf4' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: isSelected ? '1.5px solid #16a34a' : '1.5px solid #94a3b8',
                        background: isSelected ? '#16a34a' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span>{mName !== mCode ? `${mCode} - ${mName}` : mCode}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
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
  showMachineSummaryTable = true,
  setShowMachineSummaryTable,
  showManualMachines = false,
  setShowManualMachines,
  machineChartMode = 'runtime',
  setMachineChartMode,
  plantName = 'Nhà máy',
  totalDays = 1,
  standardCapacityHours = 24,
  sectionNumber = 2
}) {
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' | 'summary'
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [metricMode, setMetricMode] = useState('runtime') // 'runtime' | 'tickets' | 'actualQty' | 'rate'
  const [selectedMachines, setSelectedMachines] = useState([])
  const [visibleSeries, setVisibleSeries] = useState({})

  // Distinct machine list
  const rawMachineList = useMemo(() => {
    if (machineTimelineBreakdown?.machineList?.length > 0) {
      return machineTimelineBreakdown.machineList
    }
    return displayMachineList.map((m) => m.machineCode || m.machineName).filter(Boolean)
  }, [machineTimelineBreakdown, displayMachineList])

  // Filter manual machines if needed
  const activeMachineList = useMemo(() => {
    return rawMachineList.filter((mCode) => {
      const cluster = machineTimelineBreakdown?.machineClusters?.find(
        (c) => c.machineCode === mCode
      )
      if (!showManualMachines && cluster?.isManual) return false
      return true
    })
  }, [rawMachineList, machineTimelineBreakdown, showManualMachines])

  // Machines currently in focus (selected or all active machines)
  const machinesToRender = useMemo(() => {
    if (selectedMachines.length > 0) {
      return selectedMachines
    }
    return activeMachineList
  }, [selectedMachines, activeMachineList])

  const toggleMachineSelection = (mCode) => {
    setSelectedMachines((prev) =>
      prev.includes(mCode) ? prev.filter((x) => x !== mCode) : [...prev, mCode]
    )
  }

  const toggleSeriesVisibility = (mCode) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [mCode]: prev[mCode] === false ? true : false
    }))
  }

  // Active timeline list based on periodType
  const activeTimelineList = useMemo(() => {
    if (periodType === 'monthly' && machineTimelineBreakdown?.monthlyList?.length > 0) {
      return machineTimelineBreakdown.monthlyList
    }
    if (periodType === 'quarterly' && machineTimelineBreakdown?.quarterlyList?.length > 0) {
      return machineTimelineBreakdown.quarterlyList
    }
    return machineTimelineBreakdown?.dailyList || []
  }, [machineTimelineBreakdown, periodType])

  // Chart data for Timeline view
  const timelineChartData = useMemo(() => {
    return activeTimelineList.map((item, idx) => {
      const dateKey = item.date || item.periodKey || `item_${idx}`
      const name = item.name || item.shortDate || dateKey
      const totalRuntime = item.totalRuntime ?? item.runtimeHours ?? 0
      const totalTickets = item.totalTickets ?? item.ticketCount ?? 0
      const totalActualQty = item.totalActualQty ?? item.actualQty ?? 0

      const row = {
        ...item,
        dateKey,
        name,
        totalRuntime,
        totalTickets,
        totalActualQty
      }

      let maxMachineVal = 0
      let activeSumVal = 0

      machinesToRender.forEach((mCode) => {
        const mRt = item[`${mCode}_runtime`] ?? item[mCode] ?? 0
        const mTk = item[`${mCode}_tickets`] ?? 0
        const mAct = item[`${mCode}_actualQty`] ?? 0
        const mRate =
          item[`${mCode}_runtimeRate`] ??
          (totalRuntime > 0 ? Number(((mRt / totalRuntime) * 100).toFixed(1)) : 0)

        const val =
          metricMode === 'tickets'
            ? mTk
            : metricMode === 'actualQty'
              ? mAct
              : metricMode === 'rate'
                ? mRate
                : mRt

        row[mCode] = val
        row[`${mCode}_runtime`] = mRt
        row[`${mCode}_tickets`] = mTk
        row[`${mCode}_actualQty`] = mAct
        row[`${mCode}_runtimeRate`] = mRate

        if (visibleSeries[mCode] !== false) {
          if (val > maxMachineVal) maxMachineVal = val
          activeSumVal += val
        }
      })

      row.peakVal = maxMachineVal
      row.activeSumVal = activeSumVal

      return row
    })
  }, [activeTimelineList, machinesToRender, metricMode, visibleSeries])

  // Tổng hợp cho bảng Timeline OpenAI Technical Table
  const timelineTableTotals = useMemo(() => {
    let totalRt = 0
    let totalTk = 0
    let totalAct = 0
    const machineTotals = {}
    machinesToRender.forEach((mCode) => {
      machineTotals[mCode] = { runtime: 0, tickets: 0, actualQty: 0 }
    })

    timelineChartData.forEach((row) => {
      totalRt += row.totalRuntime || 0
      totalTk += row.totalTickets || 0
      totalAct += row.totalActualQty || 0
      machinesToRender.forEach((mCode) => {
        if (!machineTotals[mCode]) {
          machineTotals[mCode] = { runtime: 0, tickets: 0, actualQty: 0 }
        }
        machineTotals[mCode].runtime += row[`${mCode}_runtime`] || 0
        machineTotals[mCode].tickets += row[`${mCode}_tickets`] || 0
        machineTotals[mCode].actualQty += row[`${mCode}_actualQty`] || 0
      })
    })

    return {
      totalRuntime: Number(totalRt.toFixed(1)),
      totalTickets: totalTk,
      totalActualQty: totalAct,
      machineTotals
    }
  }, [timelineChartData, machinesToRender])

  // Summary chart data for Summary view
  const summaryChartData = useMemo(() => {
    return displayMachineList.map((m) => {
      const code = m.machineCode || m.machineName || 'M-UNKNOWN'
      const name = m.machineName || code
      const isOverCapacity = (m.runtimeHours || 0) > standardCapacityHours
      return {
        ...m,
        name: code,
        fullCode: code,
        fullName: name,
        machineCode: code,
        machineName: name,
        totalRuntimeHours: m.runtimeHours || 0,
        ticketCount: m.tickets || 0,
        actualQty: m.actualQty || 0,
        fill: isOverCapacity ? '#d97706' : '#01411b'
      }
    })
  }, [displayMachineList, standardCapacityHours])

  const hasTimelineData = activeTimelineList && activeTimelineList.length > 0

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* 1. Header & Controls (NẰM Ở NGOÀI KHUNG BIỂU ĐỒ) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14
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
            <span>
              {sectionNumber}. THỐNG KÊ TỔNG GIỜ CHẠY MÁY &amp; PHÂN BỔ TẢI TRỌNG THEO CỤM MÁY
            </span>
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#475569',
              marginTop: 4,
              lineHeight: 1.5,
              maxWidth: 960
            }}
          >
            Thống kê tổng thời gian chạy máy (giờ), sản lượng và số lượng phiếu thực hiện của{' '}
            <b>
              {activeMachineList.length || displayMachineList.length || 24} cụm máy / tổ sản xuất
            </b>{' '}
            ({plantName || 'Nhà máy GS Hà Nội'} — chu kỳ <b>{totalDays} ngày</b>, định mức trần
            24h/ngày = <b>{standardCapacityHours.toLocaleString('vi-VN')}h</b>). Biểu đồ cung cấp
            góc nhìn trực quan về diễn biến vận hành theo ngày, phân bổ tải trọng và mối tương quan
            giữa khối lượng thao tác với thời gian vận hành giữa các thiết bị.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 2
          }}
        >
          {/* Toggle View: Diễn biến theo thời gian vs Cơ cấu tổng hợp */}
          <Tabs value={viewTab} onValueChange={setViewTab}>
            <TabsList>
              <TabsTrigger value="timeline">Diễn biến theo thời gian</TabsTrigger>
              <TabsTrigger value="summary">Cơ cấu tổng hợp</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period selector if in timeline mode */}
          {viewTab === 'timeline' && (
            <Tabs value={periodType} onValueChange={setPeriodType}>
              <TabsList>
                <TabsTrigger value="daily">Ngày</TabsTrigger>
                {machineTimelineBreakdown?.monthlyList?.length > 0 && (
                  <TabsTrigger value="monthly">Tháng</TabsTrigger>
                )}
                {machineTimelineBreakdown?.quarterlyList?.length > 0 && (
                  <TabsTrigger value="quarterly">Quý</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}

          {/* Soi cụm máy Dropdown */}
          {viewTab === 'timeline' && (
            <MachineSelectorDropdown
              selectedMachines={selectedMachines}
              onToggleMachine={toggleMachineSelection}
              onSelectAll={() => setSelectedMachines([])}
              onClear={() => setSelectedMachines([])}
              machineList={activeMachineList}
            />
          )}

          {/* Metric mode switcher */}
          {viewTab === 'timeline' ? (
            <Tabs value={metricMode} onValueChange={setMetricMode}>
              <TabsList>
                <TabsTrigger value="runtime">Giờ chạy (h)</TabsTrigger>
                <TabsTrigger value="tickets">Số phiếu</TabsTrigger>
                <TabsTrigger value="actualQty">Sản lượng SP</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ tải (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <Tabs
              value={machineChartMode}
              onValueChange={(val) => setMachineChartMode(val)}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="runtime">Tổng giờ chạy (h)</TabsTrigger>
                <TabsTrigger value="composed">Giờ chạy &amp; Phiếu</TabsTrigger>
                <TabsTrigger value="tickets">Số phiếu theo máy</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Action Button: Bật / tắt máy thủ công */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualMachines(!showManualMachines)}
            className={`uppercase text-[11px] font-semibold ${
              showManualMachines
                ? 'text-emerald-700 hover:text-emerald-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Mặc định ẩn các máy/tổ thủ công. Bấm để hiển thị hoặc ẩn máy thủ công."
          >
            {showManualMachines ? (
              <Eye size={13} className="text-emerald-600" />
            ) : (
              <EyeOff size={13} className="text-slate-400" />
            )}
            <span>{showManualMachines ? 'Đang hiện máy thủ công' : 'Hiện máy thủ công'}</span>
          </Button>

          {/* Action Button: Mở / đóng bảng số liệu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (setShowMachineSummaryTable) {
                setShowMachineSummaryTable(!showMachineSummaryTable)
              }
            }}
            className={`uppercase text-[11px] font-semibold ${
              showMachineSummaryTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu"
          >
            <TableProperties
              size={13}
              className={showMachineSummaryTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showMachineSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KHUNG BIỂU ĐỒ (VIỀN PHẲNG border: 1px solid #e2e8f0, borderRadius: 0) */}
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
        {/* Interactive Legend filter bar when in timeline mode */}
        {viewTab === 'timeline' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 14,
              fontSize: 12,
              userSelect: 'none'
            }}
          >
            <span style={{ fontWeight: 700, color: '#475569' }}>Lọc cụm máy:</span>
            {machinesToRender.map((mCode, idx) => {
              const color = MACHINE_PALETTE[idx % MACHINE_PALETTE.length]
              const isVisible = visibleSeries[mCode] !== false
              return (
                <div
                  key={mCode}
                  onClick={() => toggleSeriesVisibility(mCode)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isVisible ? 700 : 500,
                    color: isVisible ? '#1e293b' : '#94a3b8',
                    textDecoration: isVisible ? 'none' : 'line-through',
                    opacity: isVisible ? 1 : 0.55,
                    transition: 'all 0.15s ease'
                  }}
                  title={`Bấm để ${isVisible ? 'ẩn' : 'hiện'} cụm máy "${mCode}"`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: isVisible ? color : '#cbd5e1',
                      borderRadius: 2,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span>{mCode}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Chart Area */}
        <div style={{ height: 'clamp(420px, 48vh, 500px)', width: '100%' }}>
          {viewTab === 'timeline' ? (
            hasTimelineData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timelineChartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  barGap={3}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 11.5, fill: '#475569', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    domain={metricMode === 'rate' ? [0, 100] : [0, 'auto']}
                    unit={metricMode === 'rate' ? '%' : undefined}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={
                      metricMode === 'rate'
                        ? (val) => `${val}%`
                        : metricMode === 'runtime'
                          ? (val) => `${val}h`
                          : (val) => `${val.toLocaleString('vi-VN')}`
                    }
                  />
                  <RechartsTooltip
                    content={
                      <ExecutiveChartTooltip
                        customFormatter={(val, name) =>
                          metricMode === 'rate'
                            ? `${val}%`
                            : metricMode === 'runtime'
                              ? `${val} giờ`
                              : `${val.toLocaleString('vi-VN')}`
                        }
                      />
                    }
                  />

                  {/* Bars for each active machine */}
                  {machinesToRender.map((mCode, idx) => {
                    if (visibleSeries[mCode] === false) return null
                    const color = MACHINE_PALETTE[idx % MACHINE_PALETTE.length]
                    return (
                      <Bar
                        key={mCode}
                        dataKey={mCode}
                        name={mCode}
                        fill={color}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={36}
                      >
                        <LabelList
                          dataKey={mCode}
                          position="top"
                          fill="#334155"
                          fontSize={10}
                          fontWeight={700}
                          offset={4}
                          formatter={(val) =>
                            val > 0
                              ? metricMode === 'rate'
                                ? `${val}%`
                                : metricMode === 'runtime'
                                  ? `${val}h`
                                  : `${val}`
                              : ''
                          }
                        />
                      </Bar>
                    )
                  })}

                  {/* Peak trend line connecting active machine peaks across dates */}
                  {metricMode !== 'rate' && (
                    <Line
                      type="monotone"
                      dataKey={machinesToRender.length === 1 ? machinesToRender[0] : 'peakVal'}
                      name={
                        machinesToRender.length === 1
                          ? `Diễn biến ${machinesToRender[0]} (${metricMode === 'runtime' ? 'h' : metricMode === 'tickets' ? 'phiếu' : 'SP'})`
                          : `Đỉnh tải cụm máy (${metricMode === 'runtime' ? 'h' : metricMode === 'tickets' ? 'phiếu' : 'SP'})`
                      }
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3.5, fill: '#0284c7' }}
                      activeDot={{ r: 5.5 }}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 13
                }}
              >
                Chưa có dữ liệu chuỗi thời gian cụm máy
              </div>
            )
          ) : (
            /* Summary mode: Composed/BarChart by Machine */
            <ResponsiveContainer width="100%" height="100%">
              {machineChartMode === 'runtime' ? (
                <BarChart
                  data={summaryChartData}
                  margin={{ top: 25, right: 25, left: 10, bottom: 85 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={75}
                    fontSize={11}
                    tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
                  />
                  <YAxis
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    tick={{ fill: '#334155' }}
                    label={{
                      value: 'Tổng giờ chạy máy (h)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 12,
                      fill: '#334155',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  <ReferenceLine
                    y={standardCapacityHours}
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `Mức trần (${standardCapacityHours.toLocaleString('vi-VN')}h)`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip unit=" giờ" />} />
                  <Bar
                    dataKey="totalRuntimeHours"
                    name="Tổng giờ chạy máy (h)"
                    fill="#01411b"
                    barSize={20}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="totalRuntimeHours"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v}h` : '')}
                    />
                    {summaryChartData.map((entry, index) => (
                      <Cell key={`cell-v-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : machineChartMode === 'composed' ? (
                <ComposedChart
                  data={summaryChartData}
                  margin={{ top: 25, right: 50, left: 15, bottom: 85 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={75}
                    fontSize={11}
                    tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    domain={[
                      0,
                      (dataMax) =>
                        Math.max(
                          standardCapacityHours + Math.ceil(standardCapacityHours * 0.1),
                          Math.ceil(dataMax * 1.15)
                        )
                    ]}
                    tick={{ fill: '#01411b', fontWeight: 600 }}
                    tickFormatter={(v) => `${v}h`}
                    label={{
                      value: 'Tổng giờ chạy máy (h)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 12,
                      fill: '#01411b',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    tick={{ fill: '#d97706', fontWeight: 600 }}
                    label={{
                      value: 'Số lượng phiếu (phiếu)',
                      angle: 90,
                      position: 'insideRight',
                      offset: 15,
                      fill: '#d97706',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={standardCapacityHours}
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `Mức trần (${standardCapacityHours.toLocaleString('vi-VN')}h)`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="totalRuntimeHours"
                    name="Tổng giờ chạy máy (h)"
                    fill="#01411b"
                    barSize={20}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="totalRuntimeHours"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v}h` : '')}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ticketCount"
                    name="Số phiếu (phiếu)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#d97706' }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="ticketCount"
                      position="top"
                      fill="#d97706"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v}` : '')}
                    />
                  </Line>
                </ComposedChart>
              ) : (
                <BarChart
                  data={summaryChartData}
                  margin={{ top: 25, right: 25, left: 10, bottom: 85 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={75}
                    fontSize={11}
                    tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
                  />
                  <YAxis
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    tick={{ fill: '#334155' }}
                    label={{
                      value: 'Số lượng phiếu (phiếu)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 12,
                      fill: '#334155',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip unit=" phiếu" />} />
                  <Bar
                    dataKey="ticketCount"
                    name="Số phiếu thống kê"
                    fill="#01411b"
                    barSize={20}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="ticketCount"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v} phiếu` : '')}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Bảng Diễn biến Chi tiết Cụm Máy theo Thời gian (OpenAI Technical Table) */}
        {viewTab === 'timeline' && showMachineSummaryTable && hasTimelineData && (
          <div
            style={{
              width: '100%',
              marginTop: 20,
              marginBottom: 8,
              overflowX: 'auto',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              background: '#ffffff'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                textAlign: 'left',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1.5px solid #0f172a', background: '#f8fafc' }}>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {periodType === 'monthly'
                      ? 'Tháng'
                      : periodType === 'quarterly'
                        ? 'Quý'
                        : 'Ngày sản xuất'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#01411b',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Tổng giờ (h)
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0284c7',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Tổng phiếu
                  </th>
                  {machinesToRender.map((mCode, idx) => (
                    <th
                      key={mCode}
                      style={{
                        padding: '10px 12px',
                        fontWeight: 700,
                        color: MACHINE_PALETTE[idx % MACHINE_PALETTE.length],
                        fontSize: 12,
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {mCode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timelineChartData.map((row, idx) => (
                  <tr
                    key={row.dateKey || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <td
                      style={{
                        padding: '8px 12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {row.name}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#01411b',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {(row.totalRuntime || 0).toLocaleString('vi-VN')}h
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0284c7',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {(row.totalTickets || 0).toLocaleString('vi-VN')}
                    </td>
                    {machinesToRender.map((mCode) => {
                      const mRt = row[`${mCode}_runtime`] ?? 0
                      const mTk = row[`${mCode}_tickets`] ?? 0
                      const mAct = row[`${mCode}_actualQty`] ?? 0
                      const mRate = row[`${mCode}_runtimeRate`] ?? 0
                      return (
                        <td
                          key={mCode}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            color: '#334155',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{mRt}h</span>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                            ({mTk} phiếu • {mRate}%)
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: '2px solid #0f172a',
                    background: '#f1f5f9',
                    fontWeight: 800
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    TỔNG CỘNG ({timelineChartData.length} KỲ)
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#01411b',
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {(timelineTableTotals.totalRuntime || 0).toLocaleString('vi-VN')}h
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#0284c7',
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {(timelineTableTotals.totalTickets || 0).toLocaleString('vi-VN')} phiếu
                  </td>
                  {machinesToRender.map((mCode) => {
                    const mTot = timelineTableTotals.machineTotals[mCode] || {
                      runtime: 0,
                      tickets: 0
                    }
                    const mRt = Number((mTot.runtime || 0).toFixed(1))
                    const mTk = mTot.tickets || 0
                    const rate =
                      timelineTableTotals.totalRuntime > 0
                        ? Number(((mRt / timelineTableTotals.totalRuntime) * 100).toFixed(1))
                        : 0
                    return (
                      <td
                        key={mCode}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          color: '#0f172a',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span>{mRt}h</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginLeft: 4,
                            fontWeight: 600
                          }}
                        >
                          ({mTk} phiếu • {rate}%)
                        </span>
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Bảng Gom nhóm theo Cụm Máy Phong Cách OpenAI Technical Table (Khi ở Summary) */}
        {viewTab === 'summary' && showMachineSummaryTable && (
          <div
            style={{
              width: '100%',
              marginTop: 20,
              marginBottom: 8,
              overflowX: 'auto',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              background: '#ffffff'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                textAlign: 'left',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1.5px solid #0f172a', background: '#f8fafc' }}>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Mã &amp; Cụm máy sản xuất
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Tổ sản xuất
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Số phiếu
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Giờ chạy (h)
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    % Tải trọng
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Tỷ lệ MES (%)
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Sản lượng Đạt
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Tốc độ TB/h
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayMachineList.map((m, idx) => (
                  <tr
                    key={m.machineCode || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {m.machineCode} {m.machineName ? `— ${m.machineName}` : ''}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {m.team || m.teamName || '—'}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    >
                      {(m.tickets || m.ticketCount || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: (m.runtimeHours || 0) > standardCapacityHours ? '#d97706' : '#01411b'
                      }}
                    >
                      {(m.runtimeHours || 0).toLocaleString('vi-VN')}h
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155' }}>
                      {m.runtimeVsCapacity || 0}%
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#01411b' }}>
                      {m.mesRate || 0}%
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#01411b'
                      }}
                    >
                      {(m.passQty || m.totalPassQty || 0).toLocaleString('vi-VN')} {m.unit || 'm'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                      {(m.speedPerHour || m.speed || 0).toLocaleString('vi-VN')} {m.unit || 'm'}/h
                    </td>
                  </tr>
                ))}
              </tbody>
              {machineGrandTotal && (
                <tfoot>
                  <tr
                    style={{
                      borderTop: '2px solid #0f172a',
                      background: '#f1f5f9',
                      fontWeight: 800
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#0f172a' }}>TỔNG CỘNG TOÀN XƯỞNG</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {displayMachineList.length} CỤM MÁY
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        color: '#0f172a',
                        fontWeight: 800
                      }}
                    >
                      {(machineGrandTotal.totalTickets || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        color: '#01411b',
                        fontWeight: 800
                      }}
                    >
                      {(machineGrandTotal.totalRuntime || 0).toLocaleString('vi-VN')}h
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                      {machineGrandTotal.runtimeVsCapacity || 0}%
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                      {machineGrandTotal.avgPassRate || 100}%
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        color: '#01411b',
                        fontWeight: 800
                      }}
                    >
                      {(machineGrandTotal.totalPass || 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                      {(machineGrandTotal.speedPerHour || 0).toLocaleString('vi-VN')} /h
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MachineRuntimeSection
