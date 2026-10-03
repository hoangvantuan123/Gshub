import { useEffect } from 'react'
import { X } from 'lucide-react'

export const Drawer = ({
  open,
  visible,
  onClose,
  title,
  children,
  placement = 'right',
  width = 400,
  style = {}
}) => {
  const isOpen = open ?? visible ?? false

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

  const isRight = placement === 'right'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '90vw',
          height: '100%',
          background: '#ffffff',
          boxShadow: isRight
            ? '-10px 0 25px -5px rgba(0, 0, 0, 0.1)'
            : '10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isRight ? '1px solid #e2e8f0' : 'none',
          borderRight: !isRight ? '1px solid #e2e8f0' : 'none',
          overflow: 'hidden',
          ...style
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

export const Sheet = Drawer
