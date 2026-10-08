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

      {/* 3. HIỂN THỊ KPI TÓM TẮT KHI ĐÃ CÓ KẾT QUẢ TÍNH TOÁN */}
      {calcResults && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Tổng SL Sản Xuất</div>
              <div className="text-sm font-extrabold text-blue-800 mt-0.5">
                {(calcResults.stat?.totalProducedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">SL Đạt Chuẩn</div>
              <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                {(calcResults.stat?.totalQualifiedQty || 0).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Phế Phẩm / Lỗi</div>
              <div className="text-sm font-extrabold text-red-600 mt-0.5">
                {(calcResults.stat?.totalDefectQty || 0).toLocaleString('vi-VN')} (
                {calcResults.stat?.defectRate || 0}%)
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Trong Kế Hoạch</div>
              <div className="text-sm font-extrabold text-emerald-800 mt-0.5">
                {(calcResults.stat?.insidePlanCount || 0).toLocaleString('vi-VN')} lệnh
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Ngoài Kế Hoạch</div>
              <div className="text-sm font-extrabold text-amber-600 mt-0.5">
                {(calcResults.stat?.outsidePlanCount || 0).toLocaleString('vi-VN')} lệnh
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Nguồn MES / Bravo</div>
              <div className="text-sm font-extrabold text-indigo-700 mt-0.5">
                {calcResults.stat?.mesUserCount || 0} / {calcResults.stat?.bravoUserCount || 0}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Phiếu Trùng</div>
              <div
                className={`text-sm font-extrabold mt-0.5 ${calcResults.stat?.duplicateSlipCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}
              >
                {calcResults.stat?.duplicateSlipCount || 0} phiếu
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Độ Trễ Đồng Bộ TB</div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                {calcResults.stat?.avgSyncDelaySeconds || 0} giây
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
