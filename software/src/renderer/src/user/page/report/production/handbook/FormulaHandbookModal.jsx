/* eslint-disable react/prop-types */
import { ExternalLink, BookOpen } from 'lucide-react'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import { FormulaHandbookSheet } from './FormulaHandbookSheet'

export function FormulaHandbookModal({ isOpen, open, onClose, defaultReportType = 'all' }) {
  const isModalOpen = isOpen ?? open ?? false
  if (!isModalOpen) return null

  const handleOpenWindow = () => {
    openChildWindow({
      path: `/sub/report/handbook/formula${defaultReportType !== 'all' ? `?type=${defaultReportType}` : ''}`,
      title: 'Tra cứu công thức & Cột dữ liệu Báo cáo',
      width: 1250,
      height: 850,
      id: 'report-formula-handbook-window'
    })
    if (onClose) onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: 'clamp(1020px, 92vw, 1500px)',
          height: 'clamp(660px, 88vh, 920px)',
          maxHeight: '94vh',
          maxWidth: '96vw',
          border: '1px solid #cbd5e1',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 6
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Clean Header */}
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="#01411b" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              Tra cứu công thức & Cột dữ liệu Báo cáo
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleOpenWindow}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '4px 10px',
                borderRadius: 5,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 11.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              title="Mở toàn màn hình / cửa sổ riêng biệt"
            >
              <ExternalLink size={12} />
              <span>Mở cửa sổ mới</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                padding: '4px 10px',
                borderRadius: 5,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 11.5,
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Đóng ✕
            </button>
          </div>
        </div>

        {/* Modal Sheet Grid Body */}
        <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
          <FormulaHandbookSheet isStandalone={false} defaultReportType={defaultReportType} />
        </div>
      </div>
    </div>
  )
}

export default FormulaHandbookModal
