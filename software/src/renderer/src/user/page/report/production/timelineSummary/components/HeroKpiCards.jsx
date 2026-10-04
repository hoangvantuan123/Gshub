/* eslint-disable react/prop-types */
export function HeroKpiCards({ kpiMetrics }) {
  const totalTickets = kpiMetrics.totalTickets || 0
  const mesCreatedCount = kpiMetrics.mesCreatedCount ?? kpiMetrics.mesCount ?? 0
  const bravoCreatedCount =
    kpiMetrics.bravoCreatedCount ?? Math.max(0, totalTickets - mesCreatedCount)
  const mesRate = kpiMetrics.mesRate ?? 100

  const runtimeOver12h = kpiMetrics.runtimeOver12hCheck ?? kpiMetrics.over12hCount ?? 0
  const over12hRate = totalTickets > 0 ? ((runtimeOver12h / totalTickets) * 100).toFixed(1) : '0.0'

  const runtimeUnder5Min = kpiMetrics.runtimeUnder5Min ?? kpiMetrics.under5MinCount ?? 0
  const under5MinRate =
    totalTickets > 0 ? ((runtimeUnder5Min / totalTickets) * 100).toFixed(1) : '0.0'

  const autoExportRate = kpiMetrics.autoExportRate ?? 0
  const autoExportCount = kpiMetrics.autoExportCount ?? 0
  const noAutoExportCount = kpiMetrics.noAutoExportCount ?? 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 28
      }}
    >
      {/* KPI 1: TỔNG PHIẾU THỐNG KÊ (TỶ LỆ MES) */}
      <div
        style={{
          padding: '16px 18px',
          background: '#ffffff',
          borderLeft: '1px solid #cbd5e1',
          borderRight: '1px solid #cbd5e1',
          borderBottom: '1px solid #cbd5e1',
          borderTop: '3.5px solid #01411b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Tổng phiếu thống kê (Tỷ lệ MES)
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {totalTickets.toLocaleString('vi-VN')}
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          MES:{' '}
          <span style={{ color: '#01411b', fontWeight: 700 }}>
            {mesCreatedCount.toLocaleString('vi-VN')} ({mesRate}%)
          </span>{' '}
          • Ngoài:{' '}
          <span style={{ color: '#0f172a' }}>{bravoCreatedCount.toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* KPI 2: THỜI GIAN CHẠY MÁY > 12H (CẦN KIỂM TRA) */}
      <div
        style={{
          padding: '16px 18px',
          background: runtimeOver12h > 0 ? '#fffdf7' : '#ffffff',
          borderLeft: runtimeOver12h > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
          borderRight: runtimeOver12h > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
          borderBottom: runtimeOver12h > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
          borderTop: '3.5px solid #d97706',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#d97706',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          &gt; 12h (Cần kiểm tra)
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: runtimeOver12h > 0 ? '#d97706' : '#0f172a',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {runtimeOver12h.toLocaleString('vi-VN')}
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#d97706', fontWeight: 700 }}>{over12hRate}%</span> •{' '}
          <span style={{ color: '#92400e' }}>Phiếu bất thường</span>
        </div>
      </div>

      {/* KPI 3: THỜI GIAN THAO TÁC < 5 PHÚT (THAO TÁC NHANH) */}
      <div
        style={{
          padding: '16px 18px',
          background: runtimeUnder5Min > 0 ? '#fff5f5' : '#ffffff',
          borderLeft: runtimeUnder5Min > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderRight: runtimeUnder5Min > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderBottom: runtimeUnder5Min > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderTop: '3.5px solid #be123c',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#be123c',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          &lt; 5 phút (Thao tác nhanh)
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: runtimeUnder5Min > 0 ? '#be123c' : '#0f172a',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {runtimeUnder5Min.toLocaleString('vi-VN')}
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#be123c', fontWeight: 700 }}>{under5MinRate}%</span> •{' '}
          <span style={{ color: '#881337' }}>Nhập vội</span>
        </div>
      </div>

      {/* KPI 4: SINH PHIẾU XUẤT/NHẬP TỰ ĐỘNG */}
      <div
        style={{
          padding: '16px 18px',
          background: '#ffffff',
          borderLeft: '1px solid #cbd5e1',
          borderRight: '1px solid #cbd5e1',
          borderBottom: '1px solid #cbd5e1',
          borderTop: '3.5px solid #01411b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#01411b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Sinh phiếu X/N tự động
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: '#01411b',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {autoExportRate}%
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Đã sinh:{' '}
          <span style={{ color: '#01411b', fontWeight: 700 }}>
            {autoExportCount.toLocaleString('vi-VN')}
          </span>{' '}
          • Chưa:{' '}
          <span
            style={{
              color: noAutoExportCount > 0 ? '#dc2626' : '#64748b',
              fontWeight: 700
            }}
          >
            {noAutoExportCount.toLocaleString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  )
}
