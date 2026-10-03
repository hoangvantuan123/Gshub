/* eslint-disable react/prop-types */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  FileSpreadsheet,
  BookOpen,
  Camera,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import QuerySelectInput from '@renderer/user/components/query/core/fields/QuerySelectInput'
import QueryDateInput from '@renderer/user/components/query/core/fields/QueryDateInput'
import { useDateFormat } from '@renderer/user/hooks/useDateFormat'
import dayjs from 'dayjs'

export function TopControlBar({
  factoryCode = 'GS1',
  setFactoryCode,
  factoryOptions,
  reportType = 'stat',
  setReportType,
  dateRange = ['', ''],
  handleCustomDateChange,
  loading = false,
  fetchTimelineData,
  handleExportExcel,
  setIsHandbookModalOpen,
  handleCaptureScreenshot,
  isCapturing = false
}) {
  const { t } = useTranslation()
  const { settings } = useDateFormat()

  // Theo dõi điều kiện đã áp dụng ở lần tìm kiếm gần nhất (lần đầu = điều kiện mặc định khi mở trang)
  const currentKey = `${factoryCode}|${reportType}|${dateRange?.[0] || ''}|${dateRange?.[1] || ''}`
  const [appliedKey, setAppliedKey] = useState(currentKey)
  const isDirty = currentKey !== appliedKey

  // Nhãn phạm vi ngày theo loại báo cáo đang chọn
  const rangePrefix = reportType === 'plan' ? 'Kế hoạch' : 'Thống kê'

  const handleSearch = () => {
    if (!fetchTimelineData || loading) return
    setAppliedKey(currentKey)
    fetchTimelineData()
  }

  const handleOpenHandbook = () => {
    try {
      openChildWindow({
        path: `/sub/report/handbook/formula?type=${reportType || 'stat'}`,
        title: 'Cẩm nang công thức & Từ điển dữ liệu Báo cáo Sản xuất',
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

  return (
    <div className="report-interactive-toolbar screenshot-hide w-full bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-3 flex-wrap mb-4">
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

      {/* 1. Khối ô lọc điều kiện chuẩn ERP (dùng QuerySelectInput & QueryDateInput chuẩn hệ thống) */}
      <div className="inline-flex items-center border border-slate-300 bg-white divide-x divide-slate-300 shadow-sm flex-wrap">
        {/* Nhà máy */}
        <div className="flex items-center h-[28px]">
          <div className="bg-slate-100 border-r border-slate-300 h-full flex items-center px-2.5 font-semibold text-[11px] text-slate-700 select-none whitespace-nowrap">
            {t('Nhà máy')}
          </div>
          <div className="px-2 flex items-center h-full" style={{ minWidth: 180 }}>
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

        {/* Loại báo cáo (nếu có) */}
        {setReportType && (
          <div className="flex items-center h-[28px]">
            <div className="bg-slate-100 border-r border-slate-300 h-full flex items-center px-2.5 font-semibold text-[11px] text-slate-700 select-none whitespace-nowrap">
              {t('Loại báo cáo')}
            </div>
            <div className="px-2 flex items-center h-full" style={{ minWidth: 175 }}>
              <QuerySelectInput
                field={{
                  key: 'reportType',
                  options: [
                    { value: 'stat', label: 'Thống kê sản xuất (TKSX)' },
                    { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' }
                  ],
                  label: 'Loại báo cáo'
                }}
                value={reportType || 'stat'}
                onChange={(_, val) => setReportType && setReportType(val)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Phạm vi thống kê: từ ngày */}
        <div className="flex items-center h-[28px]">
          <div
            className="bg-slate-100 border-r border-slate-300 h-full flex items-center px-2.5 font-semibold text-[11px] text-slate-700 select-none whitespace-nowrap"
            title={`Ngày bắt đầu của phạm vi dữ liệu ${rangePrefix.toLowerCase()}`}
          >
            {t(`${rangePrefix} từ ngày`)}
          </div>
          <div className="px-2 flex items-center h-full" style={{ minWidth: 125 }}>
            <QueryDateInput
              field={{
                key: 'fromDate',
                placeholder: 'DD/MM/YYYY',
                format: 'DD/MM/YYYY'
              }}
              value={dateRange?.[0] ? dayjs(dateRange[0]) : null}
              onChange={(_, d) => {
                const str = d ? d.format('YYYY-MM-DD') : ''
                handleCustomDateChange && handleCustomDateChange(str, dateRange?.[1] || str)
              }}
              parseDate={(v) => (v ? dayjs(v) : null)}
              settings={settings}
              disabled={loading}
              hasValue={Boolean(dateRange?.[0])}
            />
          </div>
        </div>

        {/* Phạm vi thống kê: đến ngày */}
        <div className="flex items-center h-[28px]">
          <div
            className="bg-slate-100 border-r border-slate-300 h-full flex items-center px-2.5 font-semibold text-[11px] text-slate-700 select-none whitespace-nowrap"
            title={`Ngày kết thúc của phạm vi dữ liệu ${rangePrefix.toLowerCase()}`}
          >
            {t(`${rangePrefix} đến ngày`)}
          </div>
          <div className="px-2 flex items-center h-full" style={{ minWidth: 125 }}>
            <QueryDateInput
              field={{
                key: 'toDate',
                placeholder: 'DD/MM/YYYY',
                format: 'DD/MM/YYYY'
              }}
              value={dateRange?.[1] ? dayjs(dateRange[1]) : null}
              onChange={(_, d) => {
                const str = d ? d.format('YYYY-MM-DD') : ''
                handleCustomDateChange && handleCustomDateChange(dateRange?.[0] || str, str)
              }}
              parseDate={(v) => (v ? dayjs(v) : null)}
              settings={settings}
              disabled={loading}
              hasValue={Boolean(dateRange?.[1])}
            />
          </div>
        </div>
      </div>

      {/* Cảnh báo: điều kiện lọc đã đổi nhưng chưa bấm Tìm kiếm */}
      {isDirty && !loading && (
        <div
          className="flex items-center gap-1.5 h-[28px] px-2.5 border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold select-none"
          role="status"
        >
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span>
            Điều kiện lọc đã thay đổi — bấm <b>TÌM KIẾM</b> để cập nhật báo cáo
          </span>
        </div>
      )}

      {/* 2. Khối nút tác vụ chuẩn ERP bên phải */}
      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
        {fetchTimelineData && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearch}
            disabled={loading}
            className={`uppercase text-[11px] font-semibold text-blue-700 hover:text-blue-800 ${
              isDirty && !loading ? 'bg-amber-50 ring-1 ring-amber-400 animate-pulse' : ''
            }`}
            title="Tìm kiếm dữ liệu báo cáo (Enter)"
          >
            <Search size={13} className="text-blue-500" />
            {loading ? t('ĐANG TẢI...') : t('TÌM KIẾM')}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenHandbook}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          title="Mở cẩm nang công thức & từ điển dữ liệu trong cửa sổ mới"
        >
          <BookOpen size={13} className="text-emerald-600" />
          <span>{t('CẨM NANG')}</span>
          <ExternalLink size={11} className="text-slate-400 ml-0.5" />
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
            {t('XUẤT EXCEL')}
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
            {isCapturing ? t('ĐANG CHỤP...') : t('TẢI ẢNH BÁO CÁO')}
          </Button>
        )}
      </div>
    </div>
  )
}

export default TopControlBar
