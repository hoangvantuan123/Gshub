import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GridColumnIcon } from '@glideapps/glide-data-grid'

export const useOrderSettlementColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
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
      // ── Nhóm 1: Thông tin Lệnh & Hàng hóa ──
      {
        title: t('production.stageOrderNo', 'Lệnh công đoạn'),
        id: 'StageOrderNo',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 195,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#1e40af', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.itemCode', 'Mặt hàng'),
        id: 'ItemCode',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.itemName', 'Tên vật tư, hàng hóa'),
        id: 'ItemName',
        group: t('production.grpGeneral', 'Thông tin Lệnh & Hàng hóa'),
        kind: 'Text',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
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
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },

      // ── Nhóm 2: Kế hoạch & Định mức (Cột số lượng) ──
      {
        title: t('production.doRequiredQty', 'SL cần đạt theo DO'),
        id: 'DoRequiredQty',
        group: t('production.grpPlanNorm', 'Kế hoạch & Định mức sản xuất'),
        kind: 'Number',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.initialAdjustQty', 'SL điều chỉnh ban đầu'),
        id: 'InitialAdjustQty',
        group: t('production.grpPlanNorm', 'Kế hoạch & Định mức sản xuất'),
        kind: 'Number',
        readonly: false,
        width: 155,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.adjustedRequiredQty', 'SL cần đạt sau ĐC'),
        id: 'AdjustedRequiredQty',
        group: t('production.grpPlanNorm', 'Kế hoạch & Định mức sản xuất'),
        kind: 'Number',
        readonly: true,
        width: 155,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.wasteCompensationQty', 'SL bù hao'),
        id: 'WasteCompensationQty',
        group: t('production.grpPlanNorm', 'Kế hoạch & Định mức sản xuất'),
        kind: 'Number',
        readonly: true,
        width: 110,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.productionRequiredQty', 'SL cần sản xuất'),
        id: 'ProductionRequiredQty',
        group: t('production.grpPlanNorm', 'Kế hoạch & Định mức sản xuất'),
        kind: 'Number',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#0369a1', baseFontStyle: '600 12px Inter, sans-serif' }
      },

      // ── Nhóm 3: Quyết toán Lệnh (Cột quyết toán gộp chung duy nhất) ──
      {
        title: t('production.isSettled', 'Quyết toán'),
        id: 'IsSettled',
        group: t('production.grpSettlement', 'Quyết toán Lệnh'),
        kind: 'Boolean',
        readonly: false,
        width: 105,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderBoolean,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.settlementQty', 'SL quyết toán'),
        id: 'SettlementQty',
        group: t('production.grpSettlement', 'Quyết toán Lệnh'),
        kind: 'Number',
        readonly: true,
        width: 125,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
      },

      // ── Nhóm 4: Thực hiện Lệnh Thao tác Chi tiết ──
      {
        title: t('production.builtinOrder', 'Thứ tự TT'),
        id: 'BuiltinOrder',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 80,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.detailNo', 'Số chi tiết'),
        id: 'DetailNo',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#6b21a8', baseFontStyle: '600 12px Inter, sans-serif' }
      },
      {
        title: t('production.workStepTypeCode', 'Loại thao tác'),
        id: 'WorkStepTypeCode',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Text',
        readonly: true,
        width: 110,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.operationCode', 'Mã TT'),
        id: 'OperationCode',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Text',
        readonly: true,
        width: 115,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.operationName', 'Tên thao tác'),
        id: 'OperationName',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.machineName', 'Máy / Thiết bị'),
        id: 'MachineName',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.plannedAchievedQty', 'SL đạt lên TT'),
        id: 'PlannedAchievedQty',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.plannedProductionQty', 'SL SX lên TT'),
        id: 'PlannedProductionQty',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.statAchievedQty', 'SL đạt thống kê'),
        id: 'StatAchievedQty',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.statProductionQty', 'SL SX thống kê'),
        id: 'StatProductionQty',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 145,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.warehouseReceiptQty', 'SL Nhập kho'),
        id: 'WarehouseReceiptQty',
        group: t('production.grpOperationDetail', 'Thực hiện Lệnh Thao tác'),
        kind: 'Number',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderNumber,
        trailingRowOptions: { disabled: true },
        themeOverride: { textDark: '#059669', baseFontStyle: '600 12px Inter, sans-serif' }
      },

      // ── Nhóm 5: Kết quả & Ghi chú ──
      {
        title: t('production.status', 'Trạng thái'),
        id: 'Status',
        group: t('production.grpStatusNotes', 'Trạng thái & Ghi chú'),
        kind: 'Text',
        readonly: true,
        width: 135,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.settledDate', 'Ngày quyết toán'),
        id: 'SettledDate',
        group: t('production.grpStatusNotes', 'Trạng thái & Ghi chú'),
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('production.notes', 'Ghi chú quyết toán'),
        id: 'Notes',
        group: t('production.grpStatusNotes', 'Trạng thái & Ghi chú'),
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },

      // ── Các cột hệ thống ẩn mặc định ──
      {
        title: t('system.createdBy', 'Người tạo'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdAt', 'Thời gian tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedBy', 'Người cập nhật'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        icon: GridColumnIcon.HeaderString,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedAt', 'Thời gian cập nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false,
        icon: GridColumnIcon.HeaderString,
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

export const defaultOrderSettlementColumns = [
  {
    title: '',
    id: 'WorkingTag',
    kind: 'Text',
    readonly: true,
    width: 45,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Lệnh công đoạn',
    id: 'StageOrderNo',
    group: 'Thông tin Lệnh & Hàng hóa',
    kind: 'Text',
    readonly: true,
    width: 195,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Mặt hàng',
    id: 'ItemCode',
    group: 'Thông tin Lệnh & Hàng hóa',
    kind: 'Text',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Tên vật tư, hàng hóa',
    id: 'ItemName',
    group: 'Thông tin Lệnh & Hàng hóa',
    kind: 'Text',
    readonly: true,
    width: 180,
    hasMenu: true,
    visible: true
  },
  {
    title: 'ĐVT',
    id: 'Unit',
    group: 'Thông tin Lệnh & Hàng hóa',
    kind: 'Text',
    readonly: true,
    width: 75,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL cần đạt theo DO',
    id: 'DoRequiredQty',
    group: 'Kế hoạch & Định mức sản xuất',
    kind: 'Number',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL điều chỉnh ban đầu',
    id: 'InitialAdjustQty',
    group: 'Kế hoạch & Định mức sản xuất',
    kind: 'Number',
    readonly: false,
    width: 155,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL cần đạt sau ĐC',
    id: 'AdjustedRequiredQty',
    group: 'Kế hoạch & Định mức sản xuất',
    kind: 'Number',
    readonly: true,
    width: 155,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL bù hao',
    id: 'WasteCompensationQty',
    group: 'Kế hoạch & Định mức sản xuất',
    kind: 'Number',
    readonly: true,
    width: 110,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL cần sản xuất',
    id: 'ProductionRequiredQty',
    group: 'Kế hoạch & Định mức sản xuất',
    kind: 'Number',
    readonly: true,
    width: 135,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Quyết toán',
    id: 'IsSettled',
    group: 'Quyết toán Lệnh',
    kind: 'Boolean',
    readonly: false,
    width: 105,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL quyết toán',
    id: 'SettlementQty',
    group: 'Quyết toán Lệnh',
    kind: 'Number',
    readonly: true,
    width: 125,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Thứ tự TT',
    id: 'BuiltinOrder',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 80,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Số chi tiết',
    id: 'DetailNo',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Text',
    readonly: true,
    width: 150,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Loại thao tác',
    id: 'WorkStepTypeCode',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Text',
    readonly: true,
    width: 110,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Mã TT',
    id: 'OperationCode',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Text',
    readonly: true,
    width: 115,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Tên thao tác',
    id: 'OperationName',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Text',
    readonly: true,
    width: 160,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Máy / Thiết bị',
    id: 'MachineName',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Text',
    readonly: true,
    width: 150,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL đạt lên TT',
    id: 'PlannedAchievedQty',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL SX lên TT',
    id: 'PlannedProductionQty',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL đạt thống kê',
    id: 'StatAchievedQty',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL SX thống kê',
    id: 'StatProductionQty',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 145,
    hasMenu: true,
    visible: true
  },
  {
    title: 'SL Nhập kho',
    id: 'WarehouseReceiptQty',
    group: 'Thực hiện Lệnh Thao tác',
    kind: 'Number',
    readonly: true,
    width: 130,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Trạng thái',
    id: 'Status',
    group: 'Trạng thái & Ghi chú',
    kind: 'Text',
    readonly: true,
    width: 135,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Ngày quyết toán',
    id: 'SettledDate',
    group: 'Trạng thái & Ghi chú',
    kind: 'Text',
    readonly: true,
    width: 140,
    hasMenu: true,
    visible: true
  },
  {
    title: 'Ghi chú quyết toán',
    id: 'Notes',
    group: 'Trạng thái & Ghi chú',
    kind: 'Text',
    readonly: false,
    width: 200,
    hasMenu: true,
    visible: true
  }
]
