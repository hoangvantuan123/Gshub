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

      {/* 2. THANH 4 TAB DẠNG GẠCH CHÂN (UNDERLINE TABS) */}
      <div className="flex items-center gap-6 px-3 border-b border-slate-200 bg-white overflow-x-auto">
        {TAB_DEFINITIONS.map((tab) => {
          const status = fileStatusSummary[tab.id]
          const isSelected = activeTab === tab.id
          const hasData = status?.isUploaded

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`py-2 px-1 text-xs font-bold uppercase transition-all relative flex items-center gap-1.5 whitespace-nowrap border-b-2 outline-none ${
                isSelected
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.title}</span>

              {hasData ? (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {status.rowCount.toLocaleString('vi-VN')} dòng
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">(Trống)</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 3. HIỂN THỊ KPI TÓM TẮT KHI ĐÃ CÓ KẾT QUẢ TÍNH TOÁN */}
      {calcResults && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                SL Kế Hoạch (KHSX)
              </div>
              <div className="text-sm font-extrabold text-emerald-800 mt-0.5">
                {(calcResults.summary?.plannedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                SL Thực Tế (TKSX)
              </div>
              <div className="text-sm font-extrabold text-blue-800 mt-0.5">
                {(calcResults.summary?.producedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Tỷ Lệ Hoàn Thành</div>
              <div className="text-sm font-extrabold text-indigo-800 mt-0.5">
                {calcResults.summary?.completionRate || 0}%
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">SL Đạt Chuẩn</div>
              <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                {(calcResults.summary?.qualifiedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Phế Phẩm / Lỗi</div>
              <div className="text-sm font-extrabold text-red-600 mt-0.5">
                {(calcResults.summary?.defectQty || 0).toLocaleString('vi-VN')} (
                {calcResults.summary?.defectRate || 0}%)
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Lệnh Chưa Xong</div>
              <div className="text-sm font-extrabold text-amber-600 mt-0.5">
                {(calcResults.summary?.unfinishedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
