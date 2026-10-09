/* eslint-disable react/prop-types */
import { useTranslation } from 'react-i18next'
import { Select, Input } from 'antd'
import DynamicQueryBar from '@renderer/user/components/query/core/DynamicQueryBar'

export default function CalcMasterQueryFilters({ filters, onChangeFilter, onEnterQuery }) {
  const { t } = useTranslation()

  return (
    <div className="w-full">
      <DynamicQueryBar defaultColCount={4}>
        {/* Từ ngày */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-20">
            {t('Từ ngày')}:
          </label>
          <Input
            type="date"
            size="small"
            value={filters.fromDate}
            onChange={(e) => onChangeFilter('fromDate', e.target.value)}
            className="w-full text-xs h-7"
          />
        </div>

        {/* Đến ngày */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-20">
            {t('Đến ngày')}:
          </label>
          <Input
            type="date"
            size="small"
            value={filters.toDate}
            onChange={(e) => onChangeFilter('toDate', e.target.value)}
            className="w-full text-xs h-7"
          />
        </div>

        {/* Nhà máy */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-20">
            {t('Nhà máy')}:
          </label>
          <Select
            value={filters.factory}
            onChange={(val) => onChangeFilter('factory', val)}
            className="w-full text-xs h-7"
            size="small"
            options={[
              { value: 'Tất cả', label: 'Tất cả nhà máy' },
              { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
              { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' },
              { value: 'GS5 Quế Võ 2', label: 'GS5 Quế Võ 2' }
            ]}
          />
        </div>

        {/* Mã đăng ký */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-24">
            {t('Mã đăng ký')}:
          </label>
          <Input
            size="small"
            placeholder={t('REG-CALC-...')}
            value={filters.regCode}
            onChange={(e) => onChangeFilter('regCode', e.target.value)}
            onPressEnter={onEnterQuery}
            className="w-full text-xs h-7"
            allowClear
          />
        </div>

        {/* Trạng thái */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-20">
            {t('Trạng thái')}:
          </label>
          <Select
            value={filters.status}
            onChange={(val) => onChangeFilter('status', val)}
            className="w-full text-xs h-7"
            size="small"
            options={[
              { value: 'Tất cả', label: 'Tất cả trạng thái' },
              { value: 'REGISTERED', label: 'Đã đăng ký (REGISTERED)' },
              { value: 'CALCULATED', label: 'Đã tính toán (CALCULATED)' }
            ]}
          />
        </div>

        {/* Ghi chú / Từ khóa */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0 w-20">
            {t('Ghi chú')}:
          </label>
          <Input
            size="small"
            placeholder={t('Tìm theo ghi chú...')}
            value={filters.keyword}
            onChange={(e) => onChangeFilter('keyword', e.target.value)}
            onPressEnter={onEnterQuery}
            className="w-full text-xs h-7"
            allowClear
          />
        </div>
      </DynamicQueryBar>
    </div>
  )
}
