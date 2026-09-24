export const defaultMaterialUsageColumns = [
  {
    id: 'MaterialCode',
    title: 'Mã Vật Tư',
    width: 120,
    readonly: true,
    kind: 'text'
  },
  {
    id: 'MaterialName',
    title: 'Tên Vật Tư / Quy Cách',
    width: 250,
    readonly: true,
    kind: 'text'
  },
  {
    id: 'Unit',
    title: 'ĐVT',
    width: 70,
    readonly: true,
    kind: 'text'
  },
  {
    id: 'NormQty',
    title: 'Định Mức Cấp',
    width: 110,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'ActualQty',
    title: 'Thực Xuất Dùng',
    width: 115,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'ReturnQty',
    title: 'Thu Hồi / Hoàn Nhập',
    width: 130,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'NetUsedQty',
    title: 'Thực Tiêu Hao',
    width: 115,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'DiffQty',
    title: 'Chênh Lệch (+/-)',
    width: 120,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'WasteRate',
    title: 'Hao Hụt TT (%)',
    width: 105,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'UnitPrice',
    title: 'Đơn Giá (VNĐ)',
    width: 110,
    readonly: true,
    kind: 'number'
  },
  {
    id: 'DiffAmount',
    title: 'Thành Tiền Lệch (VNĐ)',
    width: 145,
    readonly: true,
    kind: 'number'
  }
]
