import { memo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * QueryTextInput - Ô nhập liệu văn bản / mã tìm kiếm
 */
const QueryTextInput = memo(function QueryTextInput({
  field,
  value,
  onChange,
  onKeyDown,
  disabled = false,
  valueTextColor = ''
}) {
  const { t } = useTranslation()

  return (
    <input
      type="text"
      id={`query-input-${field.key}`}
      data-query-key={field.key.toLowerCase()}
      data-query-input="true"
      value={value ?? ''}
      onChange={(e) => onChange && onChange(field.key, e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={field.placeholder ? t(field.placeholder) : ''}
      maxLength={field.maxLength || 500}
      className={`w-full h-full text-[11px] bg-transparent border-none outline-none focus:ring-0 p-0 ${valueTextColor} ${
        disabled ? 'cursor-not-allowed text-slate-400' : 'cursor-text'
      }`}
    />
  )
})

export default QueryTextInput
