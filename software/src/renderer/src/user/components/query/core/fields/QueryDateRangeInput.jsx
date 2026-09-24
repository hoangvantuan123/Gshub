import { memo } from 'react'
import { DatePicker } from 'antd'
import viVN from 'antd/es/date-picker/locale/vi_VN'

const { RangePicker } = DatePicker

/**
 * QueryDateRangeInput - Ô chọn khoảng ngày (Từ ngày ~ Đến ngày) hỗ trợ locale tiếng Việt
 */
const QueryDateRangeInput = memo(function QueryDateRangeInput({
  field,
  value,
  onChange,
  parseDate,
  settings,
  disabled = false,
  hasValue = false
}) {
  const displayFormat = field.format || settings?.dateFormat || 'DD/MM/YYYY'

  const parsedValue =
    Array.isArray(value) && value.length === 2
      ? [
          value[0] ? (parseDate ? parseDate(value[0]) : value[0]) : null,
          value[1] ? (parseDate ? parseDate(value[1]) : value[1]) : null
        ]
      : [null, null]

  return (
    <RangePicker
      locale={viVN}
      value={parsedValue}
      onChange={(dates) => onChange && onChange(field.key, dates)}
      disabled={disabled}
      format={displayFormat}
      size="small"
      variant="borderless"
      className={`w-full h-full text-[11px] p-0 font-sans ${
        hasValue ? 'query-date-has-value' : 'query-date-empty'
      }`}
      separator="~"
    />
  )
})

export default QueryDateRangeInput
