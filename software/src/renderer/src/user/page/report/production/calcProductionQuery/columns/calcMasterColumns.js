/**
 * Schema cột cho bảng Danh sách Master Đăng Ký Tính KHSX & TKSX
 */
import { GridCellKind } from '@glideapps/glide-data-grid'

export const CALC_MASTER_COLUMNS = [
  {
    id: 'regCode',
    title: 'MÃ ĐĂNG KÝ',
    width: 170,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'factoryName',
    title: 'NHÀ MÁY',
    width: 130,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'applyDate',
    title: 'NGÀY ĐĂNG KÝ BÁO CÁO',
    width: 160,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'status',
    title: 'TRẠNG THÁI',
    width: 120,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'totalRows',
    title: 'TỔNG SỐ DÒNG',
    width: 120,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'statReportRows',
    title: '1. THỐNG KÊ SX (DÒNG)',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'unfinishedOpRows',
    title: '2. LỆNH TT CHƯA XONG',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'summaryOpRows',
    title: '3. TỔNG HỢP LỆNH TT',
    width: 170,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'mesApprovalRows',
    title: '4. DUYỆT SL MES',
    width: 150,
    kind: GridCellKind.Number,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'registeredAt',
    title: 'THỜI GIAN TẠO',
    width: 160,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  },
  {
    id: 'remark',
    title: 'GHI CHÚ',
    width: 220,
    kind: GridCellKind.Text,
    hasMenu: true,
    readonly: true
  }
]
