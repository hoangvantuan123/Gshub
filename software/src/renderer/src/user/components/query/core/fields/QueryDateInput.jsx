import { memo } from 'react'
import { DatePicker } from 'antd'
import { useTranslation } from 'react-i18next'
import viVN from 'antd/es/date-picker/locale/vi_VN'

/**
 * QueryDateInput - Ô chọn ngày đơn (Hỗ trợ locale tiếng Việt & format DD/MM/YYYY)
 */
const QueryDateInput = memo(function QueryDateInput({
  field,
  value,
  onChange,
  parseDate,
  settings,
  disabled = false,
  hasValue = false
}) {
  const { t } = useTranslation()
  const displayFormat = field.format || settings?.dateFormat || 'DD/MM/YYYY'
  const parsedVal = value ? (parseDate ? parseDate(value) : value) : null

  return (
    <DatePicker
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

export default QueryDateInput
