/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Search } from 'lucide-react'
import { FORMULA_DATABASE } from './formulaHandbookData'
import { PureButton } from './reportUIComponents'

export const FormulaHandbookModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')

  if (!isOpen) return null

  const filteredFormulas = FORMULA_DATABASE.filter((item) => {
    const matchCat = activeCategory === 'ALL' || item.category === activeCategory
    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchCat
    const matchText =
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.columnId && item.columnId.toLowerCase().includes(q)) ||
      (item.columnName && item.columnName.toLowerCase().includes(q)) ||
      (item.scope && item.scope.toLowerCase().includes(q)) ||
      (item.formula && item.formula.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    return matchCat && matchText
  })

  const kpiCount = FORMULA_DATABASE.filter((f) => f.category === 'KPI').length
  const chartsCount = FORMULA_DATABASE.filter((f) => f.category === 'CHARTS').length
  const tablesCount = FORMULA_DATABASE.filter((f) => f.category === 'TABLES').length

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
          width: 'clamp(1020px, 90vw, 1440px)',
          height: 'clamp(660px, 88vh, 920px)',
          maxHeight: '94vh',
          maxWidth: '96vw',
          border: '1.5px solid #245d6c',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#245d6c',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1a4550',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div
                style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.2 }}
              >
                SỔ TAY CÔNG THỨC & TỪ ĐIỂN CỘT DỮ LIỆU BÁO CÁO KHSX
              </div>
              <div style={{ fontSize: 11.5, color: '#e0f2fe', marginTop: 2, fontWeight: 500 }}>
                Tổng hợp chi tiết Cột ID, Tên tiếng Việt, công thức tính toán, nguồn dữ liệu và vị
                trí áp dụng
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12
            }}
          >
            Đóng ✕
          </button>
        </div>

        {/* Modal Toolbar (Category Tabs & Search) */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            flexShrink: 0
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `Tất cả (${FORMULA_DATABASE.length})` },
              { key: 'KPI', label: `I. Thẻ KPI Điều hành (${kpiCount})` },
              { key: 'CHARTS', label: `II. Biểu đồ Phân tích (${chartsCount})` },
              { key: 'TABLES', label: `IV. Bảng biểu Chi tiết (${tablesCount})` }
            ].map((tab) => {
              const active = activeCategory === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCategory(tab.key)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11.5,
                    fontWeight: active ? 800 : 600,
                    color: active ? '#ffffff' : '#334155',
                    background: active ? '#245d6c' : '#ffffff',
                    border: active ? '1px solid #245d6c' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    borderRadius: 0,
                    transition: 'all 0.12s ease'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              padding: '3px 8px',
              minWidth: 260
            }}
          >
            <Search size={13} color="#64748b" />
            <input
              type="text"
              placeholder="Tìm mã cột ID, tên tiếng Việt, công thức..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                padding: '2px 6px',
                fontSize: 12,
                color: '#0f172a',
                width: '100%',
                background: 'transparent'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Body - Formula Cards List in 2-Column Responsive Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
            alignContent: 'start',
            gap: 14,
            background: '#ffffff'
          }}
        >
          {filteredFormulas.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b',
                fontSize: 13
              }}
            >
              Không tìm thấy công thức nào khớp với từ khóa &quot;<b>{searchQuery}</b>&quot;
            </div>
          ) : (
            filteredFormulas.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Item Header */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 6px',
                        background:
                          item.badgeColor === 'blue'
                            ? '#eff6ff'
                            : item.badgeColor === 'green'
                              ? '#f0fdf4'
                              : item.badgeColor === 'red'
                                ? '#fef2f2'
                                : '#fffbeb',
                        color:
                          item.badgeColor === 'blue'
                            ? '#2563eb'
                            : item.badgeColor === 'green'
                              ? '#16a34a'
                              : item.badgeColor === 'red'
                                ? '#dc2626'
                                : '#d97706',
                        border: `1px solid ${
                          item.badgeColor === 'blue'
                            ? '#bfdbfe'
                            : item.badgeColor === 'green'
                              ? '#bbf7d0'
                              : item.badgeColor === 'red'
                                ? '#fecaca'
                                : '#fde68a'
                        }`
                      }}
                    >
                      {item.categoryName}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#245d6c'
                    }}
                  >
                    Vị trí: {item.scope}
                  </div>
                </div>

                {/* Item Content */}
                <div style={{ padding: '10px 14px' }}>
                  {/* Field Mapping Badge Line (Cột ID & Tên tiếng Việt) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 8,
                      padding: '6px 8px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                        Cột ID / Trường code:
                      </span>
                      <code
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 6px',
                          borderRadius: 2,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                        }}
                      >
                        {item.columnId || item.id}
                      </code>
                    </div>

                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                        Tên tiếng Việt:
                      </span>
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 6px',
                          borderRadius: 2,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        {item.columnName || item.title}
                      </span>
                    </div>
                  </div>

                  {/* Formula Display Box */}
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 3
                      }}
                    >
                      Công thức tính toán:
                    </div>
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderLeft: '3px solid #245d6c',
                        padding: '6px 10px',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: 12,
                        color: '#0f172a',
                        fontWeight: 600,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.45
                      }}
                    >
                      {item.formula}
                    </div>
                  </div>

                  {/* 2-Column Meta details */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                      fontSize: 11.5,
                      marginTop: 8,
                      borderTop: '1px dashed #e2e8f0',
                      paddingTop: 8
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 2 }}>
                        Nguồn dữ liệu & Trường gốc:
                      </div>
                      <div style={{ color: '#0f172a', lineHeight: 1.4 }}>{item.source}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 2 }}>
                        Ý nghĩa & Quy tắc nghiệp vụ:
                      </div>
                      <div style={{ color: '#334155', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: '1px solid #f1f5f9',
                        fontSize: 11,
                        color: '#64748b',
                        fontStyle: 'italic'
                      }}
                    >
                      * <b>Lưu ý:</b> {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Hiển thị <b>{filteredFormulas.length}</b> / <b>{FORMULA_DATABASE.length}</b> công thức &
            cột trường dữ liệu
          </div>
          <PureButton type="primary" onClick={onClose} style={{ padding: '5px 16px' }}>
            Đóng bảng tra cứu
          </PureButton>
        </div>
      </div>
    </div>
  )
}

export default FormulaHandbookModal
