/**
 * Dữ liệu mẫu chuẩn cho Biểu đồ "Số phiếu & tốc độ tăng trưởng theo ngày"
 * Báo cáo hiệu suất sản xuất Nhà máy GS Hà Nội (MES Engine & Bravo ERP)
 *
 * Lưu ý: Toàn bộ phiếu trong mẫu đến từ MES; ngoài MES bằng 0.
 * Ghi rõ "Dữ liệu mẫu"; số liệu X/N là giả định minh họa, không phải số thực tế.
 */
export const MOCK_DAILY_TICKET_GROWTH_DATA = [
  {
    date: '2026-10-01',
    displayDate: '01/10/2026',
    shortDate: '01/10',
    totalTickets: 100,
    over12hCount: 16,
    under5MinCount: 18,
    autoExportedCount: 40,
    notAutoExportedCount: 20,
    mesCount: 100,
    nonMesCount: 0,
    isSample: true,
    note: 'Dữ liệu mẫu'
  },
  {
    date: '2026-10-02',
    displayDate: '02/10/2026',
    shortDate: '02/10',
    totalTickets: 112,
    over12hCount: 15,
    under5MinCount: 16,
    autoExportedCount: 46,
    notAutoExportedCount: 18,
    mesCount: 112,
    nonMesCount: 0,
    isSample: true,
    note: 'Dữ liệu mẫu'
  },
  {
    date: '2026-10-03',
    displayDate: '03/10/2026',
    shortDate: '03/10',
    totalTickets: 126,
    over12hCount: 14,
    under5MinCount: 15,
    autoExportedCount: 50,
    notAutoExportedCount: 15,
    mesCount: 126,
    nonMesCount: 0,
    isSample: true,
    note: 'Dữ liệu mẫu'
  },
  {
    date: '2026-10-04',
    displayDate: '04/10/2026',
    shortDate: '04/10',
    totalTickets: 135,
    over12hCount: 13,
    under5MinCount: 13,
    autoExportedCount: 58,
    notAutoExportedCount: 12,
    mesCount: 135,
    nonMesCount: 0,
    isSample: true,
    note: 'Dữ liệu mẫu'
  },
  {
    date: '2026-10-05',
    displayDate: '05/10/2026',
    shortDate: '05/10',
    totalTickets: 145,
    over12hCount: 12,
    under5MinCount: 12,
    autoExportedCount: 65,
    notAutoExportedCount: 10,
    mesCount: 145,
    nonMesCount: 0,
    isSample: true,
    note: 'Dữ liệu mẫu'
  }
]
