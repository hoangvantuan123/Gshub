import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useProductionPlanReportColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      // ── Cột trạng thái hệ thống
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },

      // ── Thông tin Điều Phối & Lệnh
      {
        title: t('report.picDp', 'PIC ĐP'),
        id: 'PicDp',
        group: 'Thông tin điều phối',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.operationNo', 'Số lệnh thao tác'),
        id: 'OperationNo',
        group: 'Thông tin điều phối',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('report.opDate', 'Ngày thực hiện thao tác'),
        id: 'OpDate',
        group: 'Thông tin điều phối',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.routingDocNo', 'Số lệnh công đoạn'),
        id: 'RoutingDocNo',
        group: 'Thông tin điều phối',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.routingDocDate', 'Ngày tạo lệnh công đoạn'),
        id: 'RoutingDocDate',
        group: 'Thông tin điều phối',
        kind: 'Text',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },

      // ── Thông tin Hàng hóa & Thao tác
      {
        title: t('report.itemCode', 'Mã hàng'),
        id: 'ItemCode',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('report.itemName', 'Tên hàng'),
        id: 'ItemName',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 240,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.operationName', 'Thao tác'),
        id: 'OperationName',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.opTypeName', 'Phân loại thao tác'),
        id: 'OpTypeName',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.machineName', 'Máy sản xuất'),
        id: 'MachineName',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.unit', 'Đvt'),
        id: 'Unit',
        group: 'Sản phẩm & Quy trình',
        kind: 'Text',
        readonly: false,
        width: 80,
        hasMenu: true,
        visible: true
      },

      // ── Sản lượng & Tiến độ
      {
        title: t('report.targetPassQty', 'Số lượng cần đạt LTT'),
        id: 'TargetPassQty',
        group: 'Sản lượng Kế hoạch',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.targetProdQty', 'Số lượng cần sản xuất'),
        id: 'TargetProdQty',
        group: 'Sản lượng Kế hoạch',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.statPassQty', 'Số lượng đã thống kê đạt'),
        id: 'StatPassQty',
        group: 'Sản lượng Kế hoạch',
        kind: 'Number',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },

      // ── Thời gian & Hiệu suất (Capa)
      {
        title: t('report.startTime', 'Thời gian bắt đầu'),
        id: 'StartTime',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.endTime', 'Thời gian kết thúc'),
        id: 'EndTime',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.standardProdTime', 'Thời gian sản xuất theo ĐM'),
        id: 'StandardProdTime',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Number',
        readonly: false,
        width: 170,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.actualProdTime', 'Thời gian sản xuất'),
        id: 'ActualProdTime',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Number',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.standardCapa', 'Capa ĐM'),
        id: 'StandardCapa',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.actualCapa', 'Capa thực tế'),
        id: 'ActualCapa',
        group: 'Thời gian & Năng lực sản xuất',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },

      // ── Trạng thái Điều phối KHSX
      {
        title: 'Trạng thái\nĐP - SX',
        id: 'StatusDpSx',
        group: 'Trạng thái KHSX & Điều phối',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.timeStatus', 'Trạng thái thời gian'),
        id: 'TimeStatus',
        group: 'Trạng thái KHSX & Điều phối',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.capaStatus', 'Trạng thái capa KHSX điều phối'),
        id: 'CapaStatus',
        group: 'Trạng thái KHSX & Điều phối',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true
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
