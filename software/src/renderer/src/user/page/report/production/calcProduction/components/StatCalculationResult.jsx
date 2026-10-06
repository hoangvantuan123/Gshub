/* eslint-disable react/prop-types */
import { BarChart3, CheckCircle, AlertOctagon, RefreshCw } from 'lucide-react'

export function StatCalculationResult({ statData }) {
  if (!statData) return null

  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BarChart3 size={18} className="text-blue-700" />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
          KẾT QUẢ THỐNG KÊ SẢN XUẤT (TKSX) & ĐỐI SOÁT MES
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
        <div
          style={{
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            TỔNG SL SẢN XUẤT THỰC TẾ
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#01411b', marginTop: 4 }}>
            {(statData.totalProducedQty || 0).toLocaleString('vi-VN')}
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>SL ĐẠT CHUẨN</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {(statData.totalQualifiedQty || 0).toLocaleString('vi-VN')}
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>SL LỖI / PHẾ PHẨM</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            {(statData.totalDefectQty || 0).toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
              ({statData.defectRate || 0}%)
            </span>
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            ĐỘ TRỄ ĐỒNG BỘ TB (MES ↔ BRAVO)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
            {statData.avgSyncDelaySeconds || 0} giây
          </div>
        </div>
      </div>

      {/* MES Reconcile Section */}
      {statData.mesApproval && (
        <div
          style={{
            padding: 14,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 6,
            marginBottom: 16
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
            Đối soát với Báo cáo Duyệt Sản Lượng MES:
          </div>
          <div style={{ fontSize: 12, color: '#0c4a6e', lineHeight: 1.6 }}>
            • Tổng phiếu duyệt MES:{' '}
            <b>{(statData.mesApproval.totalApprovedTickets || 0).toLocaleString('vi-VN')} phiếu</b>
            <br />• SL duyệt MES:{' '}
            <b>
              {(statData.mesApproval.approvedProducedQty || 0).toLocaleString('vi-VN')}
            </b> (Đạt: {(statData.mesApproval.approvedQualifiedQty || 0).toLocaleString('vi-VN')},
            Lỗi: {(statData.mesApproval.approvedDefectQty || 0).toLocaleString('vi-VN')})<br />•
            Chênh lệch với Thống kê SX:{' '}
            <b>
              {(statData.mesApproval.discrepancyProducedQty || 0).toLocaleString('vi-VN')} sản phẩm
            </b>
          </div>
        </div>
      )}
    </div>
  )
}
