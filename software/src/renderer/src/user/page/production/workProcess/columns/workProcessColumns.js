import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

// ─────────────────────────────────────────────────────────────────────────────
// 1. CỘT CHO BẢNG MASTER (LỆNH CÔNG ĐOẠN)
// ─────────────────────────────────────────────────────────────────────────────
export const useWorkProcessMasterColumns = () => {
  const { t } = useTranslation()

  return useMemo(() => {
    return [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: 'bold 12px Inter, sans-serif' }
      },
      {
        title: t('production.docNo', 'Mã Lệnh Tổng'),
        id: 'DocNo',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 155,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.stageOrderNo', 'Lệnh công đoạn'),
        id: 'StageOrderNo',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 190,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#1e40af', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.itemCode', 'Mã mặt hàng'),
        id: 'ItemCode',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.itemName', 'Tên vật tư, hàng hóa'),
        id: 'ItemName',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 250,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.unit', 'ĐVT'),
        id: 'Unit',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 75,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.workProcessCode', 'Mã quy trình'),
        id: 'WorkProcessCode',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.productTypeName', 'Loại sản phẩm'),
        id: 'ProductTypeName',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      // Kế hoạch & Sản lượng Lệnh CĐ
      {
        title: t('production.quantitySO', 'SL đơn hàng (SO)'),
        id: 'QuantitySO',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.quantityCDIssue', 'SL cấp phát CĐ'),
        id: 'QuantityCDIssue',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.quantityPass', 'SL đạt theo DO'),
        id: 'QuantityPass',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.ratePass', 'Tỷ lệ đạt (%)'),
        id: 'RatePass',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 115,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityAdj', 'SL điều chỉnh'),
        id: 'QuantityAdj',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.quantityAfterAdjPass', 'SL đạt sau ĐC (DO)'),
        id: 'QuantityAfterAdj_Pass',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 155,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityOff', 'SL bù hao'),
        id: 'QuantityOff',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#d97706', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityReceipt', 'SL nhập kho'),
        id: 'QuantityReceipt',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.rateReceipt', 'Tỷ lệ nhập kho (%)'),
        id: 'RateReceipt',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.quantityProduce', 'SL sản xuất'),
        id: 'QuantityProduce',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#16a34a', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityAfterAdj', 'SL sau ĐC (Sản xuất)'),
        id: 'QuantityAfterAdj',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      // Tiến độ & Trạng thái
      {
        title: t('production.deliveryDateDO', 'Hạn giao DO'),
        id: 'DeliveryDateDO',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Date',
        contentAlign: 'center',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.closedDate', 'Ngày đóng lệnh'),
        id: 'ClosedDate',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Date',
        contentAlign: 'center',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.isComplete', 'Hoàn thành'),
        id: 'IsComplete',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 95,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.closed', 'Đã đóng'),
        id: 'Closed',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 85,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.isStop', 'Tạm dừng'),
        id: 'IsStop',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 85,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.allowAdj', 'Cho phép ĐC'),
        id: 'AllowAdj',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 105,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.isCheckSample', 'Kiểm mẫu'),
        id: 'IsCheckSample',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.postSL', 'Ghi sổ SL'),
        id: 'PostSL',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Boolean',
        contentAlign: 'center',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.approvalStatus', 'Trạng thái duyệt'),
        id: 'ApprovalStatus',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Text',
        contentAlign: 'center',
        readonly: true,
        width: 175,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.docStatus', 'Trạng thái CT'),
        id: 'DocStatus',
        group: t('production.grpProgress', 'Tiến độ & Trạng thái'),
        kind: 'Number',
        contentAlign: 'right',
        readonly: true,
        width: 105,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      // Quản trị
      {
        title: t('production.docDate', 'Ngày chứng từ'),
        id: 'DocDate',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Date',
        contentAlign: 'center',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.factoryName', 'Nhà máy / Chi nhánh'),
        id: 'FactoryName',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.customerName', 'Khách hàng'),
        id: 'CustomerName',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.createdByName', 'Người tạo / Lập'),
        id: 'CreatedBy_Name',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.createdAt', 'Ngày tạo'),
        id: 'CreatedAt',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Date',
        contentAlign: 'center',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.modifiedByName', 'Người cập nhật'),
        id: 'ModifiedBy_Name',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.modifiedDate', 'Ngày cập nhật'),
        id: 'ModifiedDate',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Date',
        contentAlign: 'center',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.description', 'Diễn giải'),
        id: 'Description',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      // Thông tin Hệ thống
      {
        title: t('production.rowIdSO', 'Mã dòng SO'),
        id: 'RowId_SO',
        group: t('production.grpSystem', 'Hệ thống'),
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.rowId', 'Mã dòng CĐ (RowId)'),
        id: 'RowId',
        group: t('production.grpSystem', 'Hệ thống'),
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      }
    ]
  }, [t])
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CỘT CHO BẢNG DETAIL (DANH SÁCH THAO TÁC TT)
// ─────────────────────────────────────────────────────────────────────────────
export const useWorkProcessStepColumns = () => {
  const { t } = useTranslation()

  return useMemo(() => {
    return [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: 'bold 12px Inter, sans-serif' }
      },
      {
        title: t('production.stageOrderNo', 'Thuộc Lệnh CĐ'),
        id: 'StageOrderNo',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Text',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#1e40af', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.stepOrder', 'Thứ tự TT'),
        id: 'BuiltinOrder',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Number',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.operationCode', 'Mã TT (Thao tác)'),
        id: 'OperationCode',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#7c3aed', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.operationName', 'Tên thao tác công đoạn'),
        id: 'WorkStepTypeName',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.machineCode', 'Mã máy'),
        id: 'MachineCode',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Text',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.machineName', 'Tên máy sản xuất'),
        id: 'MachineName',
        group: t('production.grpOperation', 'Tiến trình Thao tác TT'),
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      // Sản lượng TT
      {
        title: t('production.quantityProduce', 'SL sản xuất TT'),
        id: 'QuantityProduce',
        group: t('production.grpQuantity', 'Sản lượng thực tế TT'),
        kind: 'Number',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#16a34a', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityPass', 'SL đạt TT'),
        id: 'QuantityPass',
        group: t('production.grpQuantity', 'Sản lượng thực tế TT'),
        kind: 'Number',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityTransfered', 'SL chuyển tiếp'),
        id: 'QuantityTransfered',
        group: t('production.grpQuantity', 'Sản lượng thực tế TT'),
        kind: 'Number',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.quantityProductTransfered', 'SL thành phẩm chuyển'),
        id: 'QuantityProductTransfered',
        group: t('production.grpQuantity', 'Sản lượng thực tế TT'),
        kind: 'Number',
        readonly: true,
        width: 155,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.factoryName', 'Nhà máy / Chi nhánh'),
        id: 'FactoryName',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      }
    ]
  }, [t])
}

// Backward-compatible export
export const useWorkProcessColumns = useWorkProcessMasterColumns
