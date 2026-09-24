/* eslint-disable react/prop-types */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import QueryFieldRenderer from './QueryFieldRenderer'

/**
 * Kiểm tra xem trường dữ liệu đã có giá trị hay chưa để áp dụng style active
 */
export function checkHasValue(val, type) {
  if (val === undefined || val === null) return false
  if (type === 'checkbox' || type === 'switch') return !!val
  if (type === 'date-range' || type === 'month-range') {
    return Array.isArray(val) && (!!val[0] || !!val[1])
  }
  return String(val).trim() !== ''
}

/**
 * QueryFieldItem - Ô điều kiện tìm kiếm đơn lẻ hoàn chỉnh (Label + Input)
 */
const QueryFieldItem = memo(function QueryFieldItem({
  field,
  value,
  onChange,
  onKeyDown,
  onCodeHelp,
  onSetActiveModalField,
  parseDate,
  settings,
  disabled = false
}) {
  const { t } = useTranslation()

  if (!field || !field.key) return null

  const fieldDisabled = disabled || field.disabled
  const colSpan = field.colSpan || 1
  const colSpanClass =
    colSpan === 2
      ? 'sm:col-span-2'
      : colSpan === 3
        ? 'sm:col-span-2 md:col-span-3'
        : colSpan === 4
          ? 'sm:col-span-2 md:col-span-4'
          : ''

  const isCodeHelp = field.type === 'codehelp'
  const labelWidth = field.labelWidth || 'w-auto min-w-[85px] px-2.5 whitespace-nowrap'
  const hasValue = checkHasValue(value, field.type)

  // Màu chữ nổi bật khi đã nhập/chọn giá trị (Màu xanh đậm font đậm dễ theo dõi)
  const valueTextColor = hasValue ? 'text-blue-700 font-semibold' : 'text-slate-800 font-normal'

  const handleTriggerCodeHelp = () => {
    if (fieldDisabled) return
    if ((field.helpData && field.helpData.length > 0) || field.fetchHelpData) {
      onSetActiveModalField && onSetActiveModalField(field)
    } else if (field.onCodeHelp) {
      field.onCodeHelp()
    } else if (onCodeHelp) {
      onCodeHelp(field.key, field)
    }
  }

  const handleClearSingleValue = (e) => {
    e.stopPropagation()
    if (onChange) {
      if (field.type === 'date-range' || field.type === 'month-range') {
        onChange(field.key, ['', ''])
      } else {
        onChange(field.key, '')
      }
    }
  }

  return (
    <div
      className={`flex items-center h-[28px] border-b border-r border-slate-200 bg-white min-w-0 w-full ${colSpanClass}`}
    >
      {/* Cột nhãn Label bên trái - Tự động co giãn theo nội dung, không bị cắt chữ ... */}
      <div
        className={`bg-slate-50 border-r border-slate-200 h-full flex items-center justify-between shrink-0 font-semibold text-[10px] select-none gap-1.5 ${labelWidth} ${
          hasValue ? 'text-blue-900 font-bold bg-blue-50/40' : 'text-slate-700'
        } ${field.required ? 'text-red-600' : ''}`}
        title={field.label ? t(field.label) : ''}
      >
        <span className="whitespace-nowrap select-none">{field.label ? t(field.label) : ''}</span>
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
        {field.onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              field.onRemove(field.key)
            }}
            className="ml-1 text-slate-400 hover:text-red-500 font-bold text-[13px] leading-none shrink-0 transition-colors cursor-pointer"
            title={t('Xóa điều kiện tìm kiếm này')}
          >
            ×
          </button>
        )}
      </div>

      {/* Vùng nhập liệu bên phải */}
      <div
        onClick={isCodeHelp && !fieldDisabled ? handleTriggerCodeHelp : undefined}
        className={`flex-1 min-w-0 h-full flex items-center px-2 relative transition-colors group/input focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400 ${
          isCodeHelp
            ? 'bg-[#ebf1ff] hover:bg-[#e2ebff] cursor-pointer'
            : hasValue
              ? 'bg-blue-50/20'
              : 'bg-white focus-within:bg-blue-50/30'
        }`}
      >
        <div className="flex-1 min-w-0 h-full flex items-center">
          <QueryFieldRenderer
            field={field}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onTriggerCodeHelp={handleTriggerCodeHelp}
            parseDate={parseDate}
            settings={settings}
            disabled={fieldDisabled}
            hasValue={hasValue}
            valueTextColor={valueTextColor}
          />
        </div>

        {/* Nút X xóa nhanh giá trị của ô */}
        {hasValue && !fieldDisabled && field.type !== 'checkbox' && field.type !== 'switch' && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClearSingleValue}
            className="text-slate-400 hover:text-red-600 hover:bg-slate-200/80 rounded p-0.5 ml-1 transition-colors cursor-pointer shrink-0 flex items-center justify-center opacity-80 hover:opacity-100"
            title={t('Xóa giá trị ô này')}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
})

export default QueryFieldItem
