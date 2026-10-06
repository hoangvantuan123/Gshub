/* eslint-disable react/prop-types */
import { Play, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export function CalculationControlBar({
  fileStatusSummary = {},
  isCalculating,
  onRunCalculation,
  onClearAll,
  onRefresh
}) {
  const uploadedCount = Object.values(fileStatusSummary).filter((s) => s.isUploaded).length
  const totalTabs = 4

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        marginBottom: 16
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            Trạng thái 4 file kiến trúc:
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              background: uploadedCount === totalTabs ? '#dcfce7' : uploadedCount > 0 ? '#fef3c7' : '#f1f5f9',
              color: uploadedCount === totalTabs ? '#15803d' : uploadedCount > 0 ? '#b45309' : '#64748b'
            }}
          >
            {uploadedCount} / {totalTabs} file đã nạp
          </span>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          Tất cả dữ liệu được tự động đồng bộ & lưu cache trong máy.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          title="Tải lại từ bộ nhớ đệm"
        >
          <RotateCcw size={14} className="mr-1" /> Làm mới
        </Button>

        {uploadedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            title="Xóa toàn bộ 4 file khỏi bộ nhớ"
          >
            <Trash2 size={14} className="mr-1" /> Xóa tất cả
          </Button>
        )}

        <Button
          size="sm"
          onClick={onRunCalculation}
          disabled={isCalculating || uploadedCount === 0}
          style={{ background: '#01411b', color: '#ffffff', fontWeight: 700, minWidth: 160 }}
        >
          <Play size={14} className="mr-1.5" />
          {isCalculating ? 'Đang tính toán...' : 'Tính KHSX & TKSX'}
        </Button>
      </div>
    </div>
  )
}
