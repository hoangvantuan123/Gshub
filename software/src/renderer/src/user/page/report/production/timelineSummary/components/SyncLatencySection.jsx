/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
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
  LabelList,
  Cell
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'
import { parseSyncDelayToSeconds } from '../../hanoiGs1/stat/hooks/useProductionStatisticsLogic'

export function SyncLatencySection({
  kpiMetrics = {},
  filteredData = [],
  dailyAggregates = [],
  backendReportData = {},
  showSyncTable,
  setShowSyncTable,
  plantName = 'Nhà máy',
  sectionNumber = '4.1'
}) {
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' | 'summary'
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [metricMode, setMetricMode] = useState('timeline_composed') // 'timeline_composed' | 'avg_delay' | 'instant_rate' | 'count'
  const [summaryMetricMode, setSummaryMetricMode] = useState('count') // 'count' | 'rate'

  const totalTickets = kpiMetrics.totalTickets || 0

  // 1. Dữ liệu Cơ cấu tổng hợp (Summary View)
  const summaryChartData = useMemo(() => {
    let list =
      kpiMetrics.syncBreakdown && kpiMetrics.syncBreakdown.length > 0
        ? kpiMetrics.syncBreakdown
        : backendReportData?.syncDelayBreakdown && backendReportData.syncDelayBreakdown.length > 0
          ? backendReportData.syncDelayBreakdown
          : backendReportData?.data?.syncDelayBreakdown &&
              backendReportData.data.syncDelayBreakdown.length > 0
            ? backendReportData.data.syncDelayBreakdown
            : []

    if (list.length === 0 && filteredData && filteredData.length > 0) {
      let syncUnder10 = 0
      let sync11to30 = 0
      let sync31to60 = 0
      let syncOver60 = 0
      let syncEmpty = 0
      const total = filteredData.length

      filteredData.forEach((item) => {
        const rawDelay =
          item.syncDelay !== undefined && item.syncDelay !== null && item.syncDelay !== ''
            ? item.syncDelay
            : item.SyncDelayMinutes !== undefined &&
                item.SyncDelayMinutes !== null &&
                item.SyncDelayMinutes !== ''
              ? item.SyncDelayMinutes
              : item.syncDelayMinutes !== undefined &&
                  item.syncDelayMinutes !== null &&
                  item.syncDelayMinutes !== ''
                ? item.syncDelayMinutes
                : item.SyncDelay
        const parsedSec = parseSyncDelayToSeconds(rawDelay, item)
        if (parsedSec === null || parsedSec === undefined || isNaN(parsedSec)) {
          syncEmpty++
        } else if (parsedSec <= 10) {
          syncUnder10++
        } else if (parsedSec <= 30) {
          sync11to30++
        } else if (parsedSec <= 60) {
          sync31to60++
        } else {
          syncOver60++
        }
      })

      list = [
        {
          group: '≤ 10 giây',
          shortGroup: '≤ 10s',
          count: syncUnder10,
          rate: total > 0 ? Number(((syncUnder10 / total) * 100).toFixed(1)) : 0,
          color: '#01411b'
        },
        {
          group: '11 – 30 giây',
          shortGroup: '11–30s',
          count: sync11to30,
          rate: total > 0 ? Number(((sync11to30 / total) * 100).toFixed(1)) : 0,
          color: '#166534'
        },
        {
          group: '31 – 60 giây',
          shortGroup: '31–60s',
          count: sync31to60,
          rate: total > 0 ? Number(((sync31to60 / total) * 100).toFixed(1)) : 0,
          color: '#475569'
        },
        {
          group: '> 60 giây (Độ trễ cao)',
          shortGroup: '> 60s',
          count: syncOver60,
          rate: total > 0 ? Number(((syncOver60 / total) * 100).toFixed(1)) : 0,
          color: '#64748b'
        },
        {
          group: 'Không đồng bộ (trống)',
          shortGroup: 'Trống',
          count: syncEmpty,
          rate: total > 0 ? Number(((syncEmpty / total) * 100).toFixed(1)) : 0,
          color: '#94a3b8'
        }
      ]
    }

    return list.map((item) => {
      const gName = item.group || item.Group || item.label || item.Label || ''
      const countVal = Number(item.count ?? item.Count ?? 0)
      const rateVal = Number(item.rate ?? item.Rate ?? 0)
      const fill = item.color || item.Color || '#01411b'
      return {
        ...item,
        group: gName,
        shortGroup: item.shortGroup || item.ShortGroup || gName,
        name: gName,
        fullName: gName,
        countVal,
        rateVal,
        fill
      }
    })
  }, [kpiMetrics.syncBreakdown, backendReportData, filteredData])

  // 2. Dữ liệu Diễn biến theo thời gian (Timeline View)
  const timelineData = useMemo(() => {
    // Trường hợp 1: Có filteredData chi tiết
    if (filteredData && filteredData.length > 0) {
      const dateMap = new Map()
      const monthMap = new Map()
      const quarterMap = new Map()

      filteredData.forEach((item) => {
        const rawDate = item.prodDate || item.date || item.StatDate || item.StartDate || ''
        let dStr = String(rawDate).trim()
        if (dStr.length > 10) dStr = dStr.slice(0, 10)
        if (!dStr) dStr = 'Khác'

        const mKey = dStr.length >= 7 ? dStr.slice(0, 7) : 'Khác'
        let qKey = 'Khác'
        if (dStr.length >= 7) {
          const year = dStr.slice(0, 4)
          const monthNum = parseInt(dStr.slice(5, 7), 10)
          const qNum = Math.ceil(monthNum / 3)
          qKey = `${year}-Q${qNum}`
        }

        const rawDelay =
          item.syncDelay !== undefined && item.syncDelay !== null && item.syncDelay !== ''
            ? item.syncDelay
            : item.SyncDelayMinutes !== undefined &&
                item.SyncDelayMinutes !== null &&
                item.SyncDelayMinutes !== ''
              ? item.SyncDelayMinutes
              : item.syncDelayMinutes !== undefined &&
                  item.syncDelayMinutes !== null &&
                  item.syncDelayMinutes !== ''
                ? item.syncDelayMinutes
                : item.SyncDelay
        const parsedSec = parseSyncDelayToSeconds(rawDelay, item)

        const updateAgg = (map, key) => {
          if (!map.has(key)) {
            map.set(key, {
              key,
              totalTickets: 0,
              under10: 0,
              from11to30: 0,
              from31to60: 0,
              over60: 0,
              syncEmpty: 0,
              totalSyncSec: 0,
              syncCount: 0
            })
          }
          const agg = map.get(key)
          agg.totalTickets++
          if (parsedSec === null || parsedSec === undefined || isNaN(parsedSec)) {
            agg.syncEmpty++
          } else {
            agg.totalSyncSec += parsedSec
            agg.syncCount++
            if (parsedSec <= 10) agg.under10++
            else if (parsedSec <= 30) agg.from11to30++
            else if (parsedSec <= 60) agg.from31to60++
            else agg.over60++
          }
        }

        updateAgg(dateMap, dStr)
        updateAgg(monthMap, mKey)
        updateAgg(quarterMap, qKey)
      })

      const formatList = (map) => {
        return Array.from(map.values())
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((agg) => {
            const shortDate =
              agg.key.length === 10
                ? `${agg.key.slice(8, 10)}/${agg.key.slice(5, 7)}`
                : agg.key.length === 7
                  ? `T${agg.key.slice(5, 7)}/${agg.key.slice(0, 4)}`
                  : agg.key
            const avgDelaySec =
              agg.syncCount > 0 ? Number((agg.totalSyncSec / agg.syncCount).toFixed(1)) : 0
            const instantRate =
              agg.totalTickets > 0
                ? Number(((agg.under10 / agg.totalTickets) * 100).toFixed(1))
                : 100
            const syncRate =
              agg.totalTickets > 0
                ? Number((((agg.totalTickets - agg.syncEmpty) / agg.totalTickets) * 100).toFixed(1))
                : 100

            return {
              dateKey: agg.key,
              name: shortDate,
              fullName: agg.key,
              totalTickets: agg.totalTickets,
              under10: agg.under10,
              from11to30: agg.from11to30,
              from31to60: agg.from31to60,
              over60: agg.over60,
              syncEmpty: agg.syncEmpty,
              avgDelaySec,
              instantRate,
              syncRate
            }
          })
      }

      return {
        dailyList: formatList(dateMap),
        monthlyList: formatList(monthMap),
        quarterlyList: formatList(quarterMap)
      }
    }

    // Trường hợp 2: Dựa trên dailyAggregates từ BE
    const list =
      dailyAggregates && dailyAggregates.length > 0
        ? dailyAggregates
        : backendReportData?.dailyAggregates && backendReportData.dailyAggregates.length > 0
          ? backendReportData.dailyAggregates
          : backendReportData?.chartByDay && backendReportData.chartByDay.length > 0
            ? backendReportData.chartByDay
            : backendReportData?.data?.dailyAggregates &&
                backendReportData.data.dailyAggregates.length > 0
              ? backendReportData.data.dailyAggregates
              : backendReportData?.data?.chartByDay || []

    const monthMap = new Map()
    const quarterMap = new Map()

    const dailyList = list.map((d) => {
      const dStr = d.date || ''
      const shortDate = dStr.length === 10 ? `${dStr.slice(8, 10)}/${dStr.slice(5, 7)}` : dStr
      const tk = Number(d.ticketCount || 0)
      const u10 = Number(d.under10 ?? d.syncUnder10 ?? 0)
      const f11to30 = Number(d.from11to30 ?? d.sync11to30 ?? 0)
      const f31to60 = Number(d.from31to60 ?? d.sync31to60 ?? 0)
      const o60 = Number(d.over60 ?? d.syncOver60 ?? 0)
      const sEmpty = Number(d.syncEmpty ?? Math.max(0, tk - (u10 + f11to30 + f31to60 + o60)))
      const avgDelaySec = Number(d.avgSyncDelaySeconds ?? d.avgDelaySec ?? 0)
      const instantRate =
        d.instantRate !== undefined && d.instantRate !== null
          ? Number(d.instantRate)
          : tk > 0
            ? Number(((u10 / tk) * 100).toFixed(1))
            : 100
      const syncRate = tk > 0 ? Number((((tk - sEmpty) / tk) * 100).toFixed(1)) : 100

      const mKey = dStr.length >= 7 ? dStr.slice(0, 7) : 'Khác'
      let qKey = 'Khác'
      if (dStr.length >= 7) {
        const year = dStr.slice(0, 4)
        const monthNum = parseInt(dStr.slice(5, 7), 10)
        const qNum = Math.ceil(monthNum / 3)
        qKey = `${year}-Q${qNum}`
      }

      const updatePeriod = (map, key) => {
        if (!map.has(key)) {
          map.set(key, {
            key,
            totalTickets: 0,
            under10: 0,
            from11to30: 0,
            from31to60: 0,
            over60: 0,
            syncEmpty: 0,
            totalSyncSec: 0,
            syncCount: 0
          })
        }
        const agg = map.get(key)
        agg.totalTickets += tk
        agg.under10 += u10
        agg.from11to30 += f11to30
        agg.from31to60 += f31to60
        agg.over60 += o60
        agg.syncEmpty += sEmpty
        const syncCnt = u10 + f11to30 + f31to60 + o60
        agg.syncCount += syncCnt
        agg.totalSyncSec += avgDelaySec * syncCnt
      }

      if (dStr) {
        updatePeriod(monthMap, mKey)
        updatePeriod(quarterMap, qKey)
      }

      return {
        dateKey: dStr,
        name: shortDate,
        fullName: dStr,
        totalTickets: tk,
        under10: u10,
        from11to30: f11to30,
        from31to60: f31to60,
        over60: o60,
        syncEmpty: sEmpty,
        avgDelaySec,
        instantRate,
        syncRate
      }
    })

    const formatPeriodList = (map) => {
      return Array.from(map.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((agg) => {
          const shortDate =
            agg.key.length === 7 ? `T${agg.key.slice(5, 7)}/${agg.key.slice(0, 4)}` : agg.key
          const avgDelaySec =
            agg.syncCount > 0 ? Number((agg.totalSyncSec / agg.syncCount).toFixed(1)) : 0
          const instantRate =
            agg.totalTickets > 0 ? Number(((agg.under10 / agg.totalTickets) * 100).toFixed(1)) : 100
          const syncRate =
            agg.totalTickets > 0
              ? Number((((agg.totalTickets - agg.syncEmpty) / agg.totalTickets) * 100).toFixed(1))
              : 100
          return {
            dateKey: agg.key,
            name: shortDate,
            fullName: agg.key,
            totalTickets: agg.totalTickets,
            under10: agg.under10,
            from11to30: agg.from11to30,
            from31to60: agg.from31to60,
            over60: agg.over60,
            syncEmpty: agg.syncEmpty,
            avgDelaySec,
            instantRate,
            syncRate
          }
        })
    }

    return {
      dailyList,
      monthlyList: formatPeriodList(monthMap),
      quarterlyList: formatPeriodList(quarterMap)
    }
  }, [filteredData, dailyAggregates, backendReportData])

  const activeTimelineList = useMemo(() => {
    if (periodType === 'monthly' && timelineData.monthlyList?.length > 0) {
      return timelineData.monthlyList
    }
    if (periodType === 'quarterly' && timelineData.quarterlyList?.length > 0) {
      return timelineData.quarterlyList
    }
    return timelineData.dailyList || []
  }, [timelineData, periodType])

  // Tổng hợp cho bảng Timeline OpenAI Technical Table
  const timelineTableTotals = useMemo(() => {
    let totalTk = 0,
      totalUnder10 = 0,
      total11to30 = 0,
      total31to60 = 0,
      totalOver60 = 0,
      totalEmpty = 0,
      sumDelaySec = 0,
      syncDays = 0

    activeTimelineList.forEach((row) => {
      totalTk += row.totalTickets || 0
      totalUnder10 += row.under10 || 0
      total11to30 += row.from11to30 || 0
      total31to60 += row.from31to60 || 0
      totalOver60 += row.over60 || 0
      totalEmpty += row.syncEmpty || 0
      if (row.avgDelaySec > 0) {
        sumDelaySec += row.avgDelaySec
        syncDays++
      }
    })

    const avgDelaySec = syncDays > 0 ? Number((sumDelaySec / syncDays).toFixed(1)) : 0
    const instantRate = totalTk > 0 ? Number(((totalUnder10 / totalTk) * 100).toFixed(1)) : 100

    return {
      totalTickets: totalTk,
      under10: totalUnder10,
      from11to30: total11to30,
      from31to60: total31to60,
      over60: totalOver60,
      syncEmpty: totalEmpty,
      avgDelaySec,
      instantRate
    }
  }, [activeTimelineList])

  const hasTimelineData = activeTimelineList && activeTimelineList.length > 0

  return (
    <div style={{ width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* 1. Header & Controls (NGOÀI KHUNG BIỂU ĐỒ) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{sectionNumber}. THỐNG KÊ ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#475569',
              marginTop: 4,
              lineHeight: 1.5,
              maxWidth: 620
            }}
          >
            Độ trễ truyền tải từ MES về Bravo ERP trên toàn bộ{' '}
            <b>{totalTickets.toLocaleString('vi-VN')} phiếu</b> ({plantName || 'Nhà máy'}). Độ trễ
            TB: <b style={{ color: '#01411b' }}>{kpiMetrics.avgSyncDelaySeconds || 0}s</b> (
            {kpiMetrics.syncLatencyFormatted || '00:00:00'}) • Tức thời:{' '}
            <b style={{ color: '#01411b' }}>{kpiMetrics.syncSuccessRate || '100%'}</b>.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}
        >
          {/* Tabs chuyển đổi giữa Diễn biến thời gian vs Cơ cấu tổng hợp */}
          <Tabs value={viewTab} onValueChange={setViewTab}>
            <TabsList>
              <TabsTrigger value="timeline">Diễn biến theo thời gian</TabsTrigger>
              <TabsTrigger value="summary">Cơ cấu tổng hợp</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewTab === 'timeline' && (
            <Tabs value={periodType} onValueChange={setPeriodType}>
              <TabsList>
                <TabsTrigger value="daily">Ngày</TabsTrigger>
                {timelineData.monthlyList?.length > 0 && (
                  <TabsTrigger value="monthly">Tháng</TabsTrigger>
                )}
                {timelineData.quarterlyList?.length > 0 && (
                  <TabsTrigger value="quarterly">Quý</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}

          {viewTab === 'timeline' ? (
            <Tabs value={metricMode} onValueChange={setMetricMode}>
              <TabsList>
                <TabsTrigger value="timeline_composed">Phiếu &amp; Trễ TB</TabsTrigger>
                <TabsTrigger value="avg_delay">Độ trễ TB (s)</TabsTrigger>
                <TabsTrigger value="instant_rate">Tỷ lệ tức thời (%)</TabsTrigger>
                <TabsTrigger value="count">Số phiếu</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <Tabs value={summaryMetricMode} onValueChange={setSummaryMetricMode}>
              <TabsList>
                <TabsTrigger value="count">Số phiếu</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (setShowSyncTable) {
                setShowSyncTable(!showSyncTable)
              }
            }}
            className={`uppercase text-[11px] font-semibold ${
              showSyncTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng phân bổ độ trễ đồng bộ"
          >
            <TableProperties
              size={13}
              className={showSyncTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showSyncTable ? 'Đóng bảng' : 'Mở bảng'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KHUNG BIỂU ĐỒ (VIỀN PHẲNG border: 1px solid #e2e8f0, borderRadius: 0) */}
      <div
        style={{
          width: '100%',
          height: viewTab === 'timeline' ? 320 : Math.max(260, summaryChartData.length * 46 + 48),
          border: '1px solid #e2e8f0',
          borderRadius: 0,
          padding: '14px 16px 14px 6px',
          background: '#ffffff',
          boxSizing: 'border-box'
        }}
      >
        {viewTab === 'timeline' ? (
          hasTimelineData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={activeTimelineList}
                margin={{ top: 15, right: 35, left: 10, bottom: 25 }}
                barGap={3}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  tickLine={true}
                  interval={0}
                  fontSize={11}
                  tick={{ fill: '#0f172a', fontWeight: 600, dy: 4 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  tickLine={true}
                  fontSize={11}
                  tick={{ fill: '#334155' }}
                  label={{
                    value: metricMode === 'avg_delay' ? 'Độ trễ TB (giây)' : 'Số lượng phiếu',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    fill: '#334155',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                {(metricMode === 'timeline_composed' || metricMode === 'instant_rate') && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, metricMode === 'instant_rate' ? 100 : 'auto']}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    tick={{ fill: '#01411b' }}
                    tickFormatter={(v) => (metricMode === 'instant_rate' ? `${v}%` : `${v}s`)}
                    label={{
                      value: metricMode === 'instant_rate' ? 'Tỷ lệ tức thời (%)' : 'Độ trễ TB (s)',
                      angle: 90,
                      position: 'insideRight',
                      offset: 12,
                      fill: '#01411b',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  />
                )}
                <RechartsTooltip
                  content={
                    <ExecutiveChartTooltip
                      customFormatter={(val, name) => {
                        if (name.includes('Độ trễ') || name.includes('trễ')) return `${val}s`
                        if (name.includes('Tỷ lệ') || name.includes('%')) return `${val}%`
                        return `${val} phiếu`
                      }}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="rect"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
                />

                {metricMode === 'timeline_composed' ? (
                  <>
                    <Bar
                      yAxisId="left"
                      dataKey="under10"
                      name="Tức thời (≤ 10s)"
                      fill="#01411b"
                      barSize={12}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="from11to30"
                      name="Ổn định (11-30s)"
                      fill="#059669"
                      barSize={12}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="from31to60"
                      name="Bình thường (31-60s)"
                      fill="#d97706"
                      barSize={12}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="over60"
                      name="Trễ cao (> 60s)"
                      fill="#dc2626"
                      barSize={12}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgDelaySec"
                      name="Độ trễ TB (giây)"
                      stroke="#ea580c"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#ea580c' }}
                    >
                      <LabelList
                        dataKey="avgDelaySec"
                        position="top"
                        fill="#ea580c"
                        fontSize={10}
                        fontWeight={700}
                        formatter={(v) => (v > 0 ? `${v}s` : '')}
                      />
                    </Line>
                  </>
                ) : metricMode === 'avg_delay' ? (
                  <Bar
                    yAxisId="left"
                    dataKey="avgDelaySec"
                    name="Độ trễ trung bình (giây)"
                    fill="#ea580c"
                    barSize={24}
                  >
                    <LabelList
                      dataKey="avgDelaySec"
                      position="top"
                      fill="#ea580c"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => `${v}s`}
                    />
                  </Bar>
                ) : metricMode === 'instant_rate' ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="instantRate"
                    name="Tỷ lệ tức thời (%)"
                    stroke="#01411b"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#01411b' }}
                  >
                    <LabelList
                      dataKey="instantRate"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => `${v}%`}
                    />
                  </Line>
                ) : (
                  <Bar
                    yAxisId="left"
                    dataKey="totalTickets"
                    name="Tổng số phiếu"
                    fill="#01411b"
                    barSize={24}
                  >
                    <LabelList
                      dataKey="totalTickets"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v.toLocaleString('vi-VN')} phiếu` : '')}
                    />
                  </Bar>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              Chưa có dữ liệu độ trễ theo thời gian
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summaryChartData}
              layout="vertical"
              margin={{ top: 10, right: 80, left: 120, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={summaryMetricMode === 'rate' ? [0, 100] : [0, 'auto']}
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                tickFormatter={(v) =>
                  summaryMetricMode === 'rate' ? `${v}%` : v.toLocaleString('vi-VN')
                }
                fontSize={11}
                tick={{ fill: '#334155' }}
              />
              <YAxis
                type="category"
                dataKey="group"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11.5}
                tick={{ fill: '#0f172a', fontWeight: 700 }}
                width={115}
              />
              <RechartsTooltip
                content={
                  <ExecutiveChartTooltip
                    customFormatter={(val, name, item) => {
                      const row = item?.payload || {}
                      return summaryMetricMode === 'rate'
                        ? `${val}% (${(row.count || 0).toLocaleString('vi-VN')} phiếu)`
                        : `${Number(val || 0).toLocaleString('vi-VN')} phiếu (${row.rate || 0}%)`
                    }}
                  />
                }
              />
              <Bar
                dataKey={summaryMetricMode === 'rate' ? 'rateVal' : 'countVal'}
                name={summaryMetricMode === 'rate' ? 'Tỷ lệ chiếm (%)' : 'Số lượng phiếu'}
                barSize={18}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={summaryMetricMode === 'rate' ? 'rateVal' : 'countVal'}
                  position="right"
                  formatter={(v, entry) => {
                    const item = entry || {}
                    const rate = item.rate !== undefined ? item.rate : item.rateVal || 0
                    const count = item.count !== undefined ? item.count : item.countVal || 0
                    return summaryMetricMode === 'rate'
                      ? `${v}% (${Number(count).toLocaleString('vi-VN')})`
                      : `${Number(v).toLocaleString('vi-VN')} (${rate}%)`
                  }}
                  style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
                />
                {summaryChartData.map((entry, index) => (
                  <Cell key={`cell-sync-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3.1. BẢNG DIỄN BIẾN THEO THỜI GIAN (OPENAI TECHNICAL TABLE) */}
      {viewTab === 'timeline' && showSyncTable && hasTimelineData && (
        <div
          style={{
            width: '100%',
            marginTop: 16,
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
                    color: '#0f172a',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tổng phiếu
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#01411b',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tức thời (≤ 10s)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#059669',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Ổn định (11–30s)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#d97706',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Chấp nhận (31–60s)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#dc2626',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Trễ cao (&gt; 60s)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#ea580c',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Độ trễ TB (giây)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#01411b',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tỷ lệ tức thời (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {activeTimelineList.map((row, idx) => (
                <tr
                  key={row.dateKey || idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.name}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(row.totalTickets || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#01411b'
                    }}
                  >
                    {(row.under10 || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: '#059669'
                    }}
                  >
                    {(row.from11to30 || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: '#d97706'
                    }}
                  >
                    {(row.from31to60 || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: (row.over60 || 0) > 0 ? '#dc2626' : '#64748b',
                      fontWeight: (row.over60 || 0) > 0 ? 700 : 400
                    }}
                  >
                    {(row.over60 || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#ea580c'
                    }}
                  >
                    {row.avgDelaySec || 0}s
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#01411b'
                    }}
                  >
                    {row.instantRate || 100}%
                  </td>
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
                <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                  TỔNG CỘNG ({activeTimelineList.length} KỲ)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#0f172a',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.totalTickets || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.under10 || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#059669',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.from11to30 || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#d97706',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.from31to60 || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: timelineTableTotals.over60 > 0 ? '#dc2626' : '#0f172a',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.over60 || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#ea580c',
                    fontWeight: 800
                  }}
                >
                  {timelineTableTotals.avgDelaySec || 0}s
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b',
                    fontWeight: 800
                  }}
                >
                  {timelineTableTotals.instantRate || 100}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 3.2. BẢNG PHÂN BỔ ĐỘ TRỄ ĐỒNG BỘ (SUMMARY OPENAI TECHNICAL TABLE) */}
      {viewTab === 'summary' && showSyncTable && (
        <div
          style={{
            width: '100%',
            marginTop: 16,
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
                  Khoảng độ trễ đồng bộ
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
                  Đánh giá mức độ
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
                  Số lượng phiếu
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
                  Tỷ lệ (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {summaryChartData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: row.fill,
                          borderRadius: 2,
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      <span>{row.group}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11.5 }}>
                    {row.group.includes('< 10s') || row.group.includes('≤ 10') ? (
                      <span style={{ color: '#01411b', fontWeight: 700 }}>Rất tốt (Tức thời)</span>
                    ) : row.group.includes('11 - 30s') || row.group.includes('11 – 30') ? (
                      <span style={{ color: '#059669', fontWeight: 700 }}>Tốt (Ổn định)</span>
                    ) : row.group.includes('31 - 60s') || row.group.includes('31 – 60') ? (
                      <span style={{ color: '#d97706', fontWeight: 700 }}>Chấp nhận được</span>
                    ) : row.group.includes('> 60s') ? (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>Chậm / Cần theo dõi</span>
                    ) : (
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Chưa đồng bộ</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.countVal.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.rateVal}%
                  </td>
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
                <td style={{ padding: '10px 12px', color: '#0f172a' }}>TỔNG CỘNG TOÀN BỘ PHIẾU</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>
                  {summaryChartData.length} KHOẢNG ĐỘ TRỄ
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#0f172a',
                    fontWeight: 800
                  }}
                >
                  {totalTickets.toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b',
                    fontWeight: 800
                  }}
                >
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
