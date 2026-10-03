import { forwardRef } from 'react'

export const Input = forwardRef(({ className = '', type = 'text', style = {}, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      style={{
        display: 'flex',
        height: '32px',
        width: '100%',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        padding: '0 10px',
        fontSize: '12px',
        color: '#0f172a',
        outline: 'none',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 0.15s ease',
        ...style
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#01411b'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
      className={className}
      {...props}
    />
  )
})

Input.displayName = 'Input'
