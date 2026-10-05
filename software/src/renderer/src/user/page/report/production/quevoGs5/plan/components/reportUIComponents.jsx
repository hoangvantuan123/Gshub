function getMasterEffectiveDate(item) {
  if (!item) return 0
  // 1. Ưu tiên 1: ApplyDate (Ngày áp dụng thực tế của đợt KHSX / TKSX)
  if (item.ApplyDate) {
    const t = new Date(item.ApplyDate).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 2. Ưu tiên 2: Trích xuất từ mã RegCode (ví dụ: KHSX_20261003_8800 hoặc TKSX_20261003_...)
  const reg = String(item.RegCode || item.regCode || '')
  const match = reg.match(/_(\d{4})(\d{2})(\d{2})_/)
  if (match) {
    const t = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 3. Ưu tiên 3: Trường Date
  if (item.Date) {
    const t = new Date(item.Date).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 4. Ưu tiên 4: CreatedAt (Thời điểm tạo/nạp phiếu)
  if (item.CreatedAt) {
    const t = new Date(item.CreatedAt).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  return 0
}

/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useMemo } from 'react'
import { RotateCw, Search, ChevronDown, Check, X } from 'lucide-react'

// 1. Pure Sharp Button - Standardized 28px height
export const PureButton = ({
  children,
  icon,
  onClick,
  type = 'default',
  size = 'small',
  loading,
  style,
  title,
  disabled
}) => {
  const isPrimary = type === 'primary'
  const btnHeight = size === 'small' ? 28 : 32
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`pure-button ${isPrimary ? 'pure-button-primary' : 'pure-button-default'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: btnHeight,
        padding: '0 10px',
        fontSize: size === 'small' ? 11.5 : 12,
        fontWeight: isPrimary ? 700 : 600,
        color: isPrimary ? '#ffffff' : '#334155',
        background: isPrimary ? '#01411b' : '#ffffff',
        border: isPrimary ? '1px solid #01411b' : '1px solid #cbd5e1',
        borderRadius: 4,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        fontFamily: 'inherit',
        lineHeight: 1,
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        outline: 'none',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
          <RotateCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        </span>
      ) : icon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{icon}</span>
      ) : null}
      <span style={{ display: 'inline-block', lineHeight: 1 }}>{children}</span>
    </button>
  )
}

// 2. Custom Sharp Searchable Dropdown for Master Batch Selection (Đợt nạp dữ liệu chuẩn kỹ thuật) - Standardized 28px height
export const MasterBatchSearchSelect = ({
  masterList = [],
  selectedMasterKey,
  onSelectMaster,
  onRefreshMaster,
  loading = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Sắp xếp master mới nhất lên đầu
  const sortedMasters = useMemo(() => {
    if (!masterList || masterList.length === 0) return []
    const list = [...masterList]
    return list.sort((a, b) => {
      const dateA = getMasterEffectiveDate(a)
      const dateB = getMasterEffectiveDate(b)
      if (dateB !== dateA) return dateB - dateA
      const createA = new Date(a.CreatedAt || 0).getTime()
      const createB = new Date(b.CreatedAt || 0).getTime()
      if (createB !== createA) return createB - createA
      return (b.IdSeq || b.MasterSeq || 0) - (a.IdSeq || a.MasterSeq || 0)
    })
  }, [masterList])

  // Luôn tự động chọn đợt nạp mới nhất nếu chưa có đợt nào được chọn
  useEffect(() => {
    if (sortedMasters.length > 0 && !selectedMasterKey && onSelectMaster) {
      const newest = sortedMasters[0]
      const newestKey =
        newest.RegCode || newest.regCode || String(newest.IdSeq || newest.MasterSeq || '')
      if (newestKey) {
        onSelectMaster(newestKey, newest)
      }
    }
  }, [sortedMasters, selectedMasterKey, onSelectMaster])

  // Đóng khi click ngoài hoặc ấn ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Tìm master hiện tại
  const currentMaster = useMemo(() => {
    if (!selectedMasterKey) return sortedMasters[0] || null
    return (
      sortedMasters.find(
        (m) =>
          (m.RegCode || m.regCode) === selectedMasterKey ||
          String(m.IdSeq || m.MasterSeq) === String(selectedMasterKey)
      ) ||
      sortedMasters[0] ||
      null
    )
  }, [sortedMasters, selectedMasterKey])

  // Lọc theo từ khóa tìm kiếm
  const filteredMasters = useMemo(() => {
    if (!searchKeyword.trim()) return sortedMasters
    const q = searchKeyword.toLowerCase().trim()
    return sortedMasters.filter((m) => {
      const code = String(m.RegCode || m.regCode || m.IdSeq || m.MasterSeq || '').toLowerCase()
      const date = String(m.ApplyDate || m.CreatedAt || m.Date || '').toLowerCase()
      const type = String(m.ReportType || m.reportType || '').toLowerCase()
      const creator = String(m.CreatedByName || m.CreatedBy || '').toLowerCase()
      const note = String(m.Note || m.Description || '').toLowerCase()
      return (
        code.includes(q) ||
        date.includes(q) ||
        type.includes(q) ||
        creator.includes(q) ||
        note.includes(q)
      )
    })
  }, [sortedMasters, searchKeyword])

  const currentCode = currentMaster
    ? currentMaster.RegCode ||
      currentMaster.regCode ||
      String(currentMaster.IdSeq || currentMaster.MasterSeq || '')
    : 'Chưa có đợt nạp'
  const currentDate = currentMaster
    ? currentMaster.ApplyDate || currentMaster.CreatedAt?.slice(0, 10) || ''
    : ''
  const isCurrentNewest =
    sortedMasters.length > 0 &&
    currentMaster &&
    (currentMaster.RegCode || currentMaster.regCode || currentMaster.IdSeq) ===
      (sortedMasters[0].RegCode || sortedMasters[0].regCode || sortedMasters[0].IdSeq)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: '100%',
        background: 'transparent',
        boxSizing: 'border-box',
        overflow: 'visible',
        verticalAlign: 'middle',
        ...style
      }}
    >
      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '100%',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          padding: '0 8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          minWidth: 220,
          justifyContent: 'space-between',
          textAlign: 'left',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
            {currentCode}
          </span>
          {isCurrentNewest && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#059669',
                whiteSpace: 'nowrap'
              }}
            >
              (Mới nhất)
            </span>
          )}
          {currentDate && (
            <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
              ({currentDate})
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          color="#475569"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0
          }}
        />
      </button>

      {/* Refresh Button */}
      {onRefreshMaster && (
        <button
          type="button"
          onClick={() => onRefreshMaster(selectedMasterKey)}
          title="Làm mới danh sách đợt nạp CSDL"
          style={{
            height: '100%',
            border: 'none',
            borderLeft: isOpen ? '1px solid #0f766e' : '1px solid #cbd5e1',
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
            background: 'transparent',
            padding: '0 8px',
            cursor: 'pointer',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            zIndex: 99999,
            width: 420,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            boxShadow:
              '0 10px 25px -3px rgba(15, 23, 42, 0.15), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          {/* Search Header */}
          <div
            style={{
              padding: '6px 10px',
              background: '#f8fafc',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Search size={13} color="#475569" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm mã đợt, ngày nạp, người nạp..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12,
                color: '#0f172a',
                fontFamily: 'inherit',
                borderRadius: 0
              }}
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 2,
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Header Subtitle */}
          <div
            style={{
              padding: '5px 10px',
              fontSize: 10.5,
              fontWeight: 700,
              color: '#475569',
              background: '#f1f5f9',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              letterSpacing: '0.02em',
              userSelect: 'none'
            }}
          >
            <span>DANH SÁCH ĐỢT NẠP ({filteredMasters.length})</span>
            <span>MỚI NHẤT TRÊN CÙNG</span>
          </div>

          {/* List of Batches */}
          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              background: '#ffffff'
            }}
          >
            {filteredMasters.length === 0 ? (
              <div
                style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#94a3b8'
                }}
              >
                Không tìm thấy đợt nạp phù hợp với từ khóa
              </div>
            ) : (
              filteredMasters.map((m, idx) => {
                const code = m.RegCode || m.regCode || String(m.IdSeq || m.MasterSeq || '')
                const isSelected =
                  code === selectedMasterKey ||
                  String(m.IdSeq || m.MasterSeq) === String(selectedMasterKey)
                const isNewest = idx === 0 && !searchKeyword
                const dateStr = m.ApplyDate || m.CreatedAt?.slice(0, 10) || 'N/A'
                const creator = m.CreatedByName || m.CreatedBy || 'MES/Bravo'
                const typeName =
                  m.ReportType === 'statistics' || m.ReportType === 'tksx'
                    ? 'Thống kê SX'
                    : m.ReportType === 'plan' || m.ReportType === 'khsx'
                      ? 'Kế hoạch SX'
                      : m.ReportType || 'Báo cáo'

                return (
                  <div
                    key={code + idx}
                    onClick={() => {
                      if (onSelectMaster) onSelectMaster(code, m)
                      setIsOpen(false)
                    }}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isSelected ? '4px solid #0f766e' : '4px solid transparent',
                      background: isSelected ? '#f0fdfa' : '#ffffff',
                      borderRadius: 0,
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#ffffff'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 3
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isSelected ? '#0f766e' : '#0f172a'
                          }}
                        >
                          {code}
                        </span>
                        {isNewest && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#059669',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            (Mới nhất)
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#0369a1',
                            background: '#f0f9ff',
                            padding: '1px 4px',
                            borderRadius: 0,
                            border: '1px solid #bae6fd'
                          }}
                        >
                          {typeName}
                        </span>
                      </div>
                      {isSelected && <Check size={14} color="#0f766e" strokeWidth={2.5} />}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <span>
                        Ngày: <b style={{ color: '#334155' }}>{dateStr}</b>
                      </span>
                      <span>
                        Người nạp: <b style={{ color: '#334155' }}>{creator}</b>
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 2. Pure Sharp Custom Select (Custom popover dropdown chuẩn kỹ thuật) - Standardized 28px height
export const PureSelect = ({
  value,
  onChange,
  options = [],
  style,
  dropdownStyle,
  placeholder,
  disabled,
  searchable,
  title
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Normalize options
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value,
          label: opt.label !== undefined ? String(opt.label) : String(opt.value),
          subLabel: opt.subLabel,
          badge: opt.badge
        }
      }
      return { value: opt, label: String(opt) }
    })
  }, [options])

  const shouldSearch = searchable !== undefined ? searchable : normalizedOptions.length >= 6

  // Selected Option
  const selectedOpt = useMemo(() => {
    return normalizedOptions.find((o) => String(o.value) === String(value)) || null
  }, [normalizedOptions, value])

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions
    const q = searchQuery.toLowerCase().trim()
    return normalizedOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || (o.subLabel && o.subLabel.toLowerCase().includes(q))
    )
  }, [normalizedOptions, searchQuery])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      if (shouldSearch) {
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus()
        }, 50)
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, shouldSearch])

  return (
    <div
      ref={containerRef}
      title={title}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: 28,
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        ...style
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '100%',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 600,
          color: selectedOpt ? '#0f172a' : '#94a3b8',
          background: '#ffffff',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}
        >
          {selectedOpt ? selectedOpt.label : placeholder || 'Chọn giá trị...'}
        </span>
        <ChevronDown
          size={12}
          color="#64748b"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.12s ease',
            flexShrink: 0
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            zIndex: 1200,
            minWidth: Math.max(160, style?.width ? Number(style.width) || 160 : 160),
            width: 'max-content',
            maxWidth: 340,
            background: '#ffffff',
            border: '1px solid #94a3b8',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: 0,
            overflow: 'hidden',
            ...dropdownStyle
          }}
        >
          {shouldSearch && (
            <div
              style={{
                padding: '4px 6px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Search size={11} color="#64748b" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 11,
                  color: '#0f172a',
                  fontFamily: 'inherit'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div style={{ maxHeight: 220, overflowY: 'auto', background: '#ffffff' }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#94a3b8',
                  textAlign: 'center'
                }}
              >
                Không có dữ liệu
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOpt && String(selectedOpt.value) === String(opt.value)
                return (
                  <div
                    key={String(opt.value) + idx}
                    onClick={() => {
                      onChange && onChange(opt.value, opt)
                      setIsOpen(false)
                    }}
                    style={{
                      padding: '5px 8px',
                      fontSize: 11.5,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#01411b' : '#334155',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      borderLeft: isSelected ? '3px solid #01411b' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f1f5f9'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#ffffff'
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && <Check size={12} color="#0f766e" style={{ flexShrink: 0 }} />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 3. Pure Sharp Date Range Picker - Standardized 28px height
export const PureDateRangePicker = ({ value, onChange }) => {
  const startDate =
    value && value[0]
      ? typeof value[0].format === 'function'
        ? value[0].format('YYYY-MM-DD')
        : String(value[0]).slice(0, 10)
      : ''
  const endDate =
    value && value[1]
      ? typeof value[1].format === 'function'
        ? value[1].format('YYYY-MM-DD')
        : String(value[1]).slice(0, 10)
      : ''

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '100%',
        gap: 4,
        padding: '0 8px',
        boxSizing: 'border-box'
      }}
    >
      <input
        type="date"
        value={startDate}
        onChange={(e) => {
          const v = e.target.value
          onChange && onChange(v ? [v, endDate] : null)
        }}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 11.5,
          color: '#0f172a',
          fontFamily: 'inherit',
          cursor: 'pointer',
          height: '100%',
          boxSizing: 'border-box'
        }}
      />
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => {
          const v = e.target.value
          onChange && onChange(v ? [startDate, v] : null)
        }}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 11.5,
          color: '#0f172a',
          fontFamily: 'inherit',
          cursor: 'pointer',
          height: '100%',
          boxSizing: 'border-box'
        }}
      />
    </div>
  )
}

// 4. Tooltip Doanh Nghiệp Cấp Cao
export const ExecutiveChartTooltip = ({ active, payload, label, unit = '', customFormatter }) => {
  if (active && payload && payload.length) {
    const pData = payload[0]?.payload || {}
    return (
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          color: '#ffffff',
          fontSize: 12,
          minWidth: 200,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: '#38bdf8',
            marginBottom: 4,
            borderBottom: '1px solid #334155',
            paddingBottom: 4
          }}
        >
          {pData.fullName || pData.name || pData.category || label || 'Chỉ số'}
          {pData.fullCode && pData.fullCode !== (pData.fullName || pData.name) && (
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>
              ({pData.fullCode})
            </span>
          )}
        </div>
        {payload
          .filter((item) => item.dataKey !== 'totalOrders' && item.name)
          .map((item, index) => {
            const itemColor =
              item.color || item.fill || item.stroke || item.payload?.fill || '#38bdf8'
            const formattedVal = customFormatter
              ? customFormatter(item.value, item.name, item)
              : `${typeof item.value === 'number' ? item.value.toLocaleString('vi-VN') : item.value}${unit || item.unit || ''}`
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginTop: 3
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      backgroundColor: itemColor,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ color: '#cbd5e1' }}>{item.name || 'Chỉ số'}:</span>
                </div>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{formattedVal}</span>
              </div>
            )
          })}
        {pData.ticketCount !== undefined && payload.every((p) => p.dataKey !== 'ticketCount') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 3 }}>
            <span style={{ color: '#94a3b8' }}>Số phiếu thống kê:</span>
            <span style={{ fontWeight: 700, color: '#cbd5e1' }}>
              {pData.ticketCount.toLocaleString('vi-VN')} phiếu
            </span>
          </div>
        )}
        {pData.avgHoursPerTicket !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 3 }}>
            <span style={{ color: '#94a3b8' }}>Bình quân / phiếu:</span>
            <span style={{ fontWeight: 700, color: '#cbd5e1' }}>
              {pData.avgHoursPerTicket} h/phiếu
            </span>
          </div>
        )}
        {pData.desc && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
            {pData.desc}
          </div>
        )}
      </div>
    )
  }
  return null
}

// 4.1. Custom Machine Runtime Vertical Bar Component
export const MachineRuntimeVerticalBar = (props) => {
  const { x, y, width, height, fill, value, isOver24h } = props
  if (height === 0 || isNaN(y)) return null

  const isWarning = isOver24h || Number(value) > 24
  const barColor = isWarning ? '#dc2626' : fill || '#01411b'
  const centerX = x + width / 2

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={barColor} />
      <text
        x={centerX}
        y={Math.max(12, y - 6)}
        fill={isWarning ? '#dc2626' : '#0f172a'}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={700}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        {value}h
      </text>
    </g>
  )
}

// 4.2. Custom Clean Technical Vertical Bar Component
export const CleanTechnicalVerticalBar = (props) => {
  const { x, y, width, height, fill, value } = props
  if (height === 0 || isNaN(y)) return null

  const isWarning = value < 95
  const barColor = isWarning ? '#d97706' : fill || '#01411b'
  const centerX = x + width / 2

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={barColor} />
      <text
        x={centerX}
        y={Math.max(12, y - 6)}
        fill={isWarning ? '#d97706' : '#0f172a'}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        {value}%
      </text>
    </g>
  )
}

// 5. Custom Clean Technical Horizontal Bar Component
export const CleanTechnicalHorizontalBar = (props) => {
  const { x, y, width, height, fill, value } = props
  if (width === 0 || isNaN(x)) return null

  const isWarning = value < 95
  const barColor = isWarning ? '#d97706' : fill || '#01411b'
  const centerY = y + height / 2

  return (
    <g>
      <rect x={x} y={y} width={Math.max(2, width)} height={height} fill={barColor} />
      <text
        x={x + Math.max(2, width) + 8}
        y={centerY + 4}
        fill={isWarning ? '#d97706' : '#0f172a'}
        textAnchor="start"
        fontSize={11}
        fontWeight={700}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        {value}%
      </text>
    </g>
  )
}

// 6. Glide Data Grid Theme - DEFAULT STANDARD TABLE SHEET THEME
export const executiveGridTheme = {
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  baseFontStyle: '13px',
  headerFontStyle: '600 13px',
  editorFontSize: '13px',
  accentColor: '#1677ff',
  accentLight: '#e6f4ff',
  textDark: '#1e293b',
  textMedium: '#475569',
  textLight: '#94a3b8',
  textHeader: '#0f172a',
  bgCell: '#ffffff',
  bgHeader: '#f8fafc',
  borderColor: '#cbd5e1',
  headerBottomBorderColor: '#cbd5e1'
}

// 7. Global CSS overrides for outline suppression & clean report capture/print
export const gridCustomCss = `
  .production-statistics-report *:focus,
  .production-statistics-report *:focus-visible,
  .production-statistics-report .dvn-scroller:focus,
  .production-statistics-report .dvn-scroller:focus-visible,
  .production-statistics-report canvas:focus,
  .production-statistics-report canvas:focus-visible,
  .production-statistics-report div:focus,
  .production-statistics-report div:focus-visible,
  .production-statistics-report .gdg-dvn-underlay:focus,
  .production-statistics-report .recharts-wrapper,
  .production-statistics-report .recharts-surface,
  .production-statistics-report .recharts-surface:focus,
  .production-statistics-report .recharts-surface:focus-visible,
  .production-statistics-report .recharts-wrapper:focus,
  .production-statistics-report .recharts-wrapper:focus-visible,
  .production-statistics-report .recharts-layer:focus,
  .production-statistics-report svg:focus,
  .production-statistics-report svg:focus-visible,
  .production-statistics-report path:focus,
  .production-statistics-report rect:focus,
  .production-statistics-report g:focus,
  .production-plan-report *:focus,
  .production-plan-report *:focus-visible,
  .production-plan-report .dvn-scroller:focus,
  .production-plan-report .dvn-scroller:focus-visible,
  .production-plan-report canvas:focus,
  .production-plan-report canvas:focus-visible,
  .production-plan-report div:focus,
  .production-plan-report div:focus-visible,
  .production-plan-report .gdg-dvn-underlay:focus,
  .production-plan-report .recharts-wrapper,
  .production-plan-report .recharts-surface,
  .production-plan-report .recharts-surface:focus,
  .production-plan-report .recharts-surface:focus-visible,
  .production-plan-report .recharts-wrapper:focus,
  .production-plan-report .recharts-wrapper:focus-visible,
  .production-plan-report .recharts-layer:focus,
  .production-plan-report svg:focus,
  .production-plan-report svg:focus-visible,
  .production-plan-report path:focus,
  .production-plan-report rect:focus,
  .production-plan-report g:focus {
    outline: none !important;
    box-shadow: none !important;
    border-color: inherit;
  }
  .production-statistics-report svg,
  .production-plan-report svg {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
  .production-statistics-report button,
  .production-statistics-report button:focus,
  .production-statistics-report button:focus-visible,
  .production-statistics-report button:active,
  .production-plan-report button,
  .production-plan-report button:focus,
  .production-plan-report button:focus-visible,
  .production-plan-report button:active,
  .production-statistics-report .pure-button,
  .production-statistics-report .pure-button:focus,
  .production-statistics-report .pure-button:focus-visible,
  .production-statistics-report .pure-button:active,
  .production-plan-report .pure-button,
  .production-plan-report .pure-button:focus,
  .production-plan-report .pure-button:focus-visible,
  .production-plan-report .pure-button:active {
    outline: none !important;
    box-shadow: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }
  .production-statistics-report .pure-button-default:hover:not(:disabled),
  .production-plan-report .pure-button-default:hover:not(:disabled) {
    background-color: #f8fafc !important;
    border-color: #01411b !important;
    color: #01411b !important;
  }
  .production-statistics-report .pure-button-default:active:not(:disabled),
  .production-plan-report .pure-button-default:active:not(:disabled) {
    background-color: #f1f5f9 !important;
    border-color: #01411b !important;
    transform: translateY(1px);
  }
  .production-statistics-report .pure-button-primary:hover:not(:disabled),
  .production-plan-report .pure-button-primary:hover:not(:disabled) {
    background-color: #013214 !important;
    border-color: #013214 !important;
    color: #ffffff !important;
  }
  .production-statistics-report .pure-button-primary:active:not(:disabled),
  .production-plan-report .pure-button-primary:active:not(:disabled) {
    background-color: #01240e !important;
    border-color: #01240e !important;
    transform: translateY(1px);
  }
  @media print {
    .screenshot-hide {
      display: none !important;
    }
    .production-statistics-report,
    .production-plan-report {
      padding: 10px !important;
      background: #ffffff !important;
    }
  }
`
