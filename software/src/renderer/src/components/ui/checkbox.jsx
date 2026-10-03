import { Check } from 'lucide-react'

export const Checkbox = ({
  checked,
  onChange,
  children,
  disabled = false,
  className = '',
  style = {}
}) => {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        color: '#0f172a',
        fontWeight: 500,
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
      className={className}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e)}
        style={{ display: 'none' }}
      />
      <span
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: checked ? '1px solid #01411b' : '1px solid #cbd5e1',
          background: checked ? '#01411b' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
      >
        {checked && <Check size={11} color="#ffffff" strokeWidth={3} />}
      </span>
      {children && <span>{children}</span>}
    </label>
  )
}
