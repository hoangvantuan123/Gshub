import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useProductionPlanColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },
      {
        title: t('report.regCode', 'Mã đăng ký *'),
        id: 'RegCode',
        kind: 'Text',
        readonly: true,
        width: 190,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', baseFontStyle: '600 12px' }
      },
      {
        title: t('report.reportType', 'Loại báo cáo *'),
        id: 'ReportType',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('report.factoryName', 'Nhà máy áp dụng *'),
        id: 'FactoryName',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('report.applyDate', 'Ngày báo cáo *'),
        id: 'ApplyDate',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.totalRows', 'Tổng số dòng nạp'),
        id: 'TotalRows',
        kind: 'Number',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.status', 'Trạng thái'),
        id: 'Status',
        kind: 'Text',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.remark', 'Mô tả / Ghi chú'),
        id: 'Remark',
        kind: 'Text',
        readonly: false,
        width: 280,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.createdBy', 'Người đăng ký'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.createdAt', 'Thời gian đăng ký'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.updatedBy', 'Người cập nhật'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('report.updatedAt', 'Thời gian cập nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      }
    ]

    return cols
      .filter((col) => !isFieldVisible || isFieldVisible(col.id))
      .map((col) => ({
        ...col,
        readonly: isFieldReadOnly ? isFieldReadOnly(col.id) || col.readonly : col.readonly
      }))
  }, [t, isFieldVisible, isFieldReadOnly])
}

export default useProductionPlanColumns
