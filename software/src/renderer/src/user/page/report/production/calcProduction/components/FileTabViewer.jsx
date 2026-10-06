/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from 'antd'

export function FileTabViewer({ fileData, expectedColumns = [] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const rows = fileData?.data || []
  const columns = fileData?.columns?.length > 0 ? fileData.columns : expectedColumns

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase().trim()
    return rows.filter((r) => {
      return Object.values(r).some((v) => String(v || '').toLowerCase().includes(term))
    })
  }, [rows, searchTerm])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1

  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '40px 20px',
          textAlign: 'center',
          background: '#ffffff',
          color: '#94a3b8'
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
          Chưa có dữ liệu cho file này
        </div>
        <div style={{ fontSize: 12 }}>
          Hãy chọn file Excel hoặc CSV ở khung trên để tải lên và lưu trữ.
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#ffffff', overflow: 'hidden' }}>
      {/* Header toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            placeholder="Tìm kiếm trong bảng..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            style={{ width: 260 }}
            size="middle"
            allowClear
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Hiển thị <b>{filteredRows.length.toLocaleString('vi-VN')}</b> / {rows.length.toLocaleString('vi-VN')} dòng
          </span>
        </div>

        {/* Pagination controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
          <span>
            Trang {page} / {totalPages}
          </span>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '4px 8px',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              background: '#ffffff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '4px 8px',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              background: '#ffffff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table view */}
      <div style={{ overflowX: 'auto', maxHeight: 480 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            textAlign: 'left',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
              <th style={{ padding: '8px 10px', width: 48, textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                STT
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid #e2e8f0'
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rIdx) => {
              const rowNum = (page - 1) * pageSize + rIdx + 1
              return (
                <tr
                  key={rIdx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td
                    style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontWeight: 600,
                      borderRight: '1px solid #e2e8f0'
                    }}
                  >
                    {rowNum}
                  </td>
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                        color: '#334155',
                        borderRight: '1px solid #f1f5f9'
                      }}
                    >
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
