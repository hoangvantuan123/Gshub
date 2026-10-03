// Cơ sở dữ liệu Cẩm nang Công thức & Từ điển Cột dữ liệu Báo cáo Sản xuất GsHub
// Bao gồm cả 2 phân hệ: Thống kê sản xuất (TKSX) và Kế hoạch sản xuất (KHSX)

export const STAT_FORMULA_DATABASE = [
  // ==================== I. THẺ KPI ĐIỀU HÀNH (TKSX) ====================
  {
    id: 'kpi_total_tickets',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'totalTickets / TicketCode',
    columnName: 'Tổng phiếu thống kê sản xuất',
    title: 'Tổng phiếu thống kê sản xuất',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 1)',
    formula: 'COUNT(TicketCode) trong kỳ lọc',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCode)',
    description:
      'Phản ánh tổng lượng tác nghiệp ghi nhận số liệu sản xuất thực tế tại hiện trường sau khi áp dụng các bộ lọc ngày, máy, tổ.',
    notes:
      'Tự động phân tách số phiếu lập trực tiếp từ thiết bị MES tại hiện trường so với các nguồn khác.'
  },
  {
    id: 'kpi_over_12h_check',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'runtimeOver12hCheck / AuditCategory',
    columnName: 'Phiếu chạy máy > 12h (Cần kiểm tra)',
    title: 'Thời gian chạy máy > 12h (Cần kiểm tra)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 2) & Mục 4.2',
    formula: 'COUNT(Tickets) WHERE DurationMinutes > 720 VÀ ProdQty < 50.000 SP',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes, ProdQty, ActualRunTime)',
    description:
      'Cảnh báo các phiếu thống kê sản xuất có thời gian chạy máy kéo dài bất thường (>12 giờ) nhưng sản lượng nhỏ (<50k sp), cần Quản lý sản xuất kiểm tra.',
    notes: 'Bấm trực tiếp vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu cần kiểm tra.'
  },
  {
    id: 'kpi_under_5min',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'runtimeUnder5Min / under5Min',
    columnName: 'Thao tác < 5 phút (Thao tác nhanh)',
    title: 'Thao tác < 5 phút (Thao tác nhanh / Nhập vội)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 3) & Mục 4.2',
    formula: 'COUNT(Tickets) WHERE DurationMinutes < 5 phút',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes hoặc EndTime - StartTime < 5 phút)',
    description:
      'Cảnh báo các phiếu thống kê thao tác quá vội vàng hoặc nạp hàng loạt sau ca, cần kiểm tra và chuẩn hóa thao tác đúng quy trình vận hành MES.',
    notes: 'Bấm trực tiếp vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu thao tác nhanh.'
  },
  {
    id: 'kpi_mes_rate',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'mesRate / TicketCreationLocation',
    columnName: 'Tỷ lệ số hóa quy trình qua MES (%)',
    title: 'Tỷ lệ số hóa quy trình qua MES (MES Rate)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 4) & Mục 4.2',
    formula: '(Số phiếu tạo trực tiếp trên MES / Tổng số phiếu) × 100%',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCreationLocation / Source chứa "MES")',
    description:
      'Đo lường mức độ chuẩn hóa số hóa và tự động hóa quy trình sản xuất tại hiện trường, loại bỏ hoàn toàn việc ghi chép sổ sách thủ công.',
    notes: 'Mục tiêu vận hành chuẩn: Duy trì 100% phiếu lập trực tiếp tại trạm máy MES.'
  },
  {
    id: 'kpi_sync_latency',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'syncLatencyFormatted / SyncDelayMinutes',
    columnName: 'Độ trễ thời gian đồng bộ 2 hệ thống (Sync Latency)',
    title: 'Độ trễ thời gian đồng bộ 2 hệ thống (Sync Latency)',
    scope: 'Mục III: Biểu đồ Tiến trình Đồng bộ & Thẻ KPI Tích hợp',
    formula: 'Avg(MesApprovalTime - TicketCreatedDate) [Quy đổi sang HH:mm:ss]',
    source:
      'CSDL _ERPProdStatsDetail (Trường: SyncDelayMinutes, MesApprovalTime, TicketCreatedDate)',
    description:
      'Đánh giá tính tức thời và độ tin cậy của luồng dữ liệu truyền từ máy trạm sản xuất về máy chủ điều hành trung tâm.',
    notes: 'Thời gian đồng bộ lý tưởng: < 10 giây. Hệ thống phân nhóm: ≤10s, 11–30s, 31–60s, >60s.'
  },
  {
    id: 'kpi_auto_export',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'autoExportRate / AutoIoStatus',
    columnName: 'Tỷ lệ liên kết chứng từ tự động (Auto-Logistics Rate)',
    title: 'Tỷ lệ liên kết chứng từ tự động (Auto-Logistics Rate)',
    scope: 'Mục III: Biểu đồ Phân bổ Loại Ghi chú Tự động',
    formula:
      '(Số phiếu Có XKTĐ, Có NKTĐ / (Số phiếu Có XKTĐ, Có NKTĐ + Số phiếu Không có XKTĐ, Không có NKTĐ)) × 100%',
    source: 'CSDL _ERPProdStatsDetail (Trường: AutoIoStatus, AutoExport, AutoImport, ExportDocNo)',
    description:
      'Theo dõi tỷ lệ phát sinh chứng từ kho tự động. Phiếu đạt tính các phiếu có trạng thái Có XKTĐ, Có NKTĐ; loại trừ Không sử dụng NVL.',
    notes:
      'Toàn bộ phân loại trạng thái chứng từ tự động được tổng hợp linh động từ cột AutoIoStatus thực tế.'
  },

  // ==================== II. BIỂU ĐỒ PHÂN TÍCH (TKSX) ====================
  {
    id: 'chart_machine_runtime',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích',
    columnId: 'totalRuntimeHours / RuntimeHours',
    columnName: 'Tổng giờ chạy máy theo cụm máy (Machine Runtime)',
    title: 'Thống kê tổng giờ chạy máy theo cụm máy',
    scope: 'Mục 1: Biểu đồ Giờ chạy máy theo cụm máy',
    formula: 'Sum(RuntimeHours) = Sum(DurationMinutes / 60) của máy i',
    source: 'CSDL _ERPProdStatsDetail (Trường: ActualRunTime, DurationMinutes, MachineCode)',
    description:
      'Đánh giá tổng thời gian vận hành thực tế tích lũy của từng cụm máy và tổ sản xuất, giúp phân tích tải trọng làm việc.',
    notes:
      'Được sắp xếp giảm dần theo tổng giờ chạy để làm nổi bật thiết bị làm việc công suất cao nhất.'
  },
  {
    id: 'chart_machine_limit_24h',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích',
    columnId: 'isOver24h / ReferenceLine y=24',
    columnName: 'Đường chuẩn 24h & Cột đỏ cảnh báo quá tải',
    title: 'Đường giới hạn 24h/ngày & Cảnh báo cột đỏ',
    scope: 'Mục 1: Biểu đồ Giờ chạy máy (Đường nét đứt y=24)',
    formula: 'IF(totalRuntimeHours > 24, "Đỏ Cảnh Báo", "Chuẩn xanh")',
    source: 'Quy chuẩn định mức vận hành 24 giờ/ngày trên mỗi thiết bị máy móc',
    description:
      'Đường tham chiếu đỏ nét đứt y=24h giúp nhận diện tức thì các cụm máy vận hành vượt quá giới hạn 24 giờ trong kỳ báo cáo.',
    notes: 'Trục Y tự động co giãn tối thiểu 26h để đảm bảo đường 24h luôn hiển thị rõ ràng.'
  },
  {
    id: 'chart_team_output_quality',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích',
    columnId: 'actualQty, passQty, defectQty',
    columnName: 'Sản lượng sản xuất, Đạt & Lỗi theo tổ',
    title: 'Thống kê sản lượng sản xuất & đạt theo tổ',
    scope: 'Mục 2: Biểu đồ Sản lượng sản xuất & Đạt theo tổ',
    formula: 'SL Sản xuất = Sum(actualQty) | SL Đạt = Sum(passQty) | SL Lỗi = Sum(defectQty)',
    source: 'CSDL _ERPProdStatsDetail (Trường: ProdQty, PassQty, DefectQty, TeamName)',
    description:
      'Trực quan hóa đối chiếu khối lượng sản xuất thực tế, số lượng đạt tiêu chuẩn và lượng phế phẩm/lỗi của từng tổ sản xuất trong kỳ lọc.',
    notes: 'Biểu đồ cột 3 thành phần: SL Sản xuất, SL Đạt và SL Lỗi.'
  },

  // ==================== IV. BẢNG BIỂU CHI TIẾT (TKSX) ====================
  {
    id: 'col_machine_name',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'machineName / MachineName',
    columnName: 'Tên máy sản xuất',
    title: 'Tên máy sản xuất (Machine Name)',
    scope: 'Mục 4.1 & Mục 4.3 (Cột 6)',
    formula: 'Hiển thị tên định danh máy từ hệ thống',
    source: 'CSDL _ERPProdStatsDetail (Trường: MachineName, MachineCode)',
    description: 'Tên định danh của máy móc hoặc vị trí công đoạn sản xuất tại hiện trường.',
    notes: 'Hỗ trợ tìm kiếm nhanh theo tên máy hoặc mã máy.'
  },
  {
    id: 'col_machine_code',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'machineCode / MachineCode',
    columnName: 'Mã máy sản xuất',
    title: 'Mã máy sản xuất (Machine Code)',
    scope: 'Mục 4.1 (Cột 2)',
    formula: 'Mã code kỹ thuật duy nhất của máy trên hệ thống ERP/MES',
    source: 'CSDL _ERPProdStatsDetail (Trường: MachineCode)',
    description: 'Mã máy chuẩn hóa dùng để liên kết dữ liệu thống kê, bảo trì và kế hoạch.',
    notes: 'Ví dụ: IN01, IN02, BE01, CL01, TC01...'
  },
  {
    id: 'col_actual_qty',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'actualQty / totalActualQty',
    columnName: 'SL Sản xuất thực tế',
    title: 'Sản lượng sản xuất thực tế (Actual Quantity)',
    scope: 'Mục 4.1: Cột 5 | Mục 4.2: Cột 3 | Mục 4.3: Cột 9',
    formula: 'Sum(ProdQty) hoặc Sum(ActualMeters)',
    source: 'CSDL _ERPProdStatsDetail (Trường: ProdQty, ActualMeters, StatPassQty)',
    description: 'Tổng sản lượng thực tế máy đã thực hiện trong ca sản xuất.',
    notes: 'Đơn vị: Chiếc / Mét / Tấm tùy theo dòng sản phẩm.'
  },
  {
    id: 'col_pass_qty',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'passQty / totalPassQty',
    columnName: 'SL Đạt chuẩn KCS',
    title: 'Sản lượng đạt tiêu chuẩn (Pass Quantity)',
    scope: 'Mục 4.1: Cột 6 | Mục 4.2: Cột 4 | Mục 4.3: Cột 10',
    formula: 'Sum(PassQty)',
    source: 'CSDL _ERPProdStatsDetail (Trường: PassQty, StatPassQty)',
    description: 'Số lượng sản phẩm vượt qua quy trình kiểm soát chất lượng KCS.',
    notes: 'SL Đạt luôn nhỏ hơn hoặc bằng SL Sản xuất thực tế.'
  },
  {
    id: 'col_defect_qty',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'defectQty / totalDefectQty',
    columnName: 'SL Lỗi / Phế phẩm',
    title: 'Số lượng lỗi / Phế phẩm (Defect Quantity)',
    scope: 'Mục 4.1: Cột 7 | Mục 4.2: Cột 5 | Mục 4.3: Cột 11',
    formula: 'DefectQty > 0 ? DefectQty : MAX(0, SL Sản xuất - SL Đạt)',
    source: 'CSDL _ERPProdStatsDetail (Trường: DefectQty, hoặc ProdQty - PassQty)',
    description:
      'Lượng sản phẩm bị loại bỏ do không đạt tiêu chuẩn kỹ thuật hoặc hỏng trong quá trình chạy máy.',
    notes: 'Được tính toán tự động đảm bảo số liệu luôn khớp với SL Sản xuất và SL Đạt.'
  },
  {
    id: 'col_pass_rate',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'passRate',
    columnName: 'Tỷ lệ đạt chuẩn KCS (%)',
    title: 'Tỷ lệ đạt chuẩn KCS (Quality Pass Rate)',
    scope: 'Mục 4.1: Cột 8 | Mục 4.2: Cột 6 | Mục 4.3: Cột 12',
    formula: '(Tổng SL Đạt / Tổng SL Sản xuất) × 100%',
    source: 'Tính toán trực tiếp từ totalPassQty và totalActualQty',
    description:
      'Chỉ số đo lường chất lượng sản phẩm xuất xưởng của từng máy, tổ hoặc từng lệnh sản xuất.',
    notes: 'Ngưỡng chuẩn: ≥ 95% (Đạt tiêu chuẩn xanh), < 95% (Cần rà soát nguyên nhân phế phẩm).'
  },
  {
    id: 'col_machine_speed',
    reportType: 'stat',
    reportTypeName: 'Thống kê SX (TKSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'speed / passPerHour',
    columnName: 'SL Đạt / Giờ (Tốc độ máy sp/h)',
    title: 'Năng suất tốc độ máy theo giờ',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 10)',
    formula: 'Tổng SL Đạt KCS / Tổng Giờ chạy máy thực tế',
    source: 'Tính toán từ totalPassQty và totalRuntimeHours',
    description:
      'Đo lường năng lực tạo ra sản phẩm đạt chuẩn KCS trên mỗi giờ vận hành thực tế của từng máy.',
    notes: 'Định mức tính theo đơn vị sản phẩm trên giờ (SP/h).'
  }
]

export const PLAN_FORMULA_DATABASE = [
  // ==================== I. THẺ KPI ĐIỀU HÀNH (KHSX) ====================
  {
    id: 'kpi_total_orders',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'totalOrders / IdSeq',
    columnName: 'Tổng số lệnh thao tác',
    title: 'Tổng số lệnh thao tác',
    scope: 'Thẻ KPI 1 & Toàn bộ báo cáo',
    formula: 'COUNT(IdSeq) trong phạm vi bộ lọc',
    source: 'Bảng _ERPPlanDetail (OperationNo / DocNo)',
    description:
      'Tổng số lệnh điều phối sản xuất nằm trong phạm vi ngày và các điều kiện lọc được chọn.',
    notes: 'Tổng hợp số lượng phân bổ theo từng công đoạn.'
  },
  {
    id: 'kpi_sx_sai_ngay',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'sxSaiNgayCount / StatusDpSx',
    columnName: 'SX sai ngày KH',
    title: 'Sản xuất sai ngày kế hoạch',
    scope: 'Thẻ KPI 2 & Mục 3 & Mục 6',
    formula: 'COUNT IF (StatusDpSx = "SX sai ngày KH" HOẶC OpDate != RoutingDocDate)',
    source: 'So khớp ngày thực hiện (OpDate) với ngày điều phối (RoutingDocDate)',
    description:
      'Số lượng và tỷ lệ lệnh có ngày sản xuất thực tế lệch so với ngày kế hoạch ban đầu.',
    notes: 'Cần phân tích nguyên nhân điều chỉnh tiến độ giao hàng.'
  },
  {
    id: 'kpi_truot_kh',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'truotKhCount / StatusDpSx',
    columnName: 'Trượt KH (Trượt kế hoạch)',
    title: 'Lệnh trượt kế hoạch sản xuất',
    scope: 'Thẻ KPI 3 & Mục 3 & Mục 6',
    formula: 'COUNT IF (StatusDpSx = "Trượt KH" HOẶC StatPassQty < TargetProdQty * 0.9)',
    source: 'Cột StatusDpSx hoặc tỷ lệ sản lượng đạt so với kế hoạch',
    description:
      'Các lệnh không hoàn thành đúng tiến độ hoặc bị thiếu hụt sản lượng so với chỉ tiêu kế hoạch.',
    notes: 'Căn cứ đánh giá mức độ hoàn thành chỉ tiêu giao khoán.'
  },
  {
    id: 'kpi_khop_sl',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'khopSlCount / StatusDpSx',
    columnName: 'Khớp số lượng',
    title: 'Lệnh khớp số lượng kế hoạch',
    scope: 'Thẻ KPI 4 & Mục 3 & Mục 6',
    formula: 'COUNT IF (StatusDpSx = "Khớp số lượng")',
    source: 'Cột StatusDpSx từ hệ thống ERP/MES',
    description: 'Các lệnh hoàn thành đúng số lượng yêu cầu theo kế hoạch sản xuất đã giao.',
    notes: 'Chỉ số ưu tiên phản ánh năng lực dự báo và thực thi.'
  },
  {
    id: 'kpi_khop_job',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    columnId: 'khopJobCount / StatusDpSx',
    columnName: 'Khớp job',
    title: 'Lệnh khớp job sản xuất',
    scope: 'Thẻ KPI 5 & Mục 3 & Mục 6',
    formula: 'COUNT IF (StatusDpSx = "Khớp job")',
    source: 'Cột StatusDpSx từ hệ thống ERP/MES',
    description: 'Các lệnh hoàn thành đúng quy cách job mặt hàng và thời điểm sản xuất.',
    notes: 'Phản ánh độ tuân thủ quy trình sắp xếp thứ tự ca máy.'
  },

  // ==================== II. BIỂU ĐỒ PHÂN TÍCH (KHSX) ====================
  {
    id: 'chart_plan_vs_actual_team',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích',
    columnId: 'planQty, actualQty, targetProdQty',
    columnName: 'Sản lượng Kế hoạch vs Thực tế theo tổ',
    title: 'So sánh Kế hoạch và Thực tế theo tổ',
    scope: 'Mục 2: Biểu đồ Tiến độ theo tổ',
    formula: 'SL Kế hoạch = Sum(TargetProdQty) | SL Thực tế = Sum(StatPassQty)',
    source: 'CSDL _ERPPlanDetail (Trường: TargetProdQty, StatPassQty, TeamName)',
    description:
      'So sánh tương quan giữa sản lượng được phân bổ theo kế hoạch và sản lượng thực tế máy/tổ đạt được.',
    notes: 'Biểu đồ dạng cột kép trực quan tỷ lệ hoàn thành %.'
  },

  // ==================== IV. BẢNG BIỂU CHI TIẾT (KHSX) ====================
  {
    id: 'col_plan_work_order',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'WorkOrderNo / DocNo',
    columnName: 'Số lệnh sản xuất (LSX)',
    title: 'Số lệnh sản xuất điều phối',
    scope: 'Mục 6: Bảng Chi tiết Lệnh',
    formula: 'Số lệnh điều phối định danh từ phòng Kế hoạch',
    source: 'Bảng _ERPPlanDetail (Trường: WorkOrderNo, DocNo)',
    description: 'Mã số chứng từ kế hoạch ban hành cho xưởng sản xuất thực hiện.',
    notes: 'Mỗi lệnh tương ứng với 1 công đoạn gia công.'
  },
  {
    id: 'col_plan_item_name',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'ItemName / ProductName',
    columnName: 'Tên sản phẩm / Mặt hàng',
    title: 'Tên sản phẩm trong kế hoạch',
    scope: 'Mục 6: Bảng Chi tiết Lệnh',
    formula: 'Tên mặt hàng thành phẩm hoặc bán thành phẩm',
    source: 'Bảng _ERPPlanDetail (Trường: ItemName, ItemCode)',
    description: 'Quy cách sản phẩm gia công theo đơn hàng của khách hàng.',
    notes: 'Hiển thị kèm mã mặt hàng ItemCode.'
  },
  {
    id: 'col_plan_target_qty',
    reportType: 'plan',
    reportTypeName: 'Kế hoạch SX (KHSX)',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết',
    columnId: 'TargetProdQty / PlanQty',
    columnName: 'Sản lượng mục tiêu kế hoạch',
    title: 'Sản lượng mục tiêu kế hoạch (Target Qty)',
    scope: 'Mục 6: Bảng Chi tiết Lệnh',
    formula: 'Số lượng sản phẩm giao khoán theo kế hoạch',
    source: 'Bảng _ERPPlanDetail (Trường: TargetProdQty)',
    description: 'Định mức sản lượng yêu cầu hoàn thành của lệnh sản xuất.',
    notes: 'Căn cứ đối chiếu tỷ lệ đạt của ca máy.'
  }
]

// Toàn bộ cơ sở dữ liệu cẩm nang hợp nhất
export const ALL_HANDBOOK_DATABASE = [...STAT_FORMULA_DATABASE, ...PLAN_FORMULA_DATABASE]

// Alias tương thích ngược
export const FORMULA_DATABASE = ALL_HANDBOOK_DATABASE
