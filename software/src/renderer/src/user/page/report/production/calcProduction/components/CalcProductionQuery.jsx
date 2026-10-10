/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Filter,
  Settings
} from 'lucide-react'
import DynamicQueryBar from '@renderer/user/components/query/core/DynamicQueryBar'
import { TAB_DEFINITIONS } from '../constants/calcConstants'

export default function CalcProductionQuery({
  activeTab,
  onSelectTab,
  masterInfo = {},
  onChangeMasterInfo,
  availableVersions = [],
  onSelectVersion,
  fileStatusSummary = {},
  searchText = '',
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  totalRowsCount = 0,
  filteredRowsCount = 0,
  disabled = false,
  dynamicFilterFields = [],
  filterValues = {},
  onDynamicFilterChange,
  onOpenRuleConfig
}) {
  const { t } = useTranslation()

  // State đóng/mở từng nhóm điều kiện tìm kiếm
  const [isMasterOpen, setIsMasterOpen] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(true)

  // 1. Cấu hình các trường thông tin Master Đăng ký (kèm chọn Phiên bản / Version)
  const masterFields = useMemo(() => {
    const hasMultipleVersions = availableVersions && availableVersions.length > 1
    const versionOptions = (availableVersions || []).map((v) => {
      const verStr = typeof v === 'string' ? v : v.version
      const statusStr = typeof v === 'object' && v.status ? ` (${v.status})` : ''
      return {
        value: verStr,
        label: `v${verStr}${statusStr}`
      }
    })

    if (versionOptions.length === 0) {
      versionOptions.push({
        value: masterInfo?.version || '1.0',
        label: `v${masterInfo?.version || '1.0'}`
      })
    }

    return [
      {
        key: 'RegCode',
        label: t('Mã đăng ký'),
        type: 'text',
        disabled: true,
        readOnly: true,
        placeholder: 'Mã hệ thống tự sinh...',
        colSpan: 1
      },
      {
        key: 'Version',
        label: t('Phiên bản (Version)'),
        type: hasMultipleVersions ? 'select' : 'text',
        options: versionOptions,
        disabled: !hasMultipleVersions,
        colSpan: 1
      },
      {
        key: 'FactoryName',
        label: t('Nhà máy áp dụng *'),
        type: 'select',
        options: [
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' },
          { value: 'GS5 Quế Võ 2', label: 'GS5 Quế Võ 2' }
        ],
        colSpan: 1
      },
      {
        key: 'ApplyDate',
        label: t('Ngày báo cáo (KHSX) *'),
        type: 'date',
        colSpan: 1
      },
      {
        key: 'Status',
        label: t('Trạng thái báo cáo'),
        type: 'text',
        disabled: true,
        readOnly: true,
        placeholder: 'Chưa xác định',
        colSpan: 1
      },
      {
        key: 'Remark',
        label: t('Ghi chú / Mô tả'),
        type: 'text',
        placeholder: 'Nhập ghi chú cho đợt tính toán...',
        colSpan: 1
      }
    ]
  }, [availableVersions, masterInfo?.version, t])

  // 2. Cấu hình các trường Tìm kiếm & Bộ lọc dữ liệu bảng (kèm các trường sinh động khi bấm Ctrl + F trên cột)
  const baseFilterFields = useMemo(
    () => [
      {
        key: 'SearchText',
        label: t('Tìm kiếm dữ liệu'),
        type: 'text',
        placeholder: t('Nhập mã lệnh TT, mã sản phẩm, máy sản xuất, công đoạn để tìm nhanh...'),
        colSpan: 2
      },
      {
        key: 'StatusFilter',
        label: t('Lọc trạng thái ĐP-SX'),
        type: 'select',
        options: [
          { value: 'ALL', label: t('Tất cả trạng thái') },
          { value: 'Khớp số lượng', label: t('Khớp số lượng (Đạt KH)') },
          { value: 'Khớp job', label: t('Khớp job (Đạt job)') },
          { value: 'Trượt KH', label: t('Trượt KH') },
          { value: 'SX sai ngày KH', label: t('SX sai ngày KH') },
          { value: 'Khác KHSX', label: t('Khác KHSX (Ngoài KH)') },
          { value: 'Thiếu họ tên LTT', label: t('⚠️ Thiếu họ tên LTT / PIC ĐP') },
          { value: 'Chưa có TT lệnh', label: t('⚠️ Chưa có TT lệnh thao tác') },
          { value: 'Thiếu TT lệnh', label: t('⚠️ Thiếu TT lệnh') },
          { value: 'Đã bổ sung', label: t('Đã bổ sung bằng tay') }
        ],
        colSpan: 2
      }
    ],
    [t]
  )

  const filterFields = useMemo(() => {
    if (!dynamicFilterFields || dynamicFilterFields.length === 0) {
      return baseFilterFields
    }
    return [...baseFilterFields, ...dynamicFilterFields]
  }, [baseFilterFields, dynamicFilterFields])

  const currentValues = useMemo(() => {
    let displayStatus = 'BẢN NHÁP (DRAFT)'
    if (masterInfo.status === 'PUBLISHED' || masterInfo.isPublished) {
      displayStatus = `ĐÃ CÔNG BỐ (v${masterInfo.version || '1.0'})`
    } else if (masterInfo.status === 'DELETED') {
      displayStatus = 'ĐÃ XÓA TRÊN HỆ THỐNG'
    } else if (masterInfo.status === 'CANCELLED') {
      displayStatus = 'ĐÃ HỦY'
    }

    return {
      RegCode: masterInfo.regCode || '',
      Version: masterInfo.version || '1.0',
      FactoryName: masterInfo.factoryName || 'GS1 Hà Nội',
      ApplyDate: masterInfo.applyDate || '',
      Status: displayStatus,
      Remark: masterInfo.remark || '',
      SearchText: searchText || '',
      StatusFilter: statusFilter || 'ALL',
      ...(filterValues || {})
    }
  }, [masterInfo, searchText, statusFilter, filterValues])

  const handleFieldChange = (key, value) => {
    if (key === 'SearchText') {
      setSearchText && setSearchText(value)
      return
    }
    if (key === 'StatusFilter') {
      setStatusFilter && setStatusFilter(value)
      return
    }
    if (key === 'Version') {
      if (typeof onSelectVersion === 'function') {
        onSelectVersion(value)
      } else if (typeof onChangeMasterInfo === 'function') {
        onChangeMasterInfo('version', value)
      }
      return
    }
    if (dynamicFilterFields.some((f) => f.key === key)) {
      onDynamicFilterChange && onDynamicFilterChange(key, value)
      return
    }

    const keyMap = {
      RegCode: 'regCode',
      Version: 'version',
      FactoryName: 'factoryName',
      ApplyDate: 'applyDate',
      Remark: 'remark'
    }
    const targetKey = keyMap[key] || key
    onChangeMasterInfo && onChangeMasterInfo(targetKey, value)
  }

  const handleResetFilters = () => {
    setSearchText && setSearchText('')
    setStatusFilter && setStatusFilter('ALL')
    if (dynamicFilterFields && dynamicFilterFields.length > 0) {
      dynamicFilterFields.forEach((f) => {
        onDynamicFilterChange && onDynamicFilterChange(f.key, '')
      })
    }
  }

  // 4 Tab nạp dữ liệu đầu vào & 2 Tab kết quả tính toán
  const inputTabs = useMemo(() => TAB_DEFINITIONS.filter((t) => !t.isResultTab), [])
  const resultTabs = useMemo(() => TAB_DEFINITIONS.filter((t) => t.isResultTab), [])

  const hasFilterActive = Boolean(
    (searchText && searchText.trim()) ||
    (statusFilter && statusFilter !== 'ALL') ||
    Object.values(filterValues || {}).some((v) => Boolean(v && String(v).trim()))
  )

  return (
    <div className="w-full bg-white select-none overflow-hidden">
      {/* ── NHÓM 1: THÔNG TIN ĐĂNG KÝ MASTER BÁO CÁO (Hỗ trợ Đóng / Mở) ── */}
      <div className="w-full">
        <div
          onClick={() => setIsMasterOpen((prev) => !prev)}
          className={`bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1 flex items-center justify-between cursor-pointer select-none transition-colors ${
            !isMasterOpen ? 'border-b border-slate-200' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-indigo-700 uppercase tracking-wide">
            {isMasterOpen ? (
              <ChevronDown size={13} className="text-indigo-600 shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
            )}
            <ClipboardList size={12} className="text-indigo-600 shrink-0" />
            <span>{t('1. THÔNG TIN ĐĂNG KÝ MASTER')}</span>

            {/* Khi thu gọn: hiển thị tóm tắt ngắn gọn */}
            {!isMasterOpen && masterInfo.regCode && (
              <span className="text-[9.5px] font-normal normal-case text-slate-500 ml-2 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                Mã: <strong className="text-indigo-700 font-mono">{masterInfo.regCode}</strong> |{' '}
                {masterInfo.factoryName || 'GS1 Hà Nội'}
                {masterInfo.applyDate ? ` | ${masterInfo.applyDate}` : ''}
              </span>
            )}
          </div>

          <span className="text-[9px] text-slate-400 font-normal italic">
            {isMasterOpen ? t('Nhấn để thu gọn nhóm Master') : t('Nhấn để mở rộng chi tiết Master')}
          </span>
        </div>

        {isMasterOpen && (
          <DynamicQueryBar
            fields={masterFields}
            allAvailableFields={masterFields}
            values={currentValues}
            onChange={handleFieldChange}
            showSettings={false}
            disabled={disabled}
            columns={5}
          />
        )}
      </div>

      {/* ── NHÓM 2: BỘ LỌC VÀ TÌM KIẾM DỮ LIỆU BẢNG (Hỗ trợ Đóng / Mở) ── */}
      <div className="w-full">
        <div
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className={`bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1 flex items-center justify-between cursor-pointer select-none transition-colors ${
            !isFilterOpen ? 'border-b border-slate-200' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-blue-700 uppercase tracking-wide">
            {isFilterOpen ? (
              <ChevronDown size={13} className="text-blue-600 shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
            )}
            <Search size={12} className="text-blue-600 shrink-0" />
            <span>{t('2. BỘ LỌC & TÌM KIẾM DỮ LIỆU THEO TAB')}</span>

            {/* Khi thu gọn: hiển thị tóm tắt lọc */}
            {!isFilterOpen && hasFilterActive && (
              <span className="text-[9.5px] font-normal normal-case text-blue-700 ml-2 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                <Filter size={10} className="text-blue-600" />
                <span>
                  Đang lọc: {filteredRowsCount}/{totalRowsCount} dòng
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasFilterActive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetFilters()
                }}
                className="text-slate-400 hover:text-rose-600 text-[9.5px] flex items-center gap-0.5 px-1 py-0.2 rounded hover:bg-slate-200/60"
                title={t('Bỏ tất cả bộ lọc')}
              >
                <RotateCcw size={10} />
                <span>{t('Xóa lọc')}</span>
              </button>
            )}
            <span className="text-[9px] text-slate-400 font-normal italic">
              {isFilterOpen ? t('Nhấn để thu gọn nhóm bộ lọc') : t('Nhấn để mở rộng bộ lọc')}
            </span>
          </div>
        </div>

        {isFilterOpen && (
          <DynamicQueryBar
            fields={filterFields}
            allAvailableFields={filterFields}
            values={currentValues}
            onChange={handleFieldChange}
            showSettings={false}
            disabled={false}
            columns={4}
          />
        )}
      </div>

      {/* ── PHẦN 3: THANH CHUYỂN TAB DỮ LIỆU ĐẦU VÀO & KẾT QUẢ TÍNH TOÁN ── */}
      <div className="bg-white border-b border-slate-200 flex items-center px-2 select-none h-8 w-full overflow-hidden">
        {/* 4 Tab Nạp Dữ Liệu Đầu Vào */}
        <div className="flex items-center gap-3 shrink-0">
          {inputTabs.map((tab) => {
            const status = fileStatusSummary[tab.id]
            const isSelected = activeTab === tab.id
            const hasData = status?.isUploaded && (status?.rowCount || 0) > 0

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`h-8 px-1.5 text-[11px] font-semibold transition-all relative flex items-center gap-1 whitespace-nowrap border-b-2 outline-none cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.title}</span>

                {hasData ? (
                  <span
                    className={`text-[9px] font-semibold px-1 py-0.2 rounded-full leading-tight ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-700 font-bold'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {(status.rowCount || 0).toLocaleString('vi-VN')}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 font-normal">(0)</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Vách ngăn phân cách giữa Dữ liệu Nạp và Kết quả Tính toán */}
        <div className="h-4 w-px bg-slate-300 mx-3 shrink-0" />

        {/* 2 Tab Bảng Kết Quả Tính Toán */}
        <div className="flex items-center gap-3 shrink-0">
          {resultTabs.map((tab) => {
            const status = fileStatusSummary[tab.id]
            const isSelected = activeTab === tab.id
            const hasData = status?.isUploaded && (status?.rowCount || 0) > 0

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`h-8 px-1.5 text-[11px] font-semibold transition-all relative flex items-center gap-1 whitespace-nowrap border-b-2 outline-none cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40'
                    : hasData
                      ? 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50/20'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab.title}</span>

                {hasData ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white leading-tight">
                    {(status.rowCount || 0).toLocaleString('vi-VN')}
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-600/70 font-normal italic">
                    (Chưa tính)
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── GÓC PHẢI THANH TAB: BỘ LỌC ĐANG CHẠY & NÚT CẤU HÌNH QUY TẮC ICON BÁNH RĂNG ── */}
        <div className="ml-auto flex items-center gap-2 pr-1 shrink-0 text-[11px]">
          {hasFilterActive && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-blue-700 text-[10px] font-semibold">
              <span>
                {t('Đang lọc')}: {filteredRowsCount}/{totalRowsCount} {t('dòng')}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded hover:bg-blue-100 flex items-center gap-0.5 cursor-pointer"
                title={t('Bỏ lọc / Xem tất cả')}
              >
                <RotateCcw size={10} />
                <span>{t('Bỏ lọc')}</span>
              </button>
            </div>
          )}

          {onOpenRuleConfig && (
            <button
              onClick={onOpenRuleConfig}
              className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-700 w-7 h-7 rounded transition cursor-pointer"
              title={t('Cấu hình quy tắc tính toán (giờ ca kíp, dung sai, nhãn trạng thái)')}
            >
              <Settings size={14} className="text-slate-600 hover:text-indigo-600 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
