/* eslint-disable react/prop-types */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDateFormat } from '../../../../hooks/useDateFormat'

/**
 * WorkProcessDetailHeader - Hiển thị thông tin chi tiết của Lệnh CĐ đang chọn
 * Luôn hiển thị mặc định, giao diện dạng lưới chuẩn ERP, chỉ đọc (không cho edit)
 */
const WorkProcessDetailHeader = memo(function WorkProcessDetailHeader({
  selectedRow = {},
  className = ''
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()

  const row = selectedRow || {}

  // Format Helpers
  const fmtDate = (val) => {
    if (!val) return ''
    try {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        const [y, m, d] = val.split('T')[0].split('-')
        return `${d}/${m}/${y}`
      }
      return formatDateTime(val) || String(val)
    } catch {
      return String(val)
    }
  }

  const fmtNum = (val) => {
    if (val === null || val === undefined || val === '') return ''
    const num = Number(val)
    return !isNaN(num) ? num.toLocaleString('vi-VN') : String(val)
  }

  // Danh sách các trường thông tin chi tiết
  const infoFields = [
    { label: t('Lệnh CĐ'), value: row.StageOrderNo || '', highlight: 'text-blue-700 font-bold', colSpan: 1 },
    { label: t('Mã mặt hàng'), value: row.ItemCode || '', highlight: 'font-semibold text-slate-800', colSpan: 1 },
    { label: t('Tên hàng hóa'), value: row.ItemName || '', highlight: 'text-slate-800', colSpan: 2 },
    { label: t('Đơn vị tính'), value: row.Unit || '', highlight: 'text-slate-800', colSpan: 1 },
    { label: t('Số TT (Bước)'), value: fmtNum(row.StepCount), highlight: 'text-purple-700 font-bold', colSpan: 1 },

    { label: t('Mã Lệnh Tổng'), value: row.DocNo || '', highlight: 'text-slate-700', colSpan: 1 },
    { label: t('SL đơn hàng (SO)'), value: fmtNum(row.QuantitySO), highlight: 'text-slate-700', colSpan: 1 },
    { label: t('SL cấp phát CĐ'), value: fmtNum(row.QuantityCDIssue), highlight: 'text-slate-700', colSpan: 1 },
    { label: t('SL sản xuất'), value: fmtNum(row.QuantityProduce), highlight: 'text-green-700 font-bold', colSpan: 1 },
    { label: t('SL đạt'), value: fmtNum(row.QuantityPass), highlight: 'text-blue-700 font-bold', colSpan: 1 },
    { label: t('Xưởng / Nhà máy'), value: row.FactoryName || '', highlight: 'text-slate-700', colSpan: 1 },

    { label: t('Ngày lập lệnh'), value: fmtDate(row.DocDate || row.CreatedDate || row.CreateDate), highlight: 'text-slate-700', colSpan: 1 },
    { label: t('Người tạo / Lập'), value: row.CreatedBy_Name || row.CreatedByName || row.CreatedBy || row.Creator || '', highlight: 'text-slate-700', colSpan: 1 },
    { label: t('Người cập nhật'), value: row.ModifiedBy_Name || row.ModifiedByName || row.ModifiedBy || row.EditBy_Name || '', highlight: 'text-slate-700', colSpan: 1 },
    { label: t('Ngày cập nhật'), value: fmtDate(row.ModifiedDate || row.EditDate || row.ModifiedAt), highlight: 'text-slate-700', colSpan: 1 },
    { label: t('Khách hàng'), value: row.CustomerName || '', highlight: 'text-slate-700', colSpan: 1 },
    { label: t('Diễn giải'), value: row.Description || '', highlight: 'text-slate-600 italic', colSpan: 1 }
  ]

  return (
    <div className={`bg-[#eaedf1] border-b border-slate-300 select-none text-[11px] p-1 shrink-0 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-300 border border-slate-300">
        {infoFields.map((f, idx) => {
          const colSpanClass =
            f.colSpan === 2
              ? 'sm:col-span-2'
              : f.colSpan === 3
              ? 'sm:col-span-2 md:col-span-3'
              : f.colSpan === 4
              ? 'sm:col-span-2 md:col-span-4'
              : ''

          return (
            <div
              key={idx}
              className={`flex items-stretch bg-white min-h-[24px] ${colSpanClass}`}
            >
              <div className="w-[100px] shrink-0 bg-[#f1f5f9] px-2 py-0.5 border-r border-slate-200 text-slate-600 font-medium flex items-center justify-between text-[11px]">
                <span className="truncate">{f.label}</span>
              </div>
              <div
                className={`flex-1 px-2 py-0.5 flex items-center overflow-hidden text-ellipsis whitespace-nowrap bg-slate-50/50 select-text ${f.highlight || 'text-slate-800'}`}
                title={f.value ? String(f.value) : ''}
              >
                <span className="truncate">{f.value || '\u00A0'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default WorkProcessDetailHeader
