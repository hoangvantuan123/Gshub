/**
 * Schema cột cho bảng Danh sách Master Đăng Ký Tính KHSX & TKSX
 */
import { GridCellKind } from '@glideapps/glide-data-grid'

export const CALC_MASTER_COLUMNS = [
  {
    id: 'regCode',
    title: 'Mã đăng ký',
    width: 170,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'factoryName',
    title: 'Nhà máy',
    width: 130,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'applyDate',
    title: 'Ngày đăng ký (KHSX)',
    width: 150,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'status',
    title: 'Trạng thái',
    width: 130,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'version',
    title: 'Phiên bản',
    width: 100,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'totalRows',
    title: 'Tổng số dòng',
    width: 120,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'statReportRows',
    title: '1. Thống kê SX (dòng)',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'unfinishedOpRows',
    title: '2. Lệnh TT chưa xong (dòng)',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'summaryOpRows',
    title: '3. Tổng hợp lệnh TT (dòng)',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'mesApprovalRows',
    title: '4. Duyệt SL MES (dòng)',
    width: 150,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'registeredAt',
    title: 'Thời gian tạo',
    width: 160,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'registeredBy',
    title: 'Người tạo',
    width: 130,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'remark',
    title: 'Ghi chú',
    width: 220,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  }
]
