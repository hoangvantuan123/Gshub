/* eslint-disable react/prop-types */
export function PlanHeroKpiCards({ planMetrics = {} }) {
  const totalOrders = planMetrics.totalOrders || planMetrics.totalTickets || 0
  const sxSaiNgayCount = planMetrics.sxSaiNgayCount || 0
  const sxSaiNgayRate = planMetrics.sxSaiNgayRate || 0
  const truotKhCount = planMetrics.truotKhCount || 0
  const truotKhRate = planMetrics.truotKhRate || 0
  const khopSlCount = planMetrics.khopSlCount || 0
  const khopSlRate = planMetrics.khopSlRate || 0
  const khopJobCount = planMetrics.khopJobCount || 0
  const khopJobRate = planMetrics.khopJobRate || 0
  const totalItems = planMetrics.totalItems || 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 36
      }}
    >
      {/* KPI 1: LỆNH THAO TÁC */}
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
          minHeight: 110
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
          Lệnh thao tác (LSX)
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
          {totalOrders.toLocaleString('vi-VN')}{' '}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#01411b' }}>lệnh</span>
        </div>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
          Mặt hàng điều phối:{' '}
          <b style={{ color: '#01411b' }}>{totalItems.toLocaleString('vi-VN')} SP</b>
        </div>
      </div>

      {/* KPI 2: SX SAI NGÀY KH */}
      <div
        style={{
          padding: '16px 18px',
          background: sxSaiNgayCount > 0 ? '#fffdf7' : '#ffffff',
          borderLeft: sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
          borderRight: sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
          borderBottom: sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
          borderTop: '3.5px solid #ea580c',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#ea580c',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          SX sai ngày KH
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: sxSaiNgayCount > 0 ? '#ea580c' : '#0f172a',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {sxSaiNgayCount.toLocaleString('vi-VN')}{' '}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#ea580c' }}>lệnh</span>
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#ea580c', fontWeight: 700 }}>{sxSaiNgayRate}%</span> •{' '}
          <span style={{ color: '#9a3412' }}>Lệch ngày kế hoạch</span>
        </div>
      </div>

      {/* KPI 3: TRƯỢT KH */}
      <div
        style={{
          padding: '16px 18px',
          background: truotKhCount > 0 ? '#fff5f5' : '#ffffff',
          borderLeft: truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderRight: truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderBottom: truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
          borderTop: '3.5px solid #dc2626',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#dc2626',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Trượt KH
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: truotKhCount > 0 ? '#dc2626' : '#0f172a',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {truotKhCount.toLocaleString('vi-VN')}{' '}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#dc2626' }}>lệnh</span>
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#dc2626', fontWeight: 700 }}>{truotKhRate}%</span> •{' '}
          <span style={{ color: '#991b1b' }}>Trượt kế hoạch</span>
        </div>
      </div>

      {/* KPI 4: KHỚP SỐ LƯỢNG */}
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
          minHeight: 110
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
          Khớp số lượng
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
          {khopSlCount.toLocaleString('vi-VN')}{' '}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#01411b' }}>lệnh</span>
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#01411b', fontWeight: 700 }}>{khopSlRate}%</span> • Đạt chuẩn
          sản lượng
        </div>
      </div>

      {/* KPI 5: KHỚP JOB */}
      <div
        style={{
          padding: '16px 18px',
          background: '#ffffff',
          borderLeft: '1px solid #cbd5e1',
          borderRight: '1px solid #cbd5e1',
          borderBottom: '1px solid #cbd5e1',
          borderTop: '3.5px solid #059669',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#059669',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Khớp job
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 900,
            color: '#059669',
            lineHeight: 1.05,
            margin: '8px 0 6px 0',
            letterSpacing: '-0.04em'
          }}
        >
          {khopJobCount.toLocaleString('vi-VN')}{' '}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>lệnh</span>
        </div>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Tỷ lệ: <span style={{ color: '#059669', fontWeight: 700 }}>{khopJobRate}%</span> • Khớp
          đúng quy cách job
        </div>
      </div>
    </div>
  )
}

export default PlanHeroKpiCards
