/* eslint-disable react/prop-types */
import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  LabelList
} from 'recharts'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

export function PlanTimeAndCapaSection({
  timeStatusBreakdown = [],
  capaStatusBreakdown = []
}) {
  const [timeChartMode, setTimeChartMode] = useState('count')
  const [capaChartMode, setCapaChartMode] = useState('count')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: 28,
        marginBottom: 44
      }}
    >
      {/* SECTION 3: TRẠNG THÁI THỜI GIAN (SO VỚI ĐM) */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          padding: '8px 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 14
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              3. TRẠNG THÁI THỜI GIAN (SO VỚI ĐỊNH MỨC)
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
              So sánh thời điểm sản xuất thực tế với định mức (ĐM) kế hoạch
            </div>
          </div>

          <div className="screenshot-hide">
            <Tabs value={timeChartMode} onValueChange={setTimeChartMode}>
              <TabsList>
                <TabsTrigger value="count">Số lượng (Lệnh)</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ cơ cấu (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div
          style={{
            height: 240,
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '14px 16px 14px 6px',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={timeStatusBreakdown}
              margin={{ top: 10, right: 65, left: 24, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                stroke="#64748b"
                domain={timeChartMode === 'rate' ? [0, 100] : undefined}
                unit={timeChartMode === 'rate' ? '%' : undefined}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                tickFormatter={timeChartMode === 'rate' ? (val) => `${val}%` : undefined}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                tick={{ fontSize: 11.5, fontWeight: 700, fill: '#334155' }}
                width={110}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <RechartsTooltip content={<ExecutiveChartTooltip />} />
              <Bar
                dataKey={timeChartMode === 'rate' ? 'rate' : 'count'}
                name={timeChartMode === 'rate' ? 'Tỷ lệ' : 'Số lệnh'}
                barSize={22}
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey={timeChartMode === 'rate' ? 'rate' : 'count'}
                  position="right"
                  fill="#0f172a"
                  fontSize={11.5}
                  fontWeight={700}
                  offset={8}
                  formatter={(val) => (timeChartMode === 'rate' ? `${val}%` : `${val} lệnh`)}
                />
                {timeStatusBreakdown.map((entry, index) => (
                  <Cell key={`cell-t-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 4: TRẠNG THÁI CAPA (ĐÁNH GIÁ THEO NĂNG LỰC) */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          padding: '8px 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 14
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              4. TRẠNG THÁI CAPA (NĂNG LỰC SẢN XUẤT)
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
              Đánh giá việc bố trí sản xuất so với năng lực/capacity của hệ thống
            </div>
          </div>

          <div className="screenshot-hide">
            <Tabs value={capaChartMode} onValueChange={setCapaChartMode}>
              <TabsList>
                <TabsTrigger value="count">Số lượng (Lệnh)</TabsTrigger>
                <TabsTrigger value="rate">Tỷ lệ cơ cấu (%)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div
          style={{
            height: 240,
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '14px 16px 14px 6px',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={capaStatusBreakdown}
              margin={{ top: 10, right: 65, left: 24, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                stroke="#64748b"
                domain={capaChartMode === 'rate' ? [0, 100] : undefined}
                unit={capaChartMode === 'rate' ? '%' : undefined}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                tickFormatter={capaChartMode === 'rate' ? (val) => `${val}%` : undefined}
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
                dataKey={capaChartMode === 'rate' ? 'rate' : 'count'}
                name={capaChartMode === 'rate' ? 'Tỷ lệ' : 'Số lệnh'}
                barSize={22}
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey={capaChartMode === 'rate' ? 'rate' : 'count'}
                  position="right"
                  fill="#0f172a"
                  fontSize={11.5}
                  fontWeight={700}
                  offset={8}
                  formatter={(val) => (capaChartMode === 'rate' ? `${val}%` : `${val} lệnh`)}
                />
                {capaStatusBreakdown.map((entry, index) => (
                  <Cell key={`cell-c-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default PlanTimeAndCapaSection
