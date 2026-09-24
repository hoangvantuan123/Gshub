import { memo } from 'react'
import { DatePicker } from 'antd'
import { useTranslation } from 'react-i18next'
import viVN from 'antd/es/date-picker/locale/vi_VN'

/**
 * QueryMonthInput - Ô chọn tháng năm (Hỗ trợ locale tiếng Việt & format MM/YYYY)
 */
const QueryMonthInput = memo(function QueryMonthInput({
  field,
  value,
  onChange,
  parseDate,
  settings,
  disabled = false,
  hasValue = false
}) {
  const { t } = useTranslation()
  const displayFormat = field.format || settings?.monthFormat || 'MM/YYYY'
  const parsedVal = value ? (parseDate ? parseDate(value) : value) : null

  return (
    <DatePicker
      picker="month"
      locale={viVN}
      value={parsedVal}
      onChange={(d) => onChange && onChange(field.key, d)}
      disabled={disabled}
      format={displayFormat}
      placeholder={field.placeholder ? t(field.placeholder) : displayFormat}
      size="small"
      variant="borderless"
      className={`w-full h-full text-[11px] p-0 font-sans ${
        hasValue ? 'query-date-has-value' : 'query-date-empty'
      }`}
    />
  )
})

export default QueryMonthInput
