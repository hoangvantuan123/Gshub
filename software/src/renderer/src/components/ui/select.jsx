import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn một mục...',
  disabled = false,
  className = '',
  style = {},
  icon: Icon,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ESC key to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Find selected item label
  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayLabel = selectedOption ? (selectedOption.label ?? selectedOption.value) : placeholder

  // Filter options if searchable
  const filteredOptions =
    searchable || options.length > 8
      ? options.filter((opt) => {
          if (!searchTerm.trim()) return true
          const text = String(opt.label || opt.value || '').toLowerCase()
          return text.includes(searchTerm.toLowerCase().trim())
        })
      : options

  const handleSelect = (val) => {
    if (onChange) {
      onChange(val)
    }
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {/* Custom Shadcn Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={typeof displayLabel === 'string' ? displayLabel : ''}
        style={{
          height: 32,
          width: '100%',
          borderRadius: 6,
          border: isOpen ? '1px solid #01411b' : '1px solid #e2e8f0',
          background: '#ffffff',
          paddingLeft: Icon ? 28 : 10,
          paddingRight: 26,
          fontSize: 12,
          fontWeight: 600,
          color: selectedOption ? '#0f172a' : '#64748b',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) e.currentTarget.style.borderColor = '#cbd5e1'
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) e.currentTarget.style.borderColor = '#e2e8f0'
        }}
      >
        {Icon && (
          <Icon
            size={13}
            style={{
              position: 'absolute',
              left: 9,
              color: '#64748b',
              pointerEvents: 'none'
            }}
          />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          style={{
            position: 'absolute',
            right: 8,
            color: '#94a3b8',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Custom Shadcn Floating Menu Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 'max(100%, 220px)',
            maxHeight: 280,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            padding: 4,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.12s ease-out'
          }}
        >
          {/* Search box for long list */}
          {(searchable || options.length > 8) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: 4,
                gap: 6
              }}
            >
              <Search size={12} color="#94a3b8" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: 11.5,
                  color: '#0f172a',
                  background: 'transparent'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* List items */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 11.5,
                  color: '#94a3b8',
                  textAlign: 'center'
                }}
              >
                Không có lựa chọn nào phù hợp
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#166534' : '#1e293b',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      border: 'none',
                      borderRadius: 5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'all 0.1s ease',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.color = '#0f172a'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = '#1e293b'
                      }
                    }}
                  >
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {opt.label ?? opt.value}
                    </span>
                    {isSelected && <Check size={13} color="#166534" strokeWidth={2.5} />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
