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
import { TableProperties, Search, Copy, Check } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'
import {
  getAutoExportType,
  isPassAutoIo,
  isMissingAutoIo,
  isNoMaterialAutoIo
} from '../../hanoiGs1/stat/hooks/useProductionStatisticsLogic'

export function AutoExportSection({
  kpiMetrics = {},
  filteredData = [],
  dailyAggregates = [],
  backendReportData = {},
  missingAutoExportTickets = [],
  showAutoExportTable,
  setShowAutoExportTable,
  plantName = 'Nhà máy',
  sectionNumber = '4.2'
}) {
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' | 'summary' | 'missing_list'
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [metricMode, setMetricMode] = useState('timeline_composed') // 'timeline_composed' | 'rate' | 'count' | 'missing'
  const [summaryMetricMode, setSummaryMetricMode] = useState('count') // 'count' | 'rate'
  const [missingSearchText, setMissingSearchText] = useState('')
  const [copiedNotification, setCopiedNotification] = useState(false)

  const totalTickets = kpiMetrics.totalTickets || 0
  const autoExportCount = Number(kpiMetrics.autoExportCount || 0)
  const noAutoExportCount = Number(kpiMetrics.noAutoExportCount || 0)
  const noMaterialCount = Number(kpiMetrics.noMaterialAutoIoCount || 0)
  const totalApplicable =
    kpiMetrics.totalApplicableAutoIo || autoExportCount + noAutoExportCount || totalTickets

  // 1. Dữ liệu Cơ cấu tổng hợp (Summary View)
  const summaryChartData = useMemo(() => {
    let list =
      kpiMetrics.autoExportBreakdown && kpiMetrics.autoExportBreakdown.length > 0
        ? kpiMetrics.autoExportBreakdown
        : backendReportData?.autoExportBreakdown && backendReportData.autoExportBreakdown.length > 0
          ? backendReportData.autoExportBreakdown
          : backendReportData?.data?.autoExportBreakdown &&
              backendReportData.data.autoExportBreakdown.length > 0
            ? backendReportData.data.autoExportBreakdown
            : []

    if (list.length === 0 && filteredData && filteredData.length > 0) {
      const typeMap = new Map()
      const total = filteredData.length

      filteredData.forEach((item) => {
        const typeKey = getAutoExportType(item)
        typeMap.set(typeKey, (typeMap.get(typeKey) || 0) + 1)
      })

      list = Array.from(typeMap.entries())
        .map(([label, count]) => {
          const isMissing = isMissingAutoIo(label)
          const isNoMat = isNoMaterialAutoIo(label)
          const isPass = isPassAutoIo(label)
          let color = '#01411b'
          if (isMissing) color = '#dc2626'
          else if (isNoMat) color = '#94a3b8'
          return {
            label,
            count,
            rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
            isMissing,
            isNoMaterial: isNoMat,
            isPass,
            color
          }
        })
        .sort((a, b) => {
          if (a.isMissing && !b.isMissing) return 1
          if (!a.isMissing && b.isMissing) return -1
          return b.count - a.count
        })
    }

    return list.map((item) => {
      const lName = item.label || item.Label || item.group || item.Group || ''
      const countVal = Number(item.count ?? item.Count ?? 0)
      const rateVal = Number(item.rate ?? item.Rate ?? 0)
      const fill = item.color || item.Color || '#01411b'
      return {
        ...item,
        label: lName,
        name: lName,
        fullName: lName,
        countVal,
        rateVal,
        fill
      }
    })
  }, [kpiMetrics.autoExportBreakdown, backendReportData, filteredData])

  // 2. Dữ liệu Diễn biến theo thời gian (Timeline View)
  const timelineData = useMemo(() => {
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

        const typeKey = getAutoExportType(item)
        const isPass = isPassAutoIo(typeKey)
        const isMissing = isMissingAutoIo(typeKey)
        const isNoMat = isNoMaterialAutoIo(typeKey)

        const updateAgg = (map, key) => {
          if (!map.has(key)) {
            map.set(key, {
              key,
              totalTickets: 0,
              autoExportPass: 0,
              autoExportMissing: 0,
              noMaterial: 0
            })
          }
          const agg = map.get(key)
          agg.totalTickets++
          if (isPass) agg.autoExportPass++
          else if (isMissing) agg.autoExportMissing++
          else if (isNoMat) agg.noMaterial++
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
            const applicable = agg.autoExportPass + agg.autoExportMissing
            const autoExportRate =
              applicable > 0 ? Number(((agg.autoExportPass / applicable) * 100).toFixed(1)) : 100
            const missingRate =
              applicable > 0 ? Number(((agg.autoExportMissing / applicable) * 100).toFixed(1)) : 0

            return {
              dateKey: agg.key,
              name: shortDate,
              fullName: agg.key,
              totalTickets: agg.totalTickets,
              autoExportPass: agg.autoExportPass,
              autoExportMissing: agg.autoExportMissing,
              noMaterial: agg.noMaterial,
              autoExportRate,
              missingRate
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
      const pass = Number(d.autoExportedCount ?? d.autoExportPass ?? 0)
      const missing = Number(d.notAutoExportedCount ?? d.autoExportMissing ?? 0)
      const noMat = Math.max(0, tk - pass - missing)
      const applicable = pass + missing
      const autoRate =
        applicable > 0
          ? Number(((pass / applicable) * 100).toFixed(1))
          : Number(d.autoExportRate || 100)
      const missingRate = applicable > 0 ? Number(((missing / applicable) * 100).toFixed(1)) : 0

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
            autoExportPass: 0,
            autoExportMissing: 0,
            noMaterial: 0
          })
        }
        const agg = map.get(key)
        agg.totalTickets += tk
        agg.autoExportPass += pass
        agg.autoExportMissing += missing
        agg.noMaterial += noMat
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
        autoExportPass: pass,
        autoExportMissing: missing,
        noMaterial: noMat,
        autoExportRate: autoRate,
        missingRate
      }
    })

    const formatPeriodList = (map) => {
      return Array.from(map.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((agg) => {
          const shortDate =
            agg.key.length === 7 ? `T${agg.key.slice(5, 7)}/${agg.key.slice(0, 4)}` : agg.key
          const applicable = agg.autoExportPass + agg.autoExportMissing
          const autoExportRate =
            applicable > 0 ? Number(((agg.autoExportPass / applicable) * 100).toFixed(1)) : 100
          const missingRate =
            applicable > 0 ? Number(((agg.autoExportMissing / applicable) * 100).toFixed(1)) : 0
          return {
            dateKey: agg.key,
            name: shortDate,
            fullName: agg.key,
            totalTickets: agg.totalTickets,
            autoExportPass: agg.autoExportPass,
            autoExportMissing: agg.autoExportMissing,
            noMaterial: agg.noMaterial,
            autoExportRate,
            missingRate
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
      totalPass = 0,
      totalMissing = 0,
      totalNoMat = 0

    activeTimelineList.forEach((row) => {
      totalTk += row.totalTickets || 0
      totalPass += row.autoExportPass || 0
      totalMissing += row.autoExportMissing || 0
      totalNoMat += row.noMaterial || 0
    })

    const applicable = totalPass + totalMissing
    const autoExportRate =
      applicable > 0 ? Number(((totalPass / applicable) * 100).toFixed(1)) : 100
    const missingRate = applicable > 0 ? Number(((totalMissing / applicable) * 100).toFixed(1)) : 0

    return {
      totalTickets: totalTk,
      autoExportPass: totalPass,
      autoExportMissing: totalMissing,
      noMaterial: totalNoMat,
      autoExportRate,
      missingRate
    }
  }, [activeTimelineList])

  const filteredMissingTickets = useMemo(() => {
    if (!missingSearchText.trim()) return missingAutoExportTickets
    const q = missingSearchText.toLowerCase().trim()
    return missingAutoExportTickets.filter((t) => {
      return (
        String(t.ticketNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.docNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.orderNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.itemCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.itemName || '')
          .toLowerCase()
          .includes(q) ||
        String(t.team || '')
          .toLowerCase()
          .includes(q) ||
        String(t.machineCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.regCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.autoExportType || '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [missingAutoExportTickets, missingSearchText])

  const handleCopyMissingList = () => {
    if (filteredMissingTickets.length === 0) return
    const headers = ['STT', 'Ngày SX', 'Số phiếu / WO', 'Trạng thái chứng từ', 'Nguồn dữ liệu']
    const rows = filteredMissingTickets.map((t, idx) => [
      idx + 1,
      t.prodDate || t.date || t.StatDate || '',
      t.ticketNo || t.docNo || '',
      t.autoExportType || 'Chưa sinh chứng từ',
      `${t.source || 'MES'}${t.pic ? ' - ' + t.pic : ''}`
    ])
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedNotification(true)
      setTimeout(() => setCopiedNotification(false), 2000)
    })
  }

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
            <span>{sectionNumber}. THỐNG KÊ PHÂN BỔ LOẠI CHỨNG TỪ XUẤT/NHẬP TỰ ĐỘNG</span>
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
            Liên kết tự động xuất/nhập kho trên <b>{totalTickets.toLocaleString('vi-VN')} phiếu</b>{' '}
            ({plantName || 'Nhà máy'}). Tỷ lệ tự động:{' '}
            <b style={{ color: '#01411b' }}>{kpiMetrics.autoExportRate || 0}%</b> (
            {autoExportCount.toLocaleString('vi-VN')} / {totalApplicable.toLocaleString('vi-VN')}{' '}
            phiếu) • Chưa sinh/thiếu:{' '}
            <b style={{ color: '#dc2626' }}>
              {noAutoExportCount.toLocaleString('vi-VN')} phiếu ({kpiMetrics.noAutoExportRate || 0}
              %)
            </b>
            {noMaterialCount > 0 && (
              <span>
                {' '}
                • Không NVL: <b>{noMaterialCount.toLocaleString('vi-VN')}</b>
              </span>
            )}
            .
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}
        >
          {/* Tabs chuyển đổi giữa Diễn biến thời gian / Phân bổ loại / DS phiếu thiếu */}
          <Tabs
            value={viewTab}
            onValueChange={(val) => {
              setViewTab(val)
              if (val === 'missing_list' && !showAutoExportTable) {
                setShowAutoExportTable(true)
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="timeline">Diễn biến theo thời gian</TabsTrigger>
              <TabsTrigger value="summary">Cơ cấu tổng hợp</TabsTrigger>
              <TabsTrigger value="missing_list">
                Phiếu chưa có XNTĐ ({missingAutoExportTickets.length})
              </TabsTrigger>
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
                <TabsTrigger value="timeline_composed">Phiếu &amp; Tỷ lệ (%)</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ tự động (%)</TabsTrigger>
                <TabsTrigger value="count">Phiếu có XKTĐ</TabsTrigger>
                <TabsTrigger value="missing">Phiếu chưa sinh</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : viewTab === 'summary' ? (
            <Tabs value={summaryMetricMode} onValueChange={setSummaryMetricMode}>
              <TabsList>
                <TabsTrigger value="count">Số phiếu</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (setShowAutoExportTable) {
                setShowAutoExportTable(!showAutoExportTable)
              }
            }}
            className={`uppercase text-[11px] font-semibold ${
              showAutoExportTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng chi tiết chứng từ"
          >
            <TableProperties
              size={13}
              className={showAutoExportTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showAutoExportTable ? 'Đóng bảng' : 'Mở bảng'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KHUNG BIỂU ĐỒ (VIỀN PHẲNG border: 1px solid #e2e8f0, borderRadius: 0) */}
      <div
        style={{
          width: '100%',
          height:
            viewTab === 'timeline'
              ? 320
              : viewTab === 'summary'
                ? Math.max(260, summaryChartData.length * 46 + 48)
                : 120,
          border: '1px solid #e2e8f0',
          borderRadius: 0,
          padding: viewTab === 'missing_list' ? '12px' : '14px 16px 14px 6px',
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
                    value: metricMode === 'rate' ? 'Tỷ lệ tự động (%)' : 'Số lượng phiếu',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    fill: '#334155',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                {(metricMode === 'timeline_composed' || metricMode === 'rate') && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    tickLine={true}
                    fontSize={11}
                    tick={{ fill: '#01411b' }}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: 'Tỷ lệ tự động (%)',
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
                      dataKey="autoExportPass"
                      name="Có XKTĐ / NKTĐ"
                      fill="#01411b"
                      barSize={14}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="autoExportMissing"
                      name="Chưa sinh XNTĐ"
                      fill="#dc2626"
                      barSize={14}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="noMaterial"
                      name="Không NVL / Khác"
                      fill="#94a3b8"
                      barSize={14}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="autoExportRate"
                      name="Tỷ lệ tự động (%)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#0284c7' }}
                    >
                      <LabelList
                        dataKey="autoExportRate"
                        position="top"
                        fill="#0284c7"
                        fontSize={10}
                        fontWeight={700}
                        formatter={(v) => (v > 0 ? `${v}%` : '')}
                      />
                    </Line>
                  </>
                ) : metricMode === 'rate' ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="autoExportRate"
                    name="Tỷ lệ tự động (%)"
                    stroke="#01411b"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#01411b' }}
                  >
                    <LabelList
                      dataKey="autoExportRate"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => `${v}%`}
                    />
                  </Line>
                ) : metricMode === 'missing' ? (
                  <Bar
                    yAxisId="left"
                    dataKey="autoExportMissing"
                    name="Phiếu chưa sinh XNTĐ"
                    fill="#dc2626"
                    barSize={24}
                  >
                    <LabelList
                      dataKey="autoExportMissing"
                      position="top"
                      fill="#dc2626"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v} phiếu` : '')}
                    />
                  </Bar>
                ) : (
                  <Bar
                    yAxisId="left"
                    dataKey="autoExportPass"
                    name="Phiếu có XKTĐ / NKTĐ"
                    fill="#01411b"
                    barSize={24}
                  >
                    <LabelList
                      dataKey="autoExportPass"
                      position="top"
                      fill="#01411b"
                      fontSize={10}
                      fontWeight={700}
                      formatter={(v) => (v > 0 ? `${v} phiếu` : '')}
                    />
                  </Bar>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              Chưa có dữ liệu phân bổ chứng từ theo thời gian
            </div>
          )
        ) : viewTab === 'summary' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summaryChartData}
              layout="vertical"
              margin={{ top: 10, right: 80, left: 140, bottom: 10 }}
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
                dataKey="label"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11.5}
                tick={{ fill: '#0f172a', fontWeight: 700 }}
                width={135}
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
                  <Cell key={`cell-auto-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          /* Missing Tickets Quick Header Box In Frame */
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              padding: 12,
              color: '#334155',
              fontSize: 13
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
              Có {missingAutoExportTickets.length.toLocaleString('vi-VN')} phiếu chưa được sinh
              chứng từ xuất/nhập tự động
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Bảng tra cứu chi tiết bên dưới đang mở để tìm kiếm và sao chép danh sách phiếu
            </div>
          </div>
        )}
      </div>

      {/* 3.1. BẢNG DIỄN BIẾN THEO THỜI GIAN (OPENAI TECHNICAL TABLE) */}
      {viewTab === 'timeline' && showAutoExportTable && hasTimelineData && (
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
                  Có XKTĐ / NKTĐ
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
                  Chưa sinh XNTĐ
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#64748b',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Không NVL / Khác
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0284c7',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tỷ lệ tự động (%)
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
                    {(row.autoExportPass || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: (row.autoExportMissing || 0) > 0 ? '#dc2626' : '#64748b',
                      fontWeight: (row.autoExportMissing || 0) > 0 ? 700 : 400
                    }}
                  >
                    {(row.autoExportMissing || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: '#64748b'
                    }}
                  >
                    {(row.noMaterial || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color:
                        (row.autoExportRate || 0) >= 95
                          ? '#01411b'
                          : (row.autoExportRate || 0) >= 80
                            ? '#d97706'
                            : '#dc2626'
                    }}
                  >
                    {row.autoExportRate || 100}%
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
                  {(timelineTableTotals.autoExportPass || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: timelineTableTotals.autoExportMissing > 0 ? '#dc2626' : '#0f172a',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.autoExportMissing || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#64748b',
                    fontWeight: 800
                  }}
                >
                  {(timelineTableTotals.noMaterial || 0).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b',
                    fontWeight: 800
                  }}
                >
                  {timelineTableTotals.autoExportRate || 100}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 3.2. BẢNG PHÂN BỔ LOẠI CHỨNG TỪ (SUMMARY OPENAI TECHNICAL TABLE) */}
      {viewTab === 'summary' && showAutoExportTable && (
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
                  Loại trạng thái chứng từ tự động
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
                  Đánh giá KPI
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
                  Tỷ lệ chiếm (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {summaryChartData.map((row, idx) => {
                const isMissing = row.isMissing
                const isNoMaterial = row.isNoMaterial
                return (
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
                            borderRadius: 2,
                            backgroundColor: row.fill,
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: isMissing ? '#dc2626' : isNoMaterial ? '#64748b' : '#059669'
                      }}
                    >
                      {isMissing
                        ? 'Chưa sinh / Thiếu phiếu'
                        : isNoMaterial
                          ? 'Không sử dụng NVL'
                          : 'Đã sinh / Hợp lệ'}
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
                <td style={{ padding: '10px 12px', color: '#0f172a' }}>TỔNG CỘNG TOÀN BỘ PHIẾU</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>
                  {summaryChartData.length} LOẠI TRẠNG THÁI
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

      {/* 3.3. BẢNG DANH SÁCH PHIẾU THIẾU XNTĐ (OPENAI TECHNICAL TABLE) */}
      {viewTab === 'missing_list' && showAutoExportTable && (
        <div style={{ width: '100%', marginTop: 16, marginBottom: 8 }}>
          {/* Search bar & Copy button for Missing Tickets */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 10,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ position: 'relative', width: 260 }}>
              <Search
                size={13}
                style={{ position: 'absolute', left: 8, top: 7, color: '#94a3b8' }}
              />
              <input
                type="text"
                value={missingSearchText}
                onChange={(e) => setMissingSearchText(e.target.value)}
                placeholder="Lọc số phiếu, mã hàng, tổ..."
                style={{
                  width: '100%',
                  height: 28,
                  padding: '0 8px 0 26px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  outline: 'none'
                }}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMissingList}
              className="text-slate-700 hover:text-slate-900 text-[11px] font-semibold"
            >
              {copiedNotification ? (
                <Check size={13} className="text-emerald-600 mr-1" />
              ) : (
                <Copy size={13} className="mr-1 text-slate-500" />
              )}
              <span>{copiedNotification ? 'Đã sao chép!' : 'Sao chép danh sách'}</span>
            </Button>
          </div>

          <div
            style={{
              width: '100%',
              overflowX: 'auto',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a'
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
                      width: 40,
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
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Ngày SX
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
                    Số phiếu / WO
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
                    Mã SP / Tên hàng
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
                    Tổ SX / Máy
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
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMissingTickets.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      {row.prodDate || row.date || row.StatDate || ''}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                      {row.ticketNo || row.docNo || row.orderNo || ''}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      <div>{row.itemCode || ''}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{row.itemName || ''}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      <div>{row.team || row.teamName || ''}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {row.machineCode || row.machineName || ''}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#dc2626', fontWeight: 600 }}>
                      {row.autoExportType || 'Chưa sinh chứng từ'}
                    </td>
                  </tr>
                ))}
                {filteredMissingTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                      Không có phiếu nào chưa sinh chứng từ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredMissingTickets.length > 100 && (
            <div
              style={{
                padding: '6px 10px',
                fontSize: 11.5,
                color: '#64748b',
                textAlign: 'right'
              }}
            >
              Đang hiển thị 100 / {filteredMissingTickets.length} phiếu thiếu
            </div>
          )}
        </div>
      )}
    </div>
  )
}
