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
        title: t('production.stepCount', 'Số TT'),
        id: 'StepCount',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Number',
        readonly: true,
        width: 80,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#7c3aed', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      // Kế hoạch & Sản lượng Lệnh CĐ
      {
        title: t('production.quantitySO', 'SL đơn hàng (SO)'),
        id: 'QuantitySO',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
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
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#16a34a', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.quantityPass', 'SL đạt'),
        id: 'QuantityPass',
        group: t('production.grpQuantity', 'Kế hoạch & Sản lượng'),
        kind: 'Number',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      // Quản trị
      {
        title: t('production.docDate', 'Ngày chứng từ'),
        id: 'DocDate',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Date',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.factoryName', 'Nhà máy'),
        id: 'FactoryName',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 170,
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
        title: t('production.factoryName', 'Nhà máy'),
        id: 'FactoryName',
        group: t('production.grpAdmin', 'Thông tin Quản trị'),
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      }
    ]
  }, [t])
}

// Backward-compatible export
export const useWorkProcessColumns = useWorkProcessMasterColumns
