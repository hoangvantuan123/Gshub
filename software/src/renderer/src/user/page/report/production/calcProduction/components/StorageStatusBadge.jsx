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
          ? 'Dữ liệu được lưu trữ an toàn trên hệ thống máy trạm GsHub'
          : 'Dữ liệu được lưu trữ và đồng bộ trên trình duyệt'
      }
    >
      {isSqlite ? <Database size={14} /> : <Globe size={14} />}
      <span>
        Lưu trữ: <b>{isSqlite ? 'Hệ thống GsHub' : 'Bộ nhớ trình duyệt'}</b>
      </span>
    </div>
  )
}
