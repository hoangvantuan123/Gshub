export const defaultCostSettlementColumns = [
  {
    id: 'CostCategory',
    title: 'Khoản Mục Chi Phí',
    width: 250,
    readonly: true,
    kind: 'text'
  },
  {
    id: 'StandardCost',
    title: 'Chi Phí Kế Hoạch / ĐM (VNĐ)',
    width: 190,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'ActualCost',
    title: 'Chi Phí Thực Tế (VNĐ)',
    width: 180,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'DiffCost',
    title: 'Chênh Lệch (VNĐ)',
    width: 170,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'CostPerUnit',
    title: 'Giá Thành / SP (VNĐ)',
    width: 160,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'Note',
    title: 'Ghi Chú Đánh Giá',
    width: 280,
    readonly: true,
    kind: 'text'
  }
]
