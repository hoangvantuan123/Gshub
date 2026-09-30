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
      item.title.toLowerCase().includes(q) ||
      item.scope.toLowerCase().includes(q) ||
      item.formula.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    return matchCat && matchText
  })

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
          width: 'clamp(1020px, 88vw, 1440px)',
          height: 'clamp(660px, 88vh, 900px)',
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
                SỔ TAY CÔNG THỨC & QUY TẮC TÍNH TOÁN BÁO CÁO KHSX
              </div>
              <div style={{ fontSize: 11.5, color: '#e0f2fe', marginTop: 2, fontWeight: 500 }}>
                Tổng hợp chi tiết công thức, định nghĩa, vị trí áp dụng và nguồn dữ liệu trên toàn
                bộ giao diện
              </div>
            </div>
          </div>
        
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
              { key: 'KPI', label: 'I. Thẻ KPI Tổng quan (6)' },
              { key: 'CHARTS', label: 'II & III. Biểu đồ (3)' },
              { key: 'TABLES', label: 'IV. Bảng biểu (3)' }
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
              minWidth: 240
            }}
          >
            <Search size={13} color="#64748b" />
            <input
              type="text"
              placeholder="Tìm công thức, tên mục, vị trí..."
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color:
                          item.badgeColor === 'blue'
                            ? '#2563eb'
                            : item.badgeColor === 'green'
                              ? '#16a34a'
                              : '#d97706'
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
                        background: '#f1f5f9',
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
            Hiển thị <b>{filteredFormulas.length}</b> / <b>{FORMULA_DATABASE.length}</b> công thức
            tính toán
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
