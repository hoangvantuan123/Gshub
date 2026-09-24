import { memo } from 'react'
import QueryTextInput from './fields/QueryTextInput'
import QueryCodeHelpInput from './fields/QueryCodeHelpInput'
import QuerySelectInput from './fields/QuerySelectInput'
import QueryDateInput from './fields/QueryDateInput'
import QueryDateRangeInput from './fields/QueryDateRangeInput'
import QueryMonthInput from './fields/QueryMonthInput'
import QueryMonthRangeInput from './fields/QueryMonthRangeInput'
import QueryCheckboxInput from './fields/QueryCheckboxInput'

/**
 * QueryFieldRenderer - Điều phối và render đúng loại Input theo field.type
 */
const QueryFieldRenderer = memo(function QueryFieldRenderer({
  field,
  value,
  onChange,
  onKeyDown,
  onTriggerCodeHelp,
  parseDate,
  settings,
  disabled = false,
  hasValue = false,
  valueTextColor = ''
}) {
  const type = field.type || 'text'

  // 1. Text & Multi-code inputs
  if (type === 'text' || type === 'input' || type === 'multi-code' || type === 'multi-input') {
    return (
      <QueryTextInput
        field={field}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        valueTextColor={valueTextColor}
      />
    )
  }

  // 2. CodeHelp
  if (type === 'codehelp') {
    return (
      <QueryCodeHelpInput
        field={field}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onTriggerCodeHelp={onTriggerCodeHelp}
        disabled={disabled}
        valueTextColor={valueTextColor}
      />
    )
  }

  // 3. Select & Segmented Dropdown
  if (type === 'select' || type === 'segmented') {
    return (
      <QuerySelectInput
        field={field}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        valueTextColor={valueTextColor}
      />
    )
  }

  // 4. Date (Ngày đơn)
  if (type === 'date') {
    return (
      <QueryDateInput
        field={field}
        value={value}
        onChange={onChange}
        parseDate={parseDate}
        settings={settings}
        disabled={disabled}
        hasValue={hasValue}
      />
    )
  }

  // 5. Date Range (Khoảng ngày)
  if (type === 'date-range') {
    return (
      <QueryDateRangeInput
        field={field}
        value={value}
        onChange={onChange}
        parseDate={parseDate}
        settings={settings}
        disabled={disabled}
        hasValue={hasValue}
      />
    )
  }

  // 6. Month (Tháng đơn)
  if (type === 'month') {
    return (
      <QueryMonthInput
        field={field}
        value={value}
        onChange={onChange}
        parseDate={parseDate}
        settings={settings}
        disabled={disabled}
        hasValue={hasValue}
      />
    )
  }

  // 7. Month Range (Khoảng tháng)
  if (type === 'month-range') {
    return (
      <QueryMonthRangeInput
        field={field}
        value={value}
        onChange={onChange}
        parseDate={parseDate}
        settings={settings}
        disabled={disabled}
        hasValue={hasValue}
      />
    )
  }

  // 8. Checkbox
  if (type === 'checkbox') {
    return (
      <QueryCheckboxInput
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
        hasValue={hasValue}
      />
    )
  }

  // 9. Custom render
  if (type === 'custom' && field.render) {
    return field.render({
      value,
      hasValue,
      valueTextColor,
      onChange: (newVal) => onChange && onChange(field.key, newVal),
      disabled,
      handleKeyDown: onKeyDown
    })
  }

  return null
})

export default QueryFieldRenderer
