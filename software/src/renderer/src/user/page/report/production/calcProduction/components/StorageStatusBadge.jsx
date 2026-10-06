/* eslint-disable react/prop-types */
import { Database, Globe } from 'lucide-react'

export function StorageStatusBadge({ mode = 'indexeddb' }) {
  const isSqlite = mode === 'sqlite'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 4,
        background: isSqlite ? '#eff6ff' : '#f0fdf4',
        border: `1px solid ${isSqlite ? '#bfdbfe' : '#bbf7d0'}`,
        fontSize: 12,
        fontWeight: 600,
        color: isSqlite ? '#1d4ed8' : '#15803d'
      }}
      title={
        isSqlite
          ? 'Đang lưu trữ cục bộ qua cơ sở dữ liệu SQLite trên Electron Desktop App'
          : 'Đang lưu trữ và cache cục bộ qua IndexedDB trên Web Browser'
      }
    >
      {isSqlite ? <Database size={14} /> : <Globe size={14} />}
      <span>
        Kho lưu trữ: <b>{isSqlite ? 'SQLite (Desktop)' : 'IndexedDB (Web Cache)'}</b>
      </span>
    </div>
  )
}
