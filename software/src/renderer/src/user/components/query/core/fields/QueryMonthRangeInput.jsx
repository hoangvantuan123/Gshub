import { memo } from 'react'
import { DatePicker } from 'antd'
import viVN from 'antd/es/date-picker/locale/vi_VN'

const { RangePicker } = DatePicker

/**
 * QueryMonthRangeInput - Ô chọn khoảng tháng (Từ tháng ~ Đến tháng) hỗ trợ locale tiếng Việt
 */
const QueryMonthRangeInput = memo(function QueryMonthRangeInput({
  field,
  value,
  onChange,
  parseDate,
  settings,
  disabled = false,
  hasValue = false
}) {
  const displayFormat = field.format || settings?.monthFormat || 'MM/YYYY'

  const parsedValue =
    Array.isArray(value) && value.length === 2
      ? [
          value[0] ? (parseDate ? parseDate(value[0]) : value[0]) : null,
          value[1] ? (parseDate ? parseDate(value[1]) : value[1]) : null
        ]
      : [null, null]

  return (
    <RangePicker
      picker="month"
      locale={viVN}
      value={parsedValue}
      onChange={(dates, dateStrings) => {
        if (!onChange) return
        if (!dates || dates.length === 0) {
          onChange(field.key, ['', ''])
          return
        }
        const f0 = dates[0]?.format ? dates[0].format('YYYY-MM') : (dateStrings?.[0] || '')
        const f1 = dates[1]?.format ? dates[1].format('YYYY-MM') : (dateStrings?.[1] || '')
        onChange(field.key, [f0, f1])
      }}
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

export default QueryMonthRangeInput
