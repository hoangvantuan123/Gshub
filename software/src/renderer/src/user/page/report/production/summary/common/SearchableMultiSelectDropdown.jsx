/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * SearchableMultiSelectDropdown - Bộ chọn đa giá trị kèm ô tìm kiếm chuẩn ERP hiện đại
 */
export function SearchableMultiSelectDropdown({
  placeholder = 'Tất cả',
  options = [],
  value = [],
  onChange,
  disabled = false,
  minWidth = '140px',
  maxWidth = '260px',
  dropdownWidth = '320px',
  renderItem
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Chuẩn hoá value thành mảng
  const selectedValues = useMemo(() => {
    if (!value || value === 'ALL') return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  // Đóng khi click ngoài
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Tự động focus ô tìm kiếm khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Lọc options theo search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter((opt) => {
      const searchKey = String(
        opt.searchKey || opt.label || opt.machineName || opt.value || ''
      ).toLowerCase()
      return searchKey.includes(q)
    })
  }, [options, searchQuery])

  // Toggle một option
  const handleToggleOption = (optVal) => {
    if (disabled) return
    let next
    if (selectedValues.includes(optVal)) {
      next = selectedValues.filter((v) => v !== optVal)
    } else {
      next = [...selectedValues, optVal]
    }
    onChange && onChange(next)
  }

  // Chọn tất cả
  const handleSelectAll = (e) => {
    e.stopPropagation()
    const allVals = options.map((o) => o.value)
    onChange && onChange(allVals)
  }

  // Bỏ chọn tất cả
  const handleDeselectAll = (e) => {
    e.stopPropagation()
    onChange && onChange([])
  }

  // Xoá nhanh bộ lọc từ nút (x)
  const handleClear = (e) => {
    e.stopPropagation()
    onChange && onChange([])
  }

  // Nhãn hiển thị trên trigger button
  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return <span className="text-slate-500 font-normal truncate">{placeholder}</span>
    }
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0])
      const text = found?.label || selectedValues[0]
      return <span className="text-blue-700 font-semibold truncate">{text}</span>
    }
    // Nhiều hơn 1 mục
    const firstFound = options.find((o) => o.value === selectedValues[0])
    const firstText = firstFound?.label || selectedValues[0]
    return (
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-blue-700 font-semibold truncate max-w-[130px]">{firstText}</span>
        <span className="text-blue-600 font-bold font-mono text-[10.5px] shrink-0">
          (+{selectedValues.length - 1})
        </span>
      </div>
    )
  }, [selectedValues, options, placeholder])

  return (
    <div
      ref={containerRef}
      className="relative flex items-center h-full w-full"
      style={{ minWidth, maxWidth }}
    >
      {/* TRIGGER BUTTON (Thuần transparent, không nền xám/xanh) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-full px-1.5 flex items-center justify-between gap-1.5 bg-transparent border-none outline-none text-[11px] cursor-pointer select-none font-sans ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-85'
        }`}
        title={selectedValues.length > 0 ? `Đã chọn: ${selectedValues.join(', ')}` : placeholder}
      >
        <div className="flex items-center min-w-0 flex-1 overflow-hidden">{displayLabel}</div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Nút Xoá nhanh khi có chọn */}
          {selectedValues.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
              title={t('Bỏ chọn')}
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={12}
            className={`text-slate-400 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] bg-white rounded-lg border border-slate-200 shadow-xl z-[9999] flex flex-col overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-100"
          style={{ width: dropdownWidth }}
        >
          {/* 1. Ô TÌM KIẾM */}
          <div className="p-2 border-b border-slate-100 bg-white flex items-center gap-1.5">
            <Search size={13} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Gõ để tìm kiếm...')}
              className="w-full bg-slate-50/70 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 2. THANH ACTION CHỌN TẤT CẢ / BỎ CHỌN */}
          <div className="px-2.5 py-1.5 bg-white border-b border-slate-100 flex items-center justify-between text-[10.5px]">
            <span className="text-slate-500 font-medium">
              {selectedValues.length > 0 ? (
                <>
                  Đã chọn: <b className="text-blue-600 font-mono">{selectedValues.length}</b>/
                  {options.length}
                </>
              ) : (
                `Tất cả (${options.length})`
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline"
              >
                {t('Chọn tất cả')}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-rose-600 font-semibold cursor-pointer hover:underline"
              >
                {t('Bỏ chọn')}
              </button>
            </div>
          </div>

          {/* 3. DANH SÁCH OPTIONS DẠNG CHECKBOX */}
          <div className="max-h-[240px] overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('Không tìm thấy kết quả phù hợp')}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value)
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleToggleOption(opt.value)}
                    className={`px-2 py-1.5 flex items-center gap-2 rounded cursor-pointer transition-colors text-[11px] select-none ${
                      isSelected
                        ? 'bg-blue-50/70 text-blue-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-100/80 font-normal'
                    }`}
                  >
                    {/* Checkbox box */}
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>

                    {/* Content Custom hoặc Default */}
                    <div className="flex-1 min-w-0">
                      {renderItem ? (
                        renderItem(opt, isSelected)
                      ) : (
                        <span className="truncate block">{opt.label || opt.value}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableMultiSelectDropdown
