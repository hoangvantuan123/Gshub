/* eslint-disable react/prop-types */
import { Calendar, X } from 'lucide-react'

export default function ProductionAuditModalHeader({ plantName, subtitle, onClose, actions }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#ffffff',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            background: '#0ea5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Calendar size={18} color="#ffffff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}
          >
            <span>NHẬT TRÌNH ĐỐI SOÁT</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: '#f1f5f9',
                color: '#334155',
                padding: '1px 8px',
                borderRadius: 3
              }}
            >
              {plantName || 'Nhà máy'}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {actions}
        <button
          type="button"
          onClick={onClose}
          title="Đóng nhật trình"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
