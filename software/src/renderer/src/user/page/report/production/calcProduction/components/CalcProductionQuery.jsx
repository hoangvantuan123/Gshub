/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Search, RotateCcw } from 'lucide-react'
import DynamicQueryBar from '@renderer/user/components/query/core/DynamicQueryBar'
import { TAB_DEFINITIONS } from '../constants/calcConstants'

export default function CalcProductionQuery({
  activeTab,
  onSelectTab,
  masterInfo = {},
  onChangeMasterInfo,
  fileStatusSummary = {},
  searchText = '',
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  totalRowsCount = 0,
  filteredRowsCount = 0,
  disabled = false
}) {
  const { t } = useTranslation()

  // 1. Cấu hình 4 trường thông tin Master Đăng ký
  const masterFields = useMemo(
    () => [
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
        key: 'Remark',
        label: t('Ghi chú / Mô tả'),
        type: 'text',
        placeholder: 'Nhập ghi chú cho đợt tính toán...',
        colSpan: 1
      }
    ],
    [t]
  )

  // 2. Cấu hình các trường Tìm kiếm & Bộ lọc dữ liệu bảng
  const filterFields = useMemo(
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
          { value: 'SX sai ngày KH', label: t('SX sai ngày KH') }
        ],
        colSpan: 2
      }
    ],
    [t]
  )

  const currentValues = useMemo(() => {
    return {
      RegCode: masterInfo.regCode || '',
      FactoryName: masterInfo.factoryName || 'GS1 Hà Nội',
      ApplyDate: masterInfo.applyDate || '',
      Remark: masterInfo.remark || '',
      SearchText: searchText || '',
      StatusFilter: statusFilter || 'ALL'
    }
  }, [masterInfo, searchText, statusFilter])

  const handleFieldChange = (key, value) => {
    if (key === 'SearchText') {
      setSearchText && setSearchText(value)
      return
    }
    if (key === 'StatusFilter') {
      setStatusFilter && setStatusFilter(value)
      return
    }
    const keyMap = {
      RegCode: 'regCode',
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
  }

  // 4 Tab nạp dữ liệu đầu vào & 2 Tab kết quả tính toán
  const inputTabs = useMemo(() => TAB_DEFINITIONS.filter((t) => !t.isResultTab), [])
  const resultTabs = useMemo(() => TAB_DEFINITIONS.filter((t) => t.isResultTab), [])

  const hasFilterActive = Boolean(
    (searchText && searchText.trim()) || (statusFilter && statusFilter !== 'ALL')
  )

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* ── PHẦN 1: THÔNG TIN ĐĂNG KÝ MASTER BÁO CÁO ── */}
      <div className="bg-slate-50/80 px-2 py-0.5 border-b border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
          <ClipboardList size={12} className="text-indigo-600 shrink-0" />
          <span>{t('1. THÔNG TIN ĐĂNG KÝ MASTER')}</span>
        </div>
        <span className="text-[9px] text-slate-500 font-normal italic">
          {t('Áp dụng chu kỳ tính toán 24h & lưu trữ đăng ký CSDL')}
        </span>
      </div>

      <DynamicQueryBar
        fields={masterFields}
        allAvailableFields={masterFields}
        values={currentValues}
        onChange={handleFieldChange}
        showSettings={false}
        disabled={disabled}
        columns={4}
      />

      {/* ── PHẦN 2: BỘ LỌC VÀ TÌM KIẾM DỮ LIỆU BẢNG ── */}
      <div className="bg-slate-50/80 px-2 py-0.5 border-t border-b border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
          <Search size={12} className="text-blue-600 shrink-0" />
          <span>{t('2. BỘ LỌC & TÌM KIẾM DỮ LIỆU THEO TAB')}</span>
        </div>
        <span className="text-[9px] text-slate-500 font-normal italic">
          {t('Tra cứu tức thì trên các cột của tab dữ liệu hiện tại')}
        </span>
      </div>

      <DynamicQueryBar
        fields={filterFields}
        allAvailableFields={filterFields}
        values={currentValues}
        onChange={handleFieldChange}
        showSettings={false}
        disabled={disabled}
        columns={4}
      />

      {/* ── PHẦN 3: THANH CHUYỂN TAB DỮ LIỆU ĐẦU VÀO & KẾT QUẢ TÍNH TOÁN ── */}
      <div className="flex items-center px-2 border-t border-b border-slate-200 bg-white select-none h-8 w-full overflow-hidden">
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
                className={`h-8 px-1.5 text-[11px] font-semibold transition-all relative flex items-center gap-1 whitespace-nowrap border-b-2 outline-none ${
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
                className={`h-8 px-1.5 text-[11px] font-semibold transition-all relative flex items-center gap-1 whitespace-nowrap border-b-2 outline-none ${
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

        {/* ── CHỈ SỐ LỌC DỮ LIỆU HIỆN TẠI (GÓC PHẢI THANH TAB) ── */}
        <div className="ml-auto flex items-center gap-2 pr-1 shrink-0 text-[11px]">
          {hasFilterActive ? (
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
          ) : (
            <span className="text-slate-400 text-[10px]">
              {t('Hiển thị')}: {(totalRowsCount || 0).toLocaleString('vi-VN')} {t('dòng')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
