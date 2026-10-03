import { useEffect } from 'react'
import { X } from 'lucide-react'

export const Modal = ({
  open,
  visible,
  onClose,
  onCancel,
  onOk,
  title,
  children,
  footer,
  width = 520,
  style = {}
}) => {
  const isOpen = open ?? visible ?? false
  const handleClose = onClose || onCancel || (() => {})

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...style
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</div>
            <button
              type="button"
              onClick={handleClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer !== null && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}
          >
            {footer ? (
              footer
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                {onOk && (
                  <button
                    type="button"
                    onClick={onOk}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #01411b',
                      background: '#01411b',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Đồng ý
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const Dialog = Modal
