/* eslint-disable react/prop-types */
import { CheckSquare, Square, AlertCircle, AlertTriangle } from 'lucide-react'
import { translateErrorCodeOrMessage } from '../../../../IndexedDB/loadApiLogData'

export default function NotificationItem({
  item,
  isSelected = false,
  isChecked = false,
  onSelect,
  onToggleCheck
}) {
  const isRead = Boolean(item.isRead)

  const renderLogIcon = () => {
    if (item.source === 'CLIENT_UI' || item.logType === 'UI_VALIDATION_ERROR') {
      return (
        <AlertCircle
          size={15}
          className={`stroke-[1.8] ${isSelected ? 'text-blue-600' : 'text-amber-500'}`}
        />
      )
    }
    if (item.logType === 'API_BUSINESS_ERROR') {
      return (
        <AlertCircle
          size={15}
          className={`stroke-[1.8] ${isSelected ? 'text-blue-600' : 'text-orange-500'}`}
        />
      )
    }
    if (item.status === 'warning') {
      return (
        <AlertTriangle
          size={15}
          className={`stroke-[1.8] ${isSelected ? 'text-blue-600' : 'text-amber-500'}`}
        />
      )
    }
    return (
      <AlertCircle
        size={15}
        className={`stroke-[1.8] ${
          isSelected ? 'text-blue-600' : isRead ? 'text-slate-400' : 'text-rose-500'
        }`}
      />
    )
  }

  return (
    <div
      data-id={item.id}
      onClick={() => onSelect?.(item)}
      className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-75 select-none border-l-[3px] ${
        isSelected
          ? 'bg-blue-50/90 !border-l-blue-600'
          : isChecked
            ? 'bg-blue-50/40 border-l-transparent'
            : isRead
              ? 'bg-white hover:bg-slate-50/90 border-l-transparent'
              : 'bg-blue-50/20 hover:bg-slate-50 border-l-transparent'
      }`}
    >
      {/* Checkbox tích chọn dòng */}
      <div
        onClick={(e) => onToggleCheck?.(item.id, e)}
        className="shrink-0 pt-0.5 flex items-center justify-center cursor-pointer text-slate-400 hover:text-blue-600"
        title={isChecked ? 'Bỏ chọn' : 'Tích chọn để xóa'}
      >
        {isChecked ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
      </div>

      {/* Icon phân loại + Chấm xanh chưa đọc */}
      <div className="shrink-0 pt-0.5 flex items-center justify-center relative">
        {renderLogIcon()}
        {!isRead && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-white"
            title="Chưa đọc"
          />
        )}
      </div>

      {/* Nội dung dòng */}
      <div className="flex-1 min-w-0">
        {/* Hàng 1: Menu Name & Time */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className={`text-xs font-bold truncate ${
              isSelected ? 'text-blue-900' : 'text-slate-900'
            }`}
          >
            {item.menuName || 'Hệ thống'}
          </span>
          <span className="font-mono text-[10px] text-slate-500 font-semibold shrink-0">
            {item.formattedTime?.split(' ')?.[0] || ''}
          </span>
        </div>

        {/* Hàng 2: Badges */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {item.httpStatus && item.httpStatus > 0 ? (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] ${
                item.httpStatus >= 500
                  ? 'bg-rose-50 text-rose-700'
                  : item.httpStatus >= 400
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              Mã {item.httpStatus}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-blue-50 text-blue-700">
              Nhập liệu
            </span>
          )}

          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-[2px]">
            {item.logTypeName
              ? item.logTypeName
                  .replace(/Backend/g, '')
                  .replace(/API/g, 'máy chủ')
                  .replace(/Lỗi nghiệp vụ/g, 'Lỗi xử lý dữ liệu')
                  .trim()
              : 'Thông báo'}
          </span>
        </div>

        {/* Hàng 3: Message preview */}
        <p className="text-[11px] text-slate-600 font-medium truncate leading-tight">
          {translateErrorCodeOrMessage(item.message, item.errorCode)}
        </p>
      </div>
    </div>
  )
}
