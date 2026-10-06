/* eslint-disable react/prop-types */
import { Calendar, Layers, Clock, AlertTriangle } from 'lucide-react'

export function PlanCalculationResult({ planData }) {
  if (!planData) return null

  return (
    <div style={{ marginTop: 24, padding: 16, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Calendar size={18} className="text-emerald-700" />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
          KẾT QUẢ TÍNH TOÁN KẾ HOẠCH SẢN XUẤT (KHSX)
        </span>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>TỔNG SL CẦN SẢN XUẤT</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#01411b', marginTop: 4 }}>
            {(planData.totalPlannedQty || 0).toLocaleString('vi-VN')}
          </div>
        </div>

        <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>TỔNG SL CẦN ĐẠT</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {(planData.totalTargetQty || 0).toLocaleString('vi-VN')}
          </div>
        </div>

        <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>SL DỞ DANG / CHƯA XONG</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {(planData.totalUnfinishedQty || 0).toLocaleString('vi-VN')}
          </div>
        </div>

        <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>TỔNG GIỜ KẾ HOẠCH</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {(planData.totalPlannedHours || 0).toLocaleString('vi-VN')} h
          </div>
        </div>
      </div>

      {/* Machine Breakdown Table */}
      {planData.machineBreakdown?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Phân bổ Kế hoạch theo Máy sản xuất:
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>Máy sản xuất</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>Số lệnh</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#01411b', textAlign: 'right' }}>SL Kế hoạch</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#059669', textAlign: 'right' }}>SL Cần đạt</th>
                </tr>
              </thead>
              <tbody>
                {planData.machineBreakdown.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 12px', fontWeight: 600, color: '#0f172a' }}>{m.machine}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: '#64748b' }}>{(m.orderCount || 0).toLocaleString('vi-VN')}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: '#01411b' }}>{(m.plannedQty || 0).toLocaleString('vi-VN')}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: '#059669' }}>{(m.targetQty || 0).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
