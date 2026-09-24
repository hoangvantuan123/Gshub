import { memo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * QueryCheckboxInput - Ô chọn Checkbox
 */
const QueryCheckboxInput = memo(function QueryCheckboxInput({
  field,
  value,
  onChange,
  disabled = false,
  hasValue = false
}) {
  const { t } = useTranslation()

  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange && onChange(field.key, e.target.checked)}
        disabled={disabled}
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 h-3.5 w-3.5 cursor-pointer"
      />
      {field.checkboxLabel && (
        <span className={hasValue ? 'text-blue-700 font-semibold' : 'text-slate-700'}>
          {t(field.checkboxLabel)}
        </span>
      )}
    </label>
  )
})

export default QueryCheckboxInput
