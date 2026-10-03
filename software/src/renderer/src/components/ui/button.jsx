import { forwardRef } from 'react'

export const Button = forwardRef(
  (
    {
      className = '',
      variant = 'default',
      size = 'default',
      children,
      disabled = false,
      type = 'button',
      onClick,
      style = {},
      ...props
    },
    ref
  ) => {
    // Base styles according to shadcn/ui
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      borderRadius: '6px',
      fontSize: size === 'sm' ? '12px' : size === 'lg' ? '14px' : '13px',
      fontWeight: 600,
      outline: 'none',
      transition: 'all 0.15s ease',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      border: '1px solid transparent',
      gap: '6px'
    }

    // Variants
    let variantStyle = {}
    if (variant === 'default' || variant === 'primary') {
      variantStyle = {
        background: '#01411b',
        color: '#ffffff',
        borderColor: '#01411b',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }
    } else if (variant === 'destructive') {
      variantStyle = {
        background: '#ef4444',
        color: '#ffffff',
        borderColor: '#ef4444',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }
    } else if (variant === 'outline') {
      variantStyle = {
        background: '#ffffff',
        color: '#0f172a',
        borderColor: '#e2e8f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }
    } else if (variant === 'secondary') {
      variantStyle = {
        background: '#f1f5f9',
        color: '#0f172a',
        borderColor: '#e2e8f0'
      }
    } else if (variant === 'ghost') {
      variantStyle = {
        background: 'transparent',
        color: '#0f172a',
        borderColor: 'transparent'
      }
    } else if (variant === 'link') {
      variantStyle = {
        background: 'transparent',
        color: '#01411b',
        borderColor: 'transparent',
        textDecoration: 'underline'
      }
    }

    // Sizes
    let sizeStyle = {}
    if (size === 'default') {
      sizeStyle = { height: '32px', padding: '0 12px' }
    } else if (size === 'sm') {
      sizeStyle = { height: '28px', padding: '0 8px', fontSize: '11.5px' }
    } else if (size === 'lg') {
      sizeStyle = { height: '38px', padding: '0 16px' }
    } else if (size === 'icon') {
      sizeStyle = { height: '32px', width: '32px', padding: '0' }
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        style={{ ...baseStyle, ...variantStyle, ...sizeStyle, ...style }}
        className={className}
        onMouseEnter={(e) => {
          if (!disabled) {
            if (variant === 'default' || variant === 'primary') {
              e.currentTarget.style.background = '#0d532b'
            } else if (variant === 'destructive') {
              e.currentTarget.style.background = '#dc2626'
            } else if (variant === 'outline' || variant === 'ghost') {
              e.currentTarget.style.background = '#f8fafc'
            } else if (variant === 'secondary') {
              e.currentTarget.style.background = '#e2e8f0'
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            if (variant === 'default' || variant === 'primary') {
              e.currentTarget.style.background = '#01411b'
            } else if (variant === 'destructive') {
              e.currentTarget.style.background = '#ef4444'
            } else if (variant === 'outline') {
              e.currentTarget.style.background = '#ffffff'
            } else if (variant === 'ghost') {
              e.currentTarget.style.background = 'transparent'
            } else if (variant === 'secondary') {
              e.currentTarget.style.background = '#f1f5f9'
            }
          }
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
