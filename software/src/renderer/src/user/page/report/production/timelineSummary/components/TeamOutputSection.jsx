/* eslint-disable react/prop-types */
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList
} from 'recharts'
import { TableProperties, ChevronDown, Search } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'

// Bảng màu ERP chuẩn cho Tổ sản xuất
const TEAM_PALETTE = [
  '#01411b', // GS Forest Green
  '#0284c7', // Sky Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#ea580c', // Orange
  '#dc2626', // Crimson Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#be185d', // Rose Pink
  '#0d9488', // Teal
  '#64748b' // Slate
]

// Custom Executive Dropdown cho "Soi Tổ SX"
function TeamSelectorDropdown({
  selectedTeams = [],
  onToggleTeam,
  onSelectAll,
  onClear,
  teamList = []
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

  const filteredTeams = useMemo(() => {
    if (!searchKey.trim()) return teamList
    const q = searchKey.toLowerCase().trim()
    return teamList.filter((t) => t.toLowerCase().includes(q))
  }, [teamList, searchKey])

  const isAll = !selectedTeams || selectedTeams.length === 0
  const selectedCount = selectedTeams?.length || 0

  const getButtonText = () => {
    if (isAll) return 'Toàn bộ tổ SX'
    if (selectedCount === 1) return selectedTeams[0]
    if (selectedCount === 2) return `${selectedTeams[0]}, ${selectedTeams[1]}`
    return `${selectedCount} tổ (${selectedTeams[0]}, +${selectedCount - 1})`
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
        Soi Tổ:
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
          minWidth: 140,
          maxWidth: 220,
          justifyContent: 'space-between',
          textAlign: 'left',
          fontSize: 12,
          fontWeight: isAll ? 500 : 700,
          color: isAll ? '#475569' : '#1d4ed8',
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3
        }}
        title="Bấm để chọn 1 hoặc nhiều tổ sản xuất cần đối chiếu"
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}
        >
          {getButtonText()}
        </span>
        <ChevronDown size={13} style={{ color: isAll ? '#64748b' : '#2563eb', flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            width: 280,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            padding: 8,
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              position: 'relative',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={13}
              style={{ position: 'absolute', left: 8, color: '#94a3b8', pointerEvents: 'none' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Tìm tổ sản xuất..."
              style={{
                width: '100%',
                height: 28,
                padding: '0 8px 0 26px',
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 2px 6px',
              borderBottom: '1px solid #f1f5f9',
              fontSize: 11
            }}
          >
            <button
              type="button"
              onClick={onSelectAll}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#2563eb',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={onClear}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              Bỏ chọn
            </button>
          </div>

          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              marginTop: 4
            }}
          >
            {filteredTeams.map((tName) => {
              const isChecked = isAll || selectedTeams.includes(tName)
              return (
                <div
                  key={tName}
                  onClick={() => onToggleTeam(tName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: isChecked ? '#0f172a' : '#64748b',
                    background: isChecked ? '#f8fafc' : 'transparent',
                    fontWeight: isChecked ? 600 : 400
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{ cursor: 'pointer', margin: 0 }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tName}
                  </span>
                </div>
              )
            })}
            {filteredTeams.length === 0 && (
              <div
                style={{
                  padding: '12px 6px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#94a3b8'
                }}
              >
                Không tìm thấy tổ sản xuất
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TeamOutputSection({
  teamAggregates = [],
  teamTimelineBreakdown = {},
  teamGrandTotal,
  showTeamSummaryTable,
  setShowTeamSummaryTable,
  plantName = 'Nhà máy',
  sectionNumber = 3
}) {
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' | 'summary'
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [metricMode, setMetricMode] = useState('actualQty') // 'actualQty' | 'passQty' | 'defectQty' | 'passRate' | 'defectRate' | 'tickets'
  const [summaryChartMode, setSummaryChartMode] = useState('volume') // 'volume' | 'rate'
  const [selectedTeams, setSelectedTeams] = useState([])
  const [visibleSeries, setVisibleSeries] = useState({})

  // Danh sách tổ sản xuất
  const rawTeamList = useMemo(() => {
    if (teamTimelineBreakdown?.teamList?.length > 0) {
      return teamTimelineBreakdown.teamList
    }
    return teamAggregates.map((t) => t.teamName || t.team).filter(Boolean)
  }, [teamTimelineBreakdown, teamAggregates])

  // Danh sách tổ đang hiển thị
  const teamsToRender = useMemo(() => {
    if (selectedTeams.length > 0) {
      return selectedTeams
    }
    return rawTeamList
  }, [selectedTeams, rawTeamList])

  const toggleTeamSelection = (tName) => {
    setSelectedTeams((prev) =>
      prev.includes(tName) ? prev.filter((x) => x !== tName) : [...prev, tName]
    )
  }

  const toggleSeriesVisibility = (tName) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [tName]: prev[tName] === false ? true : false
    }))
  }

  // Active timeline list theo periodType
  const activeTimelineList = useMemo(() => {
    if (periodType === 'monthly' && teamTimelineBreakdown?.monthlyList?.length > 0) {
      return teamTimelineBreakdown.monthlyList
    }
    if (periodType === 'quarterly' && teamTimelineBreakdown?.quarterlyList?.length > 0) {
      return teamTimelineBreakdown.quarterlyList
    }
    return teamTimelineBreakdown?.dailyList || []
  }, [teamTimelineBreakdown, periodType])

  // Chart data cho Timeline view
  const timelineChartData = useMemo(() => {
    return activeTimelineList.map((item, idx) => {
      const dateKey = item.date || item.periodKey || `item_${idx}`
      const name = item.name || item.shortDate || dateKey
      const totalActualQty = item.totalActualQty ?? item.actualQty ?? 0
      const totalPassQty = item.totalPassQty ?? item.passQty ?? 0
      const totalDefectQty = item.totalDefectQty ?? item.defectQty ?? 0
      const totalTickets = item.totalTickets ?? item.ticketCount ?? 0

      const row = {
        ...item,
        dateKey,
        name,
        totalActualQty,
        totalPassQty,
        totalDefectQty,
        totalTickets
      }

      let maxVal = 0
      let activeSum = 0

      teamsToRender.forEach((tName) => {
        const tAct = item[`${tName}_actualQty`] ?? item[tName] ?? 0
        const tPass = item[`${tName}_passQty`] ?? 0
        const tDef = item[`${tName}_defectQty`] ?? 0
        const tTk = item[`${tName}_tickets`] ?? 0
        const tPRate =
          item[`${tName}_passRate`] ?? (tAct > 0 ? Number(((tPass / tAct) * 100).toFixed(1)) : 100)
        const tDRate =
          item[`${tName}_defectRate`] ?? (tAct > 0 ? Number(((tDef / tAct) * 100).toFixed(1)) : 0)

        const val =
          metricMode === 'passQty'
            ? tPass
            : metricMode === 'defectQty'
              ? tDef
              : metricMode === 'passRate'
                ? tPRate
                : metricMode === 'defectRate'
                  ? tDRate
                  : metricMode === 'tickets'
                    ? tTk
                    : tAct

        row[tName] = val
        row[`${tName}_actualQty`] = tAct
        row[`${tName}_passQty`] = tPass
        row[`${tName}_defectQty`] = tDef
        row[`${tName}_passRate`] = tPRate
        row[`${tName}_defectRate`] = tDRate
        row[`${tName}_tickets`] = tTk

        if (visibleSeries[tName] !== false) {
          if (val > maxVal) maxVal = val
          activeSum += val
        }
      })

      row.peakVal = maxVal
      row.activeSum = activeSum

      return row
    })
  }, [activeTimelineList, teamsToRender, metricMode, visibleSeries])

  // Summary chart data cho chế độ Cơ cấu tổng hợp
  const summaryChartData = useMemo(() => {
    return teamAggregates.map((t) => {
      const name = t.teamName || t.team || 'Tổ khác'
      const actualQty = Number(t.totalActualQty || t.actualQty || 0)
      const passQty = Number(t.totalPassQty || t.passQty || 0)
      const defectQty = Number(t.totalDefectQty || t.defectQty || 0)
      const passRate = actualQty > 0 ? Number(((passQty / actualQty) * 100).toFixed(1)) : 100
      const defectRate = actualQty > 0 ? Number(((defectQty / actualQty) * 100).toFixed(1)) : 0
      return {
        ...t,
        name,
        fullName: name,
        actualQty,
        passQty,
        defectQty,
        passRate,
        defectRate,
        ticketCount: t.ticketCount || t.tickets || 0
      }
    })
  }, [teamAggregates])

  // Tổng hợp cho bảng Timeline OpenAI Technical Table theo Tổ SX
  const timelineTableTotals = useMemo(() => {
    let totalAct = 0
    let totalPass = 0
    let totalDef = 0
    let totalTk = 0
    const teamTotals = {}
    teamsToRender.forEach((tName) => {
      teamTotals[tName] = { actualQty: 0, passQty: 0, defectQty: 0, tickets: 0 }
    })

    timelineChartData.forEach((row) => {
      totalAct += row.totalActualQty || 0
      totalPass += row.totalPassQty || 0
      totalDef += row.totalDefectQty || 0
      totalTk += row.totalTickets || 0
      teamsToRender.forEach((tName) => {
        if (!teamTotals[tName]) {
          teamTotals[tName] = { actualQty: 0, passQty: 0, defectQty: 0, tickets: 0 }
        }
        teamTotals[tName].actualQty += row[`${tName}_actualQty`] || 0
        teamTotals[tName].passQty += row[`${tName}_passQty`] || 0
        teamTotals[tName].defectQty += row[`${tName}_defectQty`] || 0
        teamTotals[tName].tickets += row[`${tName}_tickets`] || 0
      })
    })

    const overallPassRate = totalAct > 0 ? Number(((totalPass / totalAct) * 100).toFixed(1)) : 100

    return {
      totalActualQty: totalAct,
      totalPassQty: totalPass,
      totalDefectQty: totalDef,
      totalTickets: totalTk,
      overallPassRate,
      teamTotals
    }
  }, [timelineChartData, teamsToRender])

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
            <span>{sectionNumber}. THỐNG KÊ SẢN LƯỢNG SẢN XUẤT &amp; ĐẠT THEO TỔ SẢN XUẤT</span>
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
            Thống kê đối chiếu tổng sản lượng sản xuất thực tế, sản lượng đạt chuẩn KCS và lượng lỗi
            của <b>{teamAggregates.length} tổ sản xuất</b> ghi nhận trong kỳ (
            {plantName || 'Nhà máy'}). Biểu đồ trực quan hóa diễn biến theo ngày/tháng/quý, phân bổ
            sản lượng và tỷ lệ đạt chuẩn giữa các tổ.
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
                {teamTimelineBreakdown?.monthlyList?.length > 0 && (
                  <TabsTrigger value="monthly">Tháng</TabsTrigger>
                )}
                {teamTimelineBreakdown?.quarterlyList?.length > 0 && (
                  <TabsTrigger value="quarterly">Quý</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}

          {/* Soi Tổ Dropdown */}
          {viewTab === 'timeline' && (
            <TeamSelectorDropdown
              selectedTeams={selectedTeams}
              onToggleTeam={toggleTeamSelection}
              onSelectAll={() => setSelectedTeams([])}
              onClear={() => setSelectedTeams([])}
              teamList={rawTeamList}
            />
          )}

          {/* Metric mode switcher */}
          {viewTab === 'timeline' ? (
            <Tabs value={metricMode} onValueChange={setMetricMode}>
              <TabsList>
                <TabsTrigger value="actualQty">Sản lượng (SP)</TabsTrigger>
                <TabsTrigger value="passQty">Đạt KCS (SP)</TabsTrigger>
                <TabsTrigger value="defectQty">Lỗi (SP)</TabsTrigger>
                <TabsTrigger value="passRate">Tỷ lệ Đạt (%)</TabsTrigger>
                <TabsTrigger value="tickets">Số phiếu</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <Tabs value={summaryChartMode} onValueChange={setSummaryChartMode}>
              <TabsList>
                <TabsTrigger value="volume">Sản lượng &amp; Đạt (SP)</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ Đạt KCS (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Action Button: Mở / đóng bảng số liệu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (setShowTeamSummaryTable) {
                setShowTeamSummaryTable(!showTeamSummaryTable)
              }
            }}
            className={`uppercase text-[11px] font-semibold ${
              showTeamSummaryTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu theo tổ"
          >
            <TableProperties
              size={13}
              className={showTeamSummaryTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showTeamSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
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
            <span style={{ fontWeight: 700, color: '#475569' }}>Lọc tổ sản xuất:</span>
            {teamsToRender.map((tName, idx) => {
              const color = TEAM_PALETTE[idx % TEAM_PALETTE.length]
              const isVisible = visibleSeries[tName] !== false
              return (
                <div
                  key={tName}
                  onClick={() => toggleSeriesVisibility(tName)}
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
                  title={`Bấm để ${isVisible ? 'ẩn' : 'hiện'} tổ "${tName}"`}
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
                  <span>{tName}</span>
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
                    domain={metricMode.includes('Rate') ? [0, 100] : [0, 'auto']}
                    unit={metricMode.includes('Rate') ? '%' : undefined}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={
                      metricMode.includes('Rate')
                        ? (val) => `${val}%`
                        : (val) => `${val.toLocaleString('vi-VN')}`
                    }
                  />
                  <RechartsTooltip
                    content={
                      <ExecutiveChartTooltip
                        customFormatter={(val) =>
                          metricMode.includes('Rate')
                            ? `${val}%`
                            : metricMode === 'tickets'
                              ? `${val} phiếu`
                              : `${typeof val === 'number' ? val.toLocaleString('vi-VN') : val} SP`
                        }
                      />
                    }
                  />

                  {/* Bars for each active team */}
                  {teamsToRender.map((tName, idx) => {
                    if (visibleSeries[tName] === false) return null
                    const color = TEAM_PALETTE[idx % TEAM_PALETTE.length]
                    return (
                      <Bar
                        key={tName}
                        dataKey={tName}
                        name={tName}
                        fill={color}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={38}
                      >
                        <LabelList
                          dataKey={tName}
                          position="top"
                          fill="#334155"
                          fontSize={10}
                          fontWeight={700}
                          offset={4}
                          formatter={(val) =>
                            val > 0
                              ? metricMode.includes('Rate')
                                ? `${val}%`
                                : `${val.toLocaleString('vi-VN')}`
                              : ''
                          }
                        />
                      </Bar>
                    )
                  })}

                  {/* Peak trend line connecting active team tops across dates */}
                  {!metricMode.includes('Rate') && (
                    <Line
                      type="monotone"
                      dataKey={teamsToRender.length === 1 ? teamsToRender[0] : 'peakVal'}
                      name={
                        teamsToRender.length === 1
                          ? `Diễn biến ${teamsToRender[0]} (${metricMode === 'tickets' ? 'phiếu' : 'SP'})`
                          : `Đỉnh sản lượng tổ SX (${metricMode === 'tickets' ? 'phiếu' : 'SP'})`
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
                Chưa có dữ liệu chuỗi thời gian tổ sản xuất
              </div>
            )
          ) : (
            /* Summary Horizontal Bar Chart */
            <ResponsiveContainer width="100%" height="100%">
              {summaryChartMode === 'rate' ? (
                <BarChart
                  layout="vertical"
                  data={summaryChartData}
                  margin={{ top: 15, right: 90, left: 160, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#cbd5e1"
                    tickLine={true}
                    tickFormatter={(v) => `${v}%`}
                    fontSize={11.5}
                    tick={{ fill: '#334155' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#cbd5e1"
                    tickLine={true}
                    fontSize={12}
                    tick={{ fill: '#0f172a', fontWeight: 700 }}
                    width={150}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip unit="%" />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="passRate"
                    name="Tỷ lệ Đạt KCS (%)"
                    fill="#01411b"
                    barSize={16}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="passRate"
                      position="right"
                      formatter={(v) => `${v}%`}
                      style={{ fill: '#01411b', fontSize: 11, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart
                  layout="vertical"
                  data={summaryChartData}
                  margin={{ top: 15, right: 90, left: 160, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    tickFormatter={(v) => v.toLocaleString('vi-VN')}
                    fontSize={11.5}
                    tick={{ fill: '#334155' }}
                    label={{
                      value: 'Sản lượng (SP)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#334155',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={12}
                    tick={{ fill: '#0f172a', fontWeight: 700 }}
                    width={150}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip unit=" SP" />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="actualQty"
                    name="SL Sản xuất thực tế"
                    fill="#01411b"
                    barSize={14}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="actualQty"
                      position="right"
                      formatter={(v) =>
                        v !== undefined && v !== null && v > 0
                          ? Number(v).toLocaleString('vi-VN')
                          : ''
                      }
                      style={{ fill: '#01411b', fontSize: 10, fontWeight: 700 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="passQty"
                    name="SL Đạt KCS"
                    fill="#166534"
                    barSize={14}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="passQty"
                      position="right"
                      formatter={(v) =>
                        v !== undefined && v !== null && v > 0
                          ? Number(v).toLocaleString('vi-VN')
                          : ''
                      }
                      style={{ fill: '#166534', fontSize: 10, fontWeight: 700 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="defectQty"
                    name="SL Lỗi / Phế phẩm"
                    fill="#be123c"
                    barSize={14}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="defectQty"
                      position="right"
                      formatter={(v) =>
                        v !== undefined && v !== null && v > 0
                          ? Number(v).toLocaleString('vi-VN')
                          : ''
                      }
                      style={{ fill: '#be123c', fontSize: 10, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3.1. BẢNG DIỄN BIẾN THEO THỜI GIAN THEO TỔ SX (OPENAI TECHNICAL TABLE) */}
      {viewTab === 'timeline' && showTeamSummaryTable && hasTimelineData && (
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
                  Tổng SL SX (SP)
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
                  Tổng Đạt KCS
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#dc2626',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Tổng Lỗi (SP)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Tỷ lệ Đạt
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Tổng phiếu
                </th>
                {teamsToRender.map((tName, idx) => (
                  <th
                    key={tName}
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: TEAM_PALETTE[idx % TEAM_PALETTE.length],
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timelineChartData.map((row, idx) => {
                const dayAct = row.totalActualQty || 0
                const dayPass = row.totalPassQty || 0
                const dayDef = row.totalDefectQty || 0
                const dayRate = dayAct > 0 ? Number(((dayPass / dayAct) * 100).toFixed(1)) : 100

                return (
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
                      {dayAct.toLocaleString('vi-VN')}
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
                      {dayPass.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: dayDef > 0 ? '#dc2626' : '#64748b',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {dayDef.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: dayRate >= 98 ? '#01411b' : dayRate >= 90 ? '#d97706' : '#dc2626',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {dayRate}%
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {(row.totalTickets || 0).toLocaleString('vi-VN')}
                    </td>
                    {teamsToRender.map((tName) => {
                      const tAct = row[`${tName}_actualQty`] ?? 0
                      const tPass = row[`${tName}_passQty`] ?? 0
                      const tRate = row[`${tName}_passRate`] ?? 100

                      return (
                        <td
                          key={tName}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            color: '#334155',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {tAct.toLocaleString('vi-VN')}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                            ({tPass.toLocaleString('vi-VN')} Đạt • {tRate}%)
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
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
                  {(timelineTableTotals.totalActualQty || 0).toLocaleString('vi-VN')}
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
                  {(timelineTableTotals.totalPassQty || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: timelineTableTotals.totalDefectQty > 0 ? '#dc2626' : '#0f172a',
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {(timelineTableTotals.totalDefectQty || 0).toLocaleString('vi-VN')}
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
                  {timelineTableTotals.overallPassRate}%
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#475569',
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {(timelineTableTotals.totalTickets || 0).toLocaleString('vi-VN')}
                </td>
                {teamsToRender.map((tName) => {
                  const tTot = timelineTableTotals.teamTotals[tName] || {
                    actualQty: 0,
                    passQty: 0,
                    defectQty: 0,
                    tickets: 0
                  }
                  const tAct = tTot.actualQty || 0
                  const tPass = tTot.passQty || 0
                  const tRate = tAct > 0 ? Number(((tPass / tAct) * 100).toFixed(1)) : 100

                  return (
                    <td
                      key={tName}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        color: '#0f172a',
                        fontWeight: 800,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{tAct.toLocaleString('vi-VN')}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginLeft: 4,
                          fontWeight: 600
                        }}
                      >
                        ({tPass.toLocaleString('vi-VN')} Đạt • {tRate}%)
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 3.2. BẢNG GOM NHÓM THEO TỔ SẢN XUẤT (OPENAI TECHNICAL TABLE) */}
      {viewTab === 'summary' && showTeamSummaryTable && (
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
                  SL Sản xuất (SP)
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
                  SL Đạt KCS (SP)
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
                  Phế phẩm / Lỗi (SP)
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
                  Tỷ lệ đạt KCS (%)
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
                  Cảnh báo (&lt;5p / &gt;12h)
                </th>
              </tr>
            </thead>
            <tbody>
              {teamAggregates.map((row, idx) => (
                <tr
                  key={row.teamName || row.team || idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.teamName || row.team || 'Không xác định'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    {(row.ticketCount || row.tickets || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#01411b'
                    }}
                  >
                    {(row.totalActualQty || row.actualQty || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0284c7'
                    }}
                  >
                    {(row.totalPassQty || row.passQty || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color:
                        Number(row.totalDefectQty || row.defectQty || 0) > 0 ? '#dc2626' : '#64748b'
                    }}
                  >
                    <span
                      style={{
                        fontWeight: Number(row.totalDefectQty || row.defectQty || 0) > 0 ? 700 : 400
                      }}
                    >
                      {(row.totalDefectQty || row.defectQty || 0).toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color:
                        (row.passRate || 0) >= 98
                          ? '#01411b'
                          : (row.passRate || 0) >= 90
                            ? '#d97706'
                            : '#dc2626'
                    }}
                  >
                    {row.passRate || 100}%
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#334155'
                    }}
                  >
                    {row.mesRate || 0}%
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12 }}>
                    {row.under5Min > 0 && (
                      <span
                        style={{ color: '#dc2626', fontWeight: 700, marginRight: 6 }}
                        title="Số đơn nhập dưới 5 phút"
                      >
                        {row.under5Min} (&lt;5p)
                      </span>
                    )}
                    {row.anomalies > 0 && (
                      <span
                        style={{ color: '#dc2626', fontWeight: 700 }}
                        title="Số đơn chạy trên 12h cần kiểm tra"
                      >
                        {row.anomalies} (&gt;12h)
                      </span>
                    )}
                    {!row.under5Min && !row.anomalies && (
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Chuẩn</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {teamGrandTotal && (
              <tfoot>
                <tr
                  style={{
                    borderTop: '2px solid #0f172a',
                    background: '#f1f5f9',
                    fontWeight: 800
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                    TỔNG CỘNG ({teamAggregates.length} TỔ)
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#0f172a',
                      fontWeight: 800
                    }}
                  >
                    {(teamGrandTotal.totalTickets || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#01411b',
                      fontWeight: 800
                    }}
                  >
                    {(teamGrandTotal.totalActual || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#0284c7',
                      fontWeight: 800
                    }}
                  >
                    {(teamGrandTotal.totalPass || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: teamGrandTotal.totalDefect > 0 ? '#dc2626' : '#0f172a',
                      fontWeight: 800
                    }}
                  >
                    {(teamGrandTotal.totalDefect || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#01411b',
                      fontWeight: 800
                    }}
                  >
                    {teamGrandTotal.avgPassRate || 100}%
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#334155',
                      fontWeight: 800
                    }}
                  >
                    {teamGrandTotal.avgMesRate || 0}%
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                    {teamGrandTotal.totalUnder5 > 0 && (
                      <span style={{ color: '#dc2626', marginRight: 6 }}>
                        {teamGrandTotal.totalUnder5} (&lt;5p)
                      </span>
                    )}
                    {teamGrandTotal.totalAnomalies > 0 && (
                      <span style={{ color: '#dc2626' }}>
                        {teamGrandTotal.totalAnomalies} (&gt;12h)
                      </span>
                    )}
                    {!teamGrandTotal.totalUnder5 && !teamGrandTotal.totalAnomalies && (
                      <span style={{ color: '#64748b' }}>Chuẩn</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
