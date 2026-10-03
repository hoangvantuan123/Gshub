/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { X, FileSpreadsheet } from 'lucide-react'
import PlanRegistrationFormCore from './PlanRegistrationFormCore'

/**
 * AddPlanRegistrationModal - Modal Pop-up Đăng ký nạp báo cáo mở rộng toàn màn hình
 * Thiết kế vuông vức, không bo góc theo chuẩn giao diện ERP/Windows
 */
export default function AddPlanRegistrationModal({ isOpen, onClose, onSaveSuccess }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose && onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        animation: 'fadeIn 0.12s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 0, // Không bo góc theo yêu cầu
          border: '1px solid #94a3b8',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          width: '98vw',
          height: '96vh',
          maxWidth: '99vw',
          maxHeight: '98vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal vuông vức, chuẩn thao tác ERP */}
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f1f5f9',
            flexShrink: 0,
            borderRadius: 0,
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={15} className="text-[#01411b]" />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}
            >
              ĐĂNG KÝ & NẠP DỮ LIỆU BÁO CÁO SẢN XUẤT (KHSX / TKSX)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              padding: '4px 6px',
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0'
              e.currentTarget.style.color = '#0f172a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#475569'
            }}
            title="Đóng cửa sổ (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nội dung form */}
        <div style={{ flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' }}>
          <PlanRegistrationFormCore mode="modal" onClose={onClose} onSaveSuccess={onSaveSuccess} />
        </div>
      </div>
    </div>
  )
}
