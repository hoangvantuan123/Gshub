/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { Search, FileSpreadsheet, BookOpen, Camera, AlertTriangle, Filter } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import QuerySelectInput from '@renderer/user/components/query/core/fields/QuerySelectInput'
import QueryDateInput from '@renderer/user/components/query/core/fields/QueryDateInput'
import { useDateFormat } from '@renderer/user/hooks/useDateFormat'
import { SearchableMultiSelectDropdown } from './SearchableMultiSelectDropdown'
import dayjs from 'dayjs'

export function SummaryTopControlBar({
  factoryCode = 'GS1',
  setFactoryCode,
  factoryOptions,
  reportType = 'stat',
  reportTypeName = 'Thống kê SX',
  dateRange = ['', ''],
  handleCustomDateChange,
  selectedPreset = 'this_month',
  handleApplyPreset,
  presets = [],
  selectedTeam = [],
  setSelectedTeam,
  teamOptions = [],
  selectedMachine = [],
  setSelectedMachine,
  machineOptions = [],
  selectedPic = 'ALL',
  setSelectedPic,
  picOptions = [],
  loading = false,
  fetchData,
  handleExportExcel,
  setIsHandbookModalOpen,
  handleCaptureScreenshot,
  isCapturing = false,
  storageKey,
  defaultExpanded = true
}) {
  const { t } = useTranslation()
  const { settings } = useDateFormat()

  const parseToDateString = (val) => {
    if (!val) return ''
    if (typeof val === 'string') return val
    if (val?.format) return val.format('YYYY-MM-DD')
    return String(val)
  }

  const finalStorageKey = `report_filter_state_${storageKey || `summary_${reportType}`}`

  // Trạng thái mở/đóng bộ lọc đổ xuống bên dưới (lưu nhớ theo từng form)
  const [showFilter, setShowFilter] = useState(() => {
    try {
      const saved = localStorage.getItem(finalStorageKey)
      return saved !== null ? saved === 'true' : defaultExpanded
    } catch {
      return defaultExpanded
    }
  })

  const toggleFilter = () => {
    setShowFilter((prev) => {
      const next = !prev
      try {
        localStorage.setItem(finalStorageKey, String(next))
      } catch (e) {
        console.warn('Lỗi lưu trạng thái bộ lọc:', e)
      }
      return next
    })
  }

  const selectedTeamValues = useMemo(() => {
    if (!selectedTeam || selectedTeam === 'ALL') return []
    return Array.isArray(selectedTeam) ? selectedTeam : [selectedTeam]
  }, [selectedTeam])

  const selectedMachineValues = useMemo(() => {
    if (!selectedMachine || selectedMachine === 'ALL') return []
    return Array.isArray(selectedMachine) ? selectedMachine : [selectedMachine]
  }, [selectedMachine])

  // Theo dõi điều kiện đã áp dụng ở lần tìm kiếm gần nhất
  const teamKey = selectedTeamValues.slice().sort().join(',')
  const machineKey = selectedMachineValues.slice().sort().join(',')
  const currentKey = `${factoryCode}|${teamKey}|${machineKey}|${selectedPic || ''}|${dateRange?.[0] || ''}|${dateRange?.[1] || ''}`
  const [appliedKey, setAppliedKey] = useState(currentKey)
  const isDirty = currentKey !== appliedKey

  // Nhãn phạm vi ngày theo loại báo cáo
  const rangePrefix = reportType === 'plan' ? 'Kế hoạch' : 'Thống kê'

  const handleSearch = () => {
    if (!fetchData || loading) return
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning(t('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc'))
      return
    }
    setAppliedKey(currentKey)
    fetchData()
  }

  const handleOpenHandbook = () => {
    try {
      openChildWindow({
        path: `/sub/report/handbook/formula?type=${reportType}`,
        title: `Cẩm nang công thức & Từ điển dữ liệu ${reportTypeName}`,
        width: 1250,
        height: 850,
        id: 'report-formula-handbook-window'
      })
    } catch (e) {
      console.warn('Lỗi mở window con cẩm nang, fallback sang modal:', e)
      if (setIsHandbookModalOpen) {
        setIsHandbookModalOpen(true)
      }
    }
  }

  const factories = factoryOptions || [
    { value: 'GS1', label: 'GS1 Hà Nội (Bao bì cao cấp)' },
    { value: 'GS5', label: 'GS5 Quế Võ 1B (Carton & Sóng)' }
  ]

  const formattedTeamOptions = useMemo(() => {
    if (!teamOptions || teamOptions.length === 0) return []
    return teamOptions
      .filter((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt
        return val !== 'ALL' && val !== ''
      })
      .map((item) => {
        if (typeof item === 'object') {
          return {
            value: item.value,
            label: item.label || item.value,
            searchKey: `${item.value} ${item.label || ''}`
          }
        }
        return {
          value: item,
          label: item,
          searchKey: item
        }
      })
  }, [teamOptions])

  const formattedMachineOptions = useMemo(() => {
    if (!machineOptions || machineOptions.length === 0) return []
    return machineOptions
      .filter((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt
        return val !== 'ALL' && val !== ''
      })
      .map((item) => {
        if (typeof item === 'object') {
          const code = item.machineCode || item.value
          const name = item.machineName || ''
          const hasDiffName = name && name !== code
          const label = item.label || (hasDiffName ? `${code} - ${name}` : code)
          return {
            value: item.value,
            label,
            machineCode: code,
            machineName: name,
            searchKey: item.searchKey || `${code} ${name} ${label}`
          }
        }
        return {
          value: item,
          label: item,
          machineCode: item,
          machineName: '',
          searchKey: item
        }
      })
  }, [machineOptions])

  // Tính toán danh sách và số lượng bộ lọc đang được áp dụng (kiểu GitHub)
  const activeFilterList = useMemo(() => {
    const list = []
    if (factoryCode) {
      const fLabel = factories.find((f) => f.value === factoryCode)?.label || factoryCode
      list.push({ key: 'factory', label: t('Nhà máy'), value: fLabel.split(' ')[0] || fLabel })
    }
    if (dateRange?.[0] || dateRange?.[1]) {
      const fromStr = dateRange[0] ? dayjs(dateRange[0]).format('DD/MM/YYYY') : '...'
      const toStr = dateRange[1] ? dayjs(dateRange[1]).format('DD/MM/YYYY') : '...'
      list.push({ key: 'date', label: t('Thời gian'), value: `${fromStr} → ${toStr}` })
    }
    if (reportType !== 'plan' && selectedTeamValues.length > 0) {
      const val =
        selectedTeamValues.length === 1
          ? selectedTeamValues[0]
          : `${selectedTeamValues[0]} (+${selectedTeamValues.length - 1})`
      list.push({ key: 'team', label: t('Tổ SX'), value: val })
    }
    if (reportType !== 'plan' && selectedMachineValues.length > 0) {
      const val =
        selectedMachineValues.length === 1
          ? selectedMachineValues[0]
          : `${selectedMachineValues[0]} (+${selectedMachineValues.length - 1})`
      list.push({ key: 'machine', label: t('Máy SX'), value: val })
    }
    if (selectedPic && selectedPic !== 'ALL') {
      list.push({ key: 'pic', label: t('PIC'), value: selectedPic })
    }
    return list
  }, [
    reportType,
    factoryCode,
    dateRange,
    selectedTeamValues,
    selectedMachineValues,
    selectedPic,
    factories,
    t
  ])

  const activeFilterCount = activeFilterList.length

  return (
    <div className="report-interactive-toolbar screenshot-hide w-full bg-white border-b border-slate-200 mb-4">
      <style>{`
        .query-date-has-value .ant-picker-input > input {
          color: #1d4ed8 !important;
          font-weight: 600 !important;
        }
        .query-date-empty .ant-picker-input > input {
          color: #334155 !important;
        }
        .ant-picker {
          padding: 0 !important;
          border-radius: 0 !important;
        }
      `}</style>

      {/* TẦNG 1: THANH ACTION TOOLBAR CHÍNH */}
      <div className="w-full px-3 py-1.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Nhóm nút tác vụ bên trái: BỘ LỌC */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nút Action BỘ LỌC (Ghost button thuần túy: không bg, không viền) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFilter}
            className={`uppercase text-[11px] font-semibold gap-1.5 transition-colors ${
              showFilter || activeFilterCount > 0
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Bấm để đóng/mở khung bộ lọc đổ xuống phía dưới"
          >
            <Filter
              size={13}
              className={activeFilterCount > 0 || showFilter ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showFilter ? t('ĐÓNG BỘ LỌC') : t('BỘ LỌC')}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9.5px] font-mono font-bold bg-blue-600 text-white rounded-none leading-none shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* NÚT TÌM KIẾM (Ghost button thuần túy: không bg, không viền) */}
          {fetchData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearch}
              disabled={loading}
              className="uppercase text-[11px] font-semibold gap-1.5 text-blue-700 hover:text-blue-800 transition-colors"
              title="Tìm kiếm / Cập nhật dữ liệu báo cáo (Enter)"
            >
              <Search size={13} className="text-blue-600" />
              <span>{loading ? t('ĐANG TẢI...') : t('TÌM KIẾM')}</span>
            </Button>
          )}

          {/* Thông báo điều kiện đã đổi (chỉ text + icon, KHÔNG background, KHÔNG border) */}
          {isDirty && !loading && (
            <div
              className="flex items-center gap-1.5 px-2 text-[11px] font-medium text-amber-600 select-none cursor-pointer hover:text-amber-700 transition-colors"
              onClick={handleSearch}
              title="Bấm để tải lại dữ liệu với điều kiện mới"
              role="status"
            >
              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
              <span>
                {t('Điều kiện đã đổi — bấm')} <b className="underline font-semibold">{t('TÌM KIẾM')}</b> {t('để cập nhật')}
              </span>
            </div>
          )}
        </div>

        {/* Nhóm nút tác vụ chuẩn ERP bên phải */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenHandbook}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title={`Mở cẩm nang công thức & từ điển dữ liệu ${reportTypeName} trong cửa sổ mới`}
          >
            <BookOpen size={13} className="text-emerald-600" />
            <span>{t('CẨM NANG')}</span>
          </Button>

          {handleExportExcel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportExcel}
              className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
              title="Xuất file Excel báo cáo"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>{t('XUẤT EXCEL')}</span>
            </Button>
          )}

          {handleCaptureScreenshot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCaptureScreenshot}
              disabled={isCapturing}
              className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800"
              title="Chụp ảnh toàn bộ báo cáo để xuất file PNG"
            >
              <Camera size={13} className="text-indigo-600" />
              <span>{isCapturing ? t('ĐANG CHỤP...') : t('TẢI ẢNH BÁO CÁO')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* TẦNG 2: KHUNG Ô LỌC ĐIỀU KIỆN (PHONG CÁCH FLOATING SEGMENTED BAR - MỀM MẠI, HIỆN ĐẠI) */}
      {showFilter && (
        <div className="w-full bg-slate-100/75 border-t border-slate-200 px-3 py-2.5 flex flex-col gap-2">
          {/* Tiêu đề & Xóa lọc dạng text tinh gọn */}
          <div className="w-full flex items-center justify-between gap-2 flex-wrap text-xs select-none">
            <div className="flex items-center gap-1.5 text-[10px] italic text-indigo-600 font-bold uppercase py-0.5">
              <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
              <span>{t('Điều kiện lọc dữ liệu')}</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-normal text-slate-500 lowercase not-italic ml-1">
                  ({activeFilterCount} điều kiện đang bật)
                </span>
              )}
            </div>

            {/* Nút Xóa nhanh bộ lọc */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFactoryCode && setFactoryCode('GS1')
                  if (handleApplyPreset) {
                    handleApplyPreset('this_month')
                  } else if (handleCustomDateChange) {
                    handleCustomDateChange('', '')
                  }
                  setSelectedTeam && setSelectedTeam([])
                  setSelectedMachine && setSelectedMachine([])
                  setSelectedPic && setSelectedPic('ALL')
                }}
                className="text-[10.5px] font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer shrink-0 transition-colors"
                title="Khôi phục tất cả bộ lọc về mặc định"
              >
                {t('Xóa bộ lọc')}
              </button>
            )}
          </div>

          {/* Danh sách các khối lọc dạng Floating Card bo tròn mềm mại */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Khối 1: Nhà máy */}
            <div className="inline-flex items-center bg-white rounded-md border border-slate-200/90 shadow-2xs h-[30px] px-1 hover:border-slate-300 transition-colors">
              <span className="text-[11px] font-semibold text-slate-500 px-2 select-none whitespace-nowrap">
                {t('Nhà máy')}
              </span>
              <span className="w-px h-3.5 bg-slate-200 shrink-0" />
              <div className="px-1.5 flex items-center h-full min-w-[170px]">
                <QuerySelectInput
                  field={{
                    key: 'factoryCode',
                    options: factories,
                    label: 'Nhà máy'
                  }}
                  value={factoryCode || 'GS1'}
                  onChange={(_, val) => setFactoryCode && setFactoryCode(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Khối 2: Khoảng ngày thống kê/kế hoạch + Chọn nhanh Preset */}
            <div className="inline-flex items-center bg-white rounded-md border border-slate-200/90 shadow-2xs h-[30px] px-1 hover:border-slate-300 transition-colors">
              {presets && presets.length > 0 && (
                <>
                  <div className="px-1 flex items-center h-full min-w-[105px]">
                    <QuerySelectInput
                      field={{
                        key: 'preset',
                        options: [
                          ...presets.map((p) => ({ value: p.key, label: p.label })),
                          { value: 'custom', label: t('Tùy chỉnh') }
                        ],
                        label: 'Mốc thời gian'
                      }}
                      value={selectedPreset || 'custom'}
                      onChange={(_, val) => {
                        if (val && val !== 'custom' && handleApplyPreset) {
                          handleApplyPreset(val)
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                  <span className="w-px h-3.5 bg-slate-200 shrink-0" />
                </>
              )}
              <span
                className="text-[11px] font-semibold text-slate-600 px-1.5 select-none whitespace-nowrap"
                title={`Ngày đăng ký / áp dụng bắt đầu của đợt báo cáo (Bắt buộc)`}
              >
                {t('Ngày đăng ký từ')} <span className="text-rose-500 font-bold">*</span>
              </span>
              <div className={`px-1 flex items-center h-full min-w-[115px] ${!dateRange?.[0] ? 'ring-1 ring-rose-400 rounded-xs' : ''}`}>
                <QueryDateInput
                  field={{
                    key: 'fromDate',
                    placeholder: 'DD/MM/YYYY',
                    format: 'DD/MM/YYYY'
                  }}
                  value={dateRange?.[0] || ''}
                  onChange={(_, val) => {
                    const str = parseToDateString(val)
                    handleCustomDateChange && handleCustomDateChange(str, dateRange?.[1] || str)
                  }}
                  parseDate={(v) => (v ? (dayjs.isDayjs(v) ? v : dayjs(v)) : null)}
                  settings={settings}
                  disabled={loading}
                  hasValue={Boolean(dateRange?.[0])}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-400 px-1 select-none">→</span>
              <span
                className="text-[11px] font-semibold text-slate-600 px-1 select-none whitespace-nowrap"
                title={`Ngày đăng ký / áp dụng kết thúc của đợt báo cáo (Bắt buộc)`}
              >
                {t('đến')} <span className="text-rose-500 font-bold">*</span>
              </span>
              <div className={`px-1 flex items-center h-full min-w-[115px] ${!dateRange?.[1] ? 'ring-1 ring-rose-400 rounded-xs' : ''}`}>
                <QueryDateInput
                  field={{
                    key: 'toDate',
                    placeholder: 'DD/MM/YYYY',
                    format: 'DD/MM/YYYY'
                  }}
                  value={dateRange?.[1] || ''}
                  onChange={(_, val) => {
                    const str = parseToDateString(val)
                    handleCustomDateChange && handleCustomDateChange(dateRange?.[0] || str, str)
                  }}
                  parseDate={(v) => (v ? (dayjs.isDayjs(v) ? v : dayjs(v)) : null)}
                  settings={settings}
                  disabled={loading}
                  hasValue={Boolean(dateRange?.[1])}
                />
              </div>
            </div>

            {/* Khối 3: Tổ sản xuất (Chỉ hiển thị khi không phải báo cáo kế hoạch) */}
            {reportType !== 'plan' && formattedTeamOptions && formattedTeamOptions.length > 0 && (
              <div className="inline-flex items-center bg-white rounded-md border border-slate-200/90 shadow-2xs h-[30px] px-1 hover:border-slate-300 transition-colors">
                <span className="text-[11px] font-semibold text-slate-500 px-2 select-none whitespace-nowrap">
                  {t('Tổ sản xuất')}
                </span>
                <span className="w-px h-3.5 bg-slate-200 shrink-0" />
                <div className="px-1 flex items-center h-full">
                  <SearchableMultiSelectDropdown
                    label="Tổ sản xuất"
                    placeholder={t('Tất cả tổ SX')}
                    options={formattedTeamOptions}
                    value={selectedTeamValues}
                    onChange={(vals) => setSelectedTeam && setSelectedTeam(vals)}
                    disabled={loading}
                    minWidth="140px"
                    maxWidth="220px"
                    dropdownWidth="280px"
                    renderItem={(opt) => (
                      <span className="text-[11.5px] font-medium text-slate-800 truncate block">
                        {opt.label || opt.value}
                      </span>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Khối 4: Máy sản xuất (Chỉ hiển thị khi không phải báo cáo kế hoạch) */}
            {reportType !== 'plan' &&
              formattedMachineOptions &&
              formattedMachineOptions.length > 0 && (
                <div className="inline-flex items-center bg-white rounded-md border border-slate-200/90 shadow-2xs h-[30px] px-1 hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 px-2 select-none whitespace-nowrap">
                    {t('Máy sản xuất')}
                  </span>
                  <span className="w-px h-3.5 bg-slate-200 shrink-0" />
                  <div className="px-1 flex items-center h-full">
                    <SearchableMultiSelectDropdown
                      label="Máy sản xuất"
                      placeholder={t('Tất cả máy SX')}
                      options={formattedMachineOptions}
                      value={selectedMachineValues}
                      onChange={(vals) => setSelectedMachine && setSelectedMachine(vals)}
                      disabled={loading}
                      minWidth="160px"
                      maxWidth="260px"
                      dropdownWidth="360px"
                      renderItem={(opt) => (
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-semibold text-slate-800 font-mono text-[11.5px] shrink-0">
                            {opt.machineCode || opt.value}
                          </span>
                          {opt.machineName && opt.machineName !== opt.machineCode && (
                            <span className="text-[11px] text-slate-500 truncate text-right font-sans">
                              {opt.machineName}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}

            {/* Khối 5: PIC Điều phối (nếu có) */}
            {picOptions && picOptions.length > 0 && (
              <div className="inline-flex items-center bg-white rounded-md border border-slate-200/90 shadow-2xs h-[30px] px-1 hover:border-slate-300 transition-colors">
                <span className="text-[11px] font-semibold text-slate-500 px-2 select-none whitespace-nowrap">
                  {t('PIC Điều phối')}
                </span>
                <span className="w-px h-3.5 bg-slate-200 shrink-0" />
                <div className="px-1.5 flex items-center h-full min-w-[150px]">
                  <QuerySelectInput
                    field={{
                      key: 'selectedPic',
                      options: [
                        { value: 'ALL', label: `Tất cả PIC (${picOptions.length})` },
                        ...picOptions.map((p) => ({ value: p, label: `PIC: ${p}` }))
                      ],
                      label: 'PIC Điều phối'
                    }}
                    value={selectedPic || 'ALL'}
                    onChange={(_, val) => setSelectedPic && setSelectedPic(val)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default SummaryTopControlBar
