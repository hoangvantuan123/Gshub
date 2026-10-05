/* eslint-disable react/prop-types, no-unused-vars */
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
  Cell,
  LabelList
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

// Single Status Card Component for Section 4 (Time) or Section 5 (Capa)
function SingleTimelineAnalysisCard({
  sectionNumber = 4,
  title = '',
  description = '',
  summaryBreakdown = [],
  timelineData = { dailyList: [], monthlyList: [], quarterlyList: [], categories: [] },
  defaultCategories = []
}) {
  const [viewTab, setViewTab] = useState('timeline') // 'timeline' | 'summary'
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [chartMode, setChartMode] = useState('count') // 'count' | 'rate'
  const [showTable, setShowTable] = useState(false)

  // Categories config
  const categories =
    timelineData?.categories?.length > 0 ? timelineData.categories : defaultCategories

  // Legend visibility state
  const [visibleCategories, setVisibleCategories] = useState(() => {
    const init = {}
    categories.forEach((c) => {
      init[c.key] = true
    })
    return init
  })

  const toggleCategory = (key) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Active list based on periodType
  const activeTimelineList = useMemo(() => {
    if (periodType === 'weekly' && timelineData?.weeklyList?.length > 0) {
      return timelineData.weeklyList
    }
    if (periodType === 'monthly' && timelineData?.monthlyList?.length > 0) {
      return timelineData.monthlyList
    }
    if (periodType === 'quarterly' && timelineData?.quarterlyList?.length > 0) {
      return timelineData.quarterlyList
    }
    return timelineData?.dailyList || []
  }, [timelineData, periodType])

  // Formatted chart data
  const chartData = useMemo(() => {
    return activeTimelineList.map((item, idx) => {
      const dateKey = item.date || item.periodKey || `item_${idx}`
      const name = item.name || item.shortDate || dateKey
      const total = item.totalOrders || 0
      const row = {
        ...item,
        dateKey,
        name,
        totalOrders: total
      }
      categories.forEach((cat) => {
        const cnt = item[cat.key] || 0
        const rate =
          item[`${cat.key}Rate`] || (total > 0 ? Number(((cnt / total) * 100).toFixed(1)) : 0)
        row[cat.key] = cnt
        row[`${cat.key}Rate`] = rate
      })
      return row
    })
  }, [activeTimelineList, categories])

  // Summary grand totals for table footer
  const tableGrandTotal = useMemo(() => {
    const totalOrders = activeTimelineList.reduce((acc, r) => acc + (r.totalOrders || 0), 0)
    const catTotals = {}
    categories.forEach((cat) => {
      const count = activeTimelineList.reduce((acc, r) => acc + (r[cat.key] || 0), 0)
      const rate = totalOrders > 0 ? Number(((count / totalOrders) * 100).toFixed(1)) : 0
      catTotals[cat.key] = { count, rate }
    })
    return { totalOrders, catTotals }
  }, [activeTimelineList, categories])

  const hasTimelineData = activeTimelineList && activeTimelineList.length > 0

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        padding: '8px 0',
        marginBottom: 36
      }}
    >
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
              {sectionNumber}. {title}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
            {description}
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
        >
          {/* Toggle View: Diễn biến vs Cơ cấu */}
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
                {timelineData?.weeklyList?.length > 0 && (
                  <TabsTrigger value="weekly">Tuần</TabsTrigger>
                )}
                {timelineData?.monthlyList?.length > 0 && (
                  <TabsTrigger value="monthly">Tháng</TabsTrigger>
                )}
                {timelineData?.quarterlyList?.length > 0 && (
                  <TabsTrigger value="quarterly">Quý</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}

          {/* Mode switch: Count vs Rate */}
          <Tabs value={chartMode} onValueChange={setChartMode}>
            <TabsList>
              <TabsTrigger value="count">Số lượng (Lệnh)</TabsTrigger>
              <TabsTrigger value="rate">Tỷ lệ cơ cấu (%)</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Toggle table button */}
          {viewTab === 'timeline' && (
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
              <TableProperties
                size={13}
                className={showTable ? 'text-blue-600' : 'text-slate-500'}
              />
              <span>{showTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
            </Button>
          )}
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
        {/* Interactive Legend filter bar inside the frame */}
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
            <span style={{ fontWeight: 700, color: '#475569' }}>Lọc trạng thái:</span>
            {categories.map((cat) => {
              const isVisible = visibleCategories[cat.key] !== false
              return (
                <div
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
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
                  title={`Bấm để ${isVisible ? 'ẩn' : 'hiện'} cột "${cat.name}"`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: isVisible ? cat.color : '#cbd5e1',
                      borderRadius: 2,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span>{cat.name}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Main Chart Area */}
        <div
          style={{
            height: 280,
            width: '100%'
          }}
        >
          {viewTab === 'timeline' ? (
            hasTimelineData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 18, right: 30, left: 10, bottom: 6 }}
                  barGap={3}
                  barCategoryGap="20%"
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
                    domain={chartMode === 'rate' ? [0, 100] : [0, 'auto']}
                    unit={chartMode === 'rate' ? '%' : undefined}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={
                      chartMode === 'rate'
                        ? (val) => `${val}%`
                        : (val) => `${val.toLocaleString('vi-VN')}`
                    }
                  />
                  <RechartsTooltip
                    content={
                      <ExecutiveChartTooltip
                        customFormatter={(val, name) =>
                          chartMode === 'rate' ? `${val}%` : `${val.toLocaleString('vi-VN')} lệnh`
                        }
                      />
                    }
                  />

                  {/* Bars for each active category */}
                  {categories.map((cat) => {
                    if (visibleCategories[cat.key] === false) return null
                    const dataKey = chartMode === 'rate' ? `${cat.key}Rate` : cat.key
                    return (
                      <Bar
                        key={cat.key}
                        dataKey={dataKey}
                        name={cat.name}
                        fill={cat.color}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={38}
                      >
                        <LabelList
                          dataKey={dataKey}
                          position="top"
                          fill="#334155"
                          fontSize={10.5}
                          fontWeight={700}
                          offset={4}
                          formatter={(val) =>
                            val > 0 ? (chartMode === 'rate' ? `${val}%` : `${val}`) : ''
                          }
                        />
                      </Bar>
                    )
                  })}

                  {/* Connected Trend Line for Total Orders */}
                  {chartMode === 'count' && (
                    <Line
                      type="monotone"
                      dataKey="totalOrders"
                      name="Tổng lệnh SX"
                      stroke="#0284c7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#0284c7', strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
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
                Chưa có dữ liệu chuỗi thời gian
              </div>
            )
          ) : (
            /* View mode: Summary Horizontal Bar Chart */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={summaryBreakdown}
                margin={{ top: 10, right: 65, left: 24, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  domain={chartMode === 'rate' ? [0, 100] : undefined}
                  unit={chartMode === 'rate' ? '%' : undefined}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={chartMode === 'rate' ? (val) => `${val}%` : undefined}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11.5, fontWeight: 700, fill: '#334155' }}
                  width={120}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar
                  dataKey={chartMode === 'rate' ? 'rate' : 'count'}
                  name={chartMode === 'rate' ? 'Tỷ lệ' : 'Số lệnh'}
                  barSize={24}
                >
                  <LabelList
                    dataKey={chartMode === 'rate' ? 'rate' : 'count'}
                    position="right"
                    fill="#0f172a"
                    fontSize={11.5}
                    fontWeight={700}
                    offset={8}
                    formatter={(val) => (chartMode === 'rate' ? `${val}%` : `${val} lệnh`)}
                  />
                  {summaryBreakdown.map((entry, index) => (
                    <Cell key={`cell-sum-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bảng tổng hợp số liệu chuẩn hệ thống (Đặt ngoài khung biểu đồ, chuẩn OpenAI / Financial Table) */}
      {viewTab === 'timeline' && showTable && hasTimelineData && (
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
                    minWidth: 120,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  {periodType === 'monthly'
                    ? 'Tháng'
                    : periodType === 'quarterly'
                      ? 'Quý'
                      : periodType === 'weekly'
                        ? 'Tuần'
                        : 'Ngày'}
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
                {categories.map((cat) => (
                  <th
                    key={cat.key}
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: cat.color,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {cat.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr
                  key={row.dateKey || idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.name}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#01411b'
                    }}
                  >
                    {(row.totalOrders || 0).toLocaleString('vi-VN')}
                  </td>
                  {categories.map((cat) => {
                    const cnt = row[cat.key] || 0
                    const rate = row[`${cat.key}Rate`] || 0
                    return (
                      <td
                        key={cat.key}
                        style={{ padding: '9px 12px', textAlign: 'right', color: cat.color }}
                      >
                        <span style={{ fontWeight: 600 }}>{cnt.toLocaleString('vi-VN')}</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                          ({rate}%)
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
                  background: '#f8fafc',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                <td colSpan={2} style={{ padding: '10px 12px', textTransform: 'uppercase' }}>
                  TỔNG CỘNG ({chartData.length}{' '}
                  {periodType === 'monthly'
                    ? 'THÁNG'
                    : periodType === 'quarterly'
                      ? 'QUÝ'
                      : periodType === 'weekly'
                        ? 'TUẦN'
                        : 'NGÀY'}
                  )
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                  {tableGrandTotal.totalOrders.toLocaleString('vi-VN')}
                </td>
                {categories.map((cat) => {
                  const stat = tableGrandTotal.catTotals[cat.key] || { count: 0, rate: 0 }
                  return (
                    <td
                      key={cat.key}
                      style={{ padding: '10px 12px', textAlign: 'right', color: cat.color }}
                    >
                      <span>{stat.count.toLocaleString('vi-VN')}</span>
                      <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>
                        ({stat.rate}%)
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export function PlanTimeAndCapaSection({
  timeStatusBreakdown = [],
  capaStatusBreakdown = [],
  timeTimelineBreakdown = { dailyList: [], monthlyList: [], quarterlyList: [], categories: [] },
  capaTimelineBreakdown = { dailyList: [], monthlyList: [], quarterlyList: [], categories: [] },
  plantName = 'Nhà máy GS Hà Nội',
  totalDays = 1,
  dateRange = []
}) {
  const defaultTimeCategories = useMemo(
    () => [
      { key: 'timeCham', name: 'Chậm hơn ĐM', color: '#dc2626' },
      { key: 'timeNhanh', name: 'Nhanh hơn ĐM', color: '#0284c7' },
      { key: 'timeDung', name: 'Đúng ĐM', color: '#01411b' },
      { key: 'timeNoData', name: 'Chưa có dữ liệu', color: '#64748b' }
    ],
    []
  )

  const defaultCapaCategories = useMemo(
    () => [
      { key: 'capaNhanh', name: 'Nhanh hơn ĐM', color: '#01411b' },
      { key: 'capaCham', name: 'Chậm hơn ĐM', color: '#dc2626' },
      { key: 'capaDung', name: 'Trống / Đúng capa', color: '#64748b' }
    ],
    []
  )

  return (
    <div style={{ marginBottom: 44, width: '100%' }}>
      {/* SECTION 3: TRẠNG THÁI THỜI GIAN (SO VỚI ĐỊNH MỨC) */}
      <SingleTimelineAnalysisCard
        sectionNumber={3}
        title="TRẠNG THÁI THỜI GIAN (SO VỚI ĐỊNH MỨC)"
        description={`So sánh thời điểm sản xuất thực tế với định mức (ĐM) kế hoạch trải dài qua ${totalDays} ngày tại ${plantName}`}
        summaryBreakdown={timeStatusBreakdown}
        timelineData={timeTimelineBreakdown}
        defaultCategories={defaultTimeCategories}
      />

      {/* SECTION 4: TRẠNG THÁI CAPA (NĂNG LỰC SẢN XUẤT) */}
      <SingleTimelineAnalysisCard
        sectionNumber={4}
        title="TRẠNG THÁI CAPA (NĂNG LỰC SẢN XUẤT)"
        description={`Đánh giá việc bố trí sản xuất so với năng lực/capacity của hệ thống trải dài qua ${totalDays} ngày tại ${plantName}`}
        summaryBreakdown={capaStatusBreakdown}
        timelineData={capaTimelineBreakdown}
        defaultCategories={defaultCapaCategories}
      />
    </div>
  )
}

export default PlanTimeAndCapaSection
