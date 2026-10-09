/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '@renderer/user/components/query/core/DynamicQueryBar'
import { TAB_DEFINITIONS } from '../constants/calcConstants'

export default function CalcProductionQuery({
  activeTab,
  onSelectTab,
  masterInfo = {},
  onChangeMasterInfo,
  fileStatusSummary = {},
  calcResults = null,
  disabled = false
}) {
  const { t } = useTranslation()

  // Cấu hình các trường tìm kiếm / đăng ký Master chuẩn DynamicQueryBar
  const allAvailableFields = useMemo(
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
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' }
        ],
        colSpan: 1
      },
      {
        key: 'ApplyDate',
        label: t('Ngày báo cáo *'),
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

  const currentValues = useMemo(() => {
    return {
      RegCode: masterInfo.regCode || '',
      FactoryName: masterInfo.factoryName || 'GS1 Hà Nội',
      ApplyDate: masterInfo.applyDate || '',
      Remark: masterInfo.remark || ''
    }
  }, [masterInfo])

  const handleFieldChange = (key, value) => {
    const keyMap = {
      RegCode: 'regCode',
      FactoryName: 'factoryName',
      ApplyDate: 'applyDate',
      Remark: 'remark'
    }
    const targetKey = keyMap[key] || key
    onChangeMasterInfo && onChangeMasterInfo(targetKey, value)
  }

  return (
    <div className="w-full bg-white">
      {/* 1. KHỐI FORM MASTER ĐĂNG KÝ CHUẨN DYNAMICQUERYBAR CỦA HỆ THỐNG */}
      <DynamicQueryBar
        fields={allAvailableFields}
        allAvailableFields={allAvailableFields}
        values={currentValues}
        onChange={handleFieldChange}
        showSettings={false}
        disabled={disabled}
        columns={4}
      />

      {/* 2. THANH TAB DẠNG GẠCH CHÂN (UNDERLINE TABS) */}
      <div className="flex items-center gap-4 px-2 border-b border-slate-200 bg-white overflow-x-auto">
        {TAB_DEFINITIONS.map((tab) => {
          const status = fileStatusSummary[tab.id]
          const isSelected = activeTab === tab.id
          const hasData = status?.isUploaded
          const isResultTab = Boolean(tab.isResultTab)

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`py-1.5 px-2 text-[11px] font-bold uppercase transition-all relative flex items-center gap-1.5 whitespace-nowrap border-b-2 outline-none ${
                isSelected
                  ? isResultTab
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
                    : 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                  : isResultTab
                    ? 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.title}</span>

              {hasData ? (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                    isResultTab
                      ? 'bg-emerald-600 text-white font-bold'
                      : isSelected
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {status.rowCount.toLocaleString('vi-VN')} dòng
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 font-normal">
                  {isResultTab ? '(Chưa tính)' : '(Trống)'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
