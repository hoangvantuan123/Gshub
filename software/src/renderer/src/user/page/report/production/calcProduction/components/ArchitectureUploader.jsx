/* eslint-disable react/prop-types */
import { useRef } from 'react'
import { Upload, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export function ArchitectureUploader({
  tabDef,
  fileData,
  isParsing,
  onUpload,
  onDelete
}) {
  const fileInputRef = useRef(null)

  const hasData = Boolean(fileData && fileData.rowCount > 0)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(tabDef.id, file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div
      style={{
        border: `1.5px dashed ${hasData ? '#059669' : '#cbd5e1'}`,
        borderRadius: 6,
        padding: '16px 20px',
        background: hasData ? '#f0fdf4' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: hasData ? '#dcfce7' : '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: hasData ? '#166534' : '#64748b'
          }}
        >
          <FileSpreadsheet size={24} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              {tabDef.title}
            </span>
            {hasData ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#166534',
                  background: '#bbf7d0',
                  padding: '2px 8px',
                  borderRadius: 12
                }}
              >
                <CheckCircle2 size={12} /> Đã nạp dữ liệu
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#64748b',
                  background: '#e2e8f0',
                  padding: '2px 8px',
                  borderRadius: 12
                }}
              >
                <AlertCircle size={12} /> Chưa có file
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {hasData ? (
              <span>
                File: <b style={{ color: '#0f172a' }}>{fileData.fileName}</b> •{' '}
                <b style={{ color: '#01411b' }}>{fileData.rowCount.toLocaleString('vi-VN')}</b> dòng •{' '}
                Khớp {fileData.columns?.length || 0} cột
              </span>
            ) : (
              <span>{tabDef.description} (Hỗ trợ định dạng Excel .xlsx, .xls, .csv)</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(tabDef.id)}
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <Trash2 size={14} className="mr-1" /> Xóa file
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
          style={{ background: '#01411b', color: '#ffffff' }}
        >
          <Upload size={14} className="mr-1" />
          {hasData ? 'Tải lại file mới' : 'Chọn file tải lên'}
        </Button>
      </div>
    </div>
  )
}
