import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchOutlined } from '@ant-design/icons'

/**
 * QueryCodeHelpInput - Ô tra cứu danh mục nhanh CodeHelp (Hỗ trợ F2, Ctrl+Enter, Click tra cứu)
 */
const QueryCodeHelpInput = memo(function QueryCodeHelpInput({
  field,
  value,
  onChange,
  onKeyDown,
  onTriggerCodeHelp,
  disabled = false,
  valueTextColor = ''
}) {
  const { t } = useTranslation()

  return (
    <div className="w-full h-full flex items-center min-w-0">
      <input
        type="text"
        id={`query-input-${field.key}`}
        data-query-key={field.key.toLowerCase()}
        data-query-input="true"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(field.key, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'F2' || (e.key === 'Enter' && e.ctrlKey)) {
            e.preventDefault()
            onTriggerCodeHelp && onTriggerCodeHelp()
          } else {
            onKeyDown && onKeyDown(e)
          }
        }}
        disabled={disabled}
        placeholder={field.placeholder ? t(field.placeholder) : t('Mã / F2 tra cứu')}
        maxLength={field.maxLength || 300}
        className={`flex-1 min-w-0 h-full text-[11px] bg-transparent border-none outline-none focus:ring-0 p-0 ${valueTextColor} ${
          disabled ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (field.clickToOpen !== false) {
            onTriggerCodeHelp && onTriggerCodeHelp()
          }
        }}
      />
      {field.showSearchButton && (
        <button
          type="button"
          disabled={disabled}
          onClick={onTriggerCodeHelp}
          className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 border border-blue-300 rounded shrink-0 ml-1 bg-white flex items-center justify-center transition-colors shadow-2xs"
          title={t('Mở tra cứu CodeHelp (F2)')}
        >
          <SearchOutlined />
        </button>
      )}
    </div>
  )
})

export default QueryCodeHelpInput
