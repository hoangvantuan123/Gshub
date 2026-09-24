import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check } from 'lucide-react'
import { Segmented } from 'antd'

/**
 * QuerySelectInput - Ô chọn Select phẳng vuông vức chuẩn ERP
 */
const QuerySelectInput = memo(function QuerySelectInput({
  field,
  value,
  onChange,
  onKeyDown,
  disabled = false,
  valueTextColor = ''
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const rawOptions = useMemo(() => {
    return field.options && field.options.length > 0
      ? field.options
      : [
          { value: '', label: 'Tất cả' },
          { value: '1', label: 'Có' },
          { value: '0', label: 'Không' }
        ]
  }, [field.options])

  const formattedOptions = useMemo(() => {
    return rawOptions.map((opt) => {
      const translatedLabel = t(opt.label)
      return {
        value: opt.value,
        label: translatedLabel,
        rawLabel: opt.label
      }
    })
  }, [rawOptions, t])

  const currentValue = value !== undefined && value !== null ? value : ''
  const hasSelectedValue = currentValue !== ''

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Lấy nhãn của option hiện tại
  const currentOption = useMemo(
    () =>
      formattedOptions.find((o) => String(o.value) === String(currentValue)) || formattedOptions[0],
    [formattedOptions, currentValue]
  )

  // Hỗ trợ chế độ Segmented nếu field yêu cầu
  if (field.variant === 'segmented' || field.segmented) {
    return (
      <div className="w-full h-full flex items-center min-w-0">
        <Segmented
          size="small"
          disabled={disabled}
          value={currentValue}
          onChange={(val) => onChange && onChange(field.key, val)}
          options={formattedOptions.map((opt) => ({
            value: opt.value,
            label: <span className="text-[10px] font-medium px-1.5">{opt.label}</span>
          }))}
          className="erp-query-segmented bg-slate-100 p-0.5 text-[10px]"
        />
      </div>
    )
  }

  const handleSelectOption = (optValue) => {
    setIsOpen(false)
    if (onChange) {
      onChange(field.key, optValue)
    }
  }

  const handleTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === ' ' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const curIdx = formattedOptions.findIndex((o) => String(o.value) === String(currentValue))
        let nextIdx = e.key === 'ArrowDown' ? curIdx + 1 : curIdx - 1
        if (nextIdx < 0) nextIdx = formattedOptions.length - 1
        if (nextIdx >= formattedOptions.length) nextIdx = 0
        onChange && onChange(field.key, formattedOptions[nextIdx].value)
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        setIsOpen(false)
      } else {
        onKeyDown && onKeyDown(e)
      }
    }
  }

  return (
    <div ref={dropdownRef} className="w-full h-full flex items-center relative min-w-0">
      {/* Nút hiển thị giá trị phẳng thuần túy chuẩn ERP */}
      <button
        type="button"
        id={`query-input-${field.key}`}
        data-query-key={field.key.toLowerCase()}
        data-query-input="true"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full h-full flex items-center justify-between text-[11px] bg-transparent border-none outline-none cursor-pointer p-0 select-none font-sans ${
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-85'
        } ${valueTextColor}`}
      >
        <span
          className={`truncate text-left ${
            hasSelectedValue ? 'text-blue-700 font-semibold' : 'text-slate-700 font-normal'
          }`}
        >
          {currentOption?.label || t('Tất cả')}
        </span>

        <ChevronDown
          size={12}
          className={`text-slate-400 shrink-0 transition-transform duration-150 stroke-[2] ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Menu đổ xuống vuông vức đơn giản, khớp 100% độ rộng khung */}
      {isOpen && (
        <div className="absolute -left-2 -right-2 top-full mt-[1px] min-w-full bg-white border border-slate-300 shadow-2xl z-[99999] rounded-none py-0.5 max-h-60 overflow-y-auto select-none font-sans">
          {formattedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(currentValue)
            return (
              <div
                key={String(opt.value)}
                onClick={() => handleSelectOption(opt.value)}
                className={`px-3 py-1.5 text-[11px] cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-normal'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="text-white shrink-0 ml-2" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

export default QuerySelectInput
