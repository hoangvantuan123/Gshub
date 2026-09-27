import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, RotateCcw } from 'lucide-react'
import GenericCodeHelpModal from './GenericCodeHelpModal'
import QueryFieldItem, { checkHasValue } from './QueryFieldItem'
import QuerySettingsDrawer from './QuerySettingsDrawer'
import { useDateFormat } from '../../../hooks/useDateFormat'

// Mapping class số cột tĩnh để Tailwind CSS compile chính xác 100% (Khống chế tối đa 4 cột / 1 hàng)
const GRID_COL_MAP = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
}

/**
 * DynamicQueryBar - Thanh tìm kiếm động ERP chuẩn giao diện hệ thống
 * Đã được module hóa sạch đẹp, hỗ trợ đa ngôn ngữ và định dạng thời gian tự động.
 * Khống chế tối đa 4 cột điều kiện / so sánh trên 1 hàng.
 */
export default function DynamicQueryBar({
  fields = [],
  allAvailableFields = [],
  values = {},
  onChange,
  onSearch,
  onCodeHelp,
  disabled = false,
  columns = 4,
  className = '',
  showSettings = true,
  onToggleField,
  onResetFields
}) {
  const { t } = useTranslation()
  const { settings, parseDate } = useDateFormat()
  const [activeModalField, setActiveModalField] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const lastSearchTimeRef = useRef(0)

  // Khống chế số cột tối đa trên 1 hàng là 4
  const effectiveColumns = Math.min(Math.max(1, Number(columns) || 4), 4)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      const now = Date.now()
      // Chống kẹt phím liên hồi (< 300ms)
      if (now - lastSearchTimeRef.current < 300) {
        e.preventDefault()
        return
      }

      lastSearchTimeRef.current = now
      onSearch()
    }
  }

  // Lọc chỉ lấy các trường visible !== false
  const visibleFields = useMemo(() => {
    return fields.filter((f) => f && f.key && f.visible !== false)
  }, [fields])

  // Đếm số lượng trường đang có giá trị lọc kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0
    visibleFields.forEach((field) => {
      if (checkHasValue(values[field.key], field.type)) {
        count++
      }
    })
    return count
  }, [visibleFields, values])

  // Xóa toàn bộ giá trị đang lọc trên tất cả các ô
  const handleClearAllValues = () => {
    visibleFields.forEach((field) => {
      if (checkHasValue(values[field.key], field.type)) {
        if (field.type === 'date-range' || field.type === 'month-range') {
          onChange && onChange(field.key, ['', ''])
        } else {
          onChange && onChange(field.key, '')
        }
      }
    })
    if (onResetFields) {
      onResetFields()
    }
  }

  // Tính toán tổng số span để bù ô trống cân đối viền table
  const totalSpans = useMemo(() => {
    return visibleFields.reduce((acc, f) => acc + Math.min(f?.colSpan || 1, effectiveColumns), 0)
  }, [visibleFields, effectiveColumns])

  const emptySlots = useMemo(() => {
    const remainder = totalSpans % effectiveColumns
    return remainder === 0 ? 0 : effectiveColumns - remainder
  }, [totalSpans, effectiveColumns])

  const gridColsClass =
    GRID_COL_MAP[effectiveColumns] || 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'

  // Danh sách trường cho Drawer cài đặt (loại bỏ cột hệ thống Status, IndexNo, IdSeq, StatusAcc, userStatus)
  const settingsFieldsList = useMemo(() => {
    const map = new Map()
    const forbiddenKeys = new Set(['status', 'indexno', 'idseq', 'statusacc', 'userstatus'])
    // 1. Thêm allAvailableFields trước
    ;(allAvailableFields || []).forEach((f) => {
      if (f && f.key && !forbiddenKeys.has(f.key.toLowerCase())) map.set(f.key, f)
    })
    // 2. Thêm fields hiện tại nếu chưa có
    ;(fields || []).forEach((f) => {
      if (f && f.key && !forbiddenKeys.has(f.key.toLowerCase()) && !map.has(f.key)) {
        map.set(f.key, f)
      }
    })
    return Array.from(map.values())
  }, [allAvailableFields, fields])

  const currentVisibleKeys = useMemo(() => {
    return new Set(visibleFields.map((f) => f.key))
  }, [visibleFields])

  return (
    <div className={`w-full bg-white select-none relative ${className}`}>
      {/* CSS tùy chỉnh màu nổi bật cho DatePicker & ERP Components */}
      <style>{`
        .query-date-has-value .ant-picker-input > input {
          color: #1d4ed8 !important;
          font-weight: 600 !important;
        }
        .query-date-empty .ant-picker-input > input {
          color: #334155 !important;
        }
        .erp-query-segmented {
          height: 22px !important;
          line-height: 20px !important;
        }
        .erp-query-segmented .ant-segmented-item {
          min-height: 20px !important;
          line-height: 20px !important;
        }
      `}</style>

      {/* Grid điều kiện tìm kiếm ERP - Chuẩn tối đa 4 cột / 1 hàng, hết 4 cột tự động xuống dòng */}
      <div className={`grid ${gridColsClass} w-full border-t border-l border-slate-200 bg-slate-50/20`}>
        {visibleFields.map((field) => (
          <QueryFieldItem
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            onCodeHelp={onCodeHelp}
            onSetActiveModalField={setActiveModalField}
            parseDate={parseDate}
            settings={settings}
            disabled={disabled}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div
            key={`empty-slot-${idx}`}
            className="hidden md:block col-span-1 h-[28px] border-b border-r border-slate-200 bg-slate-50/30"
          />
        ))}
      </div>

      {/* Cụm điều khiển Bộ lọc & Trạng thái lọc */}
      <div className="absolute -top-[23px] right-2 z-10 flex items-center gap-1.5">
        {/* Nút Mở cài đặt bộ lọc */}
        {showSettings && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer select-none font-medium px-1.5 py-0.5 rounded hover:bg-slate-100"
            title={t('Cài đặt điều kiện')}
          >
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>{t('Bộ lọc')}</span>
          </button>
        )}
      </div>

      {/* Drawer Cài đặt điều kiện tìm kiếm */}
      <QuerySettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fieldsList={settingsFieldsList}
        visibleKeys={currentVisibleKeys}
        onToggleField={onToggleField}
        onResetFields={onResetFields}
      />

      {/* Modal CodeHelp tự động mở ra khi ô CodeHelp kích hoạt */}
      {activeModalField && (
        <GenericCodeHelpModal
          isOpen={!!activeModalField}
          onClose={() => setActiveModalField(null)}
          title={activeModalField.helpTitle || activeModalField.label || 'Tra cứu danh mục'}
          helpData={activeModalField.helpData || []}
          fetchHelpData={activeModalField.fetchHelpData}
          columns={activeModalField.helpCols || activeModalField.columns || []}
          initialSearchText={values[activeModalField.key] || ''}
          onSelect={(selectedItem) => {
            const colList = activeModalField.helpCols || activeModalField.columns || []
            const codeKey = activeModalField.codeKey || colList?.[0]?.id || 'Code' || 'IdSeq'
            const nameKey = activeModalField.nameKey || colList?.[1]?.id || 'Name'
            const selectedCode =
              selectedItem[codeKey] ||
              selectedItem.Code ||
              selectedItem.IdSeq ||
              selectedItem.UserId ||
              ''
            const selectedName =
              selectedItem[nameKey] || selectedItem.Name || selectedItem.UserName || ''

            onChange && onChange(activeModalField.key, selectedCode)
            if (activeModalField.nameFieldKey) {
              onChange && onChange(activeModalField.nameFieldKey, selectedName)
            }
            if (activeModalField.onSelect) {
              activeModalField.onSelect(selectedItem)
            } else if (activeModalField.onSelectHelp) {
              activeModalField.onSelectHelp(selectedItem)
            }
          }}
        />
      )}
    </div>
  )
}
