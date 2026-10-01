// Sổ tay cơ sở dữ liệu công thức, ánh xạ cột ID, tên tiếng Việt, nguồn dữ liệu và vị trí áp dụng
export const FORMULA_DATABASE = [
  // ==================== I. THẺ KPI ĐIỀU HÀNH ====================
  {
    id: 'kpi_total_tickets',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'blue',
    columnId: 'totalTickets / ticketCode',
    columnName: 'Tổng phiếu thống kê (Report Records Count)',
    title: '1. Tổng phiếu thống kê sản xuất',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 1)',
    formula: 'Tổng số phiếu = Count(TicketCode) trong kỳ lọc',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCode)',
    description:
      'Phản ánh tổng lượng tác nghiệp ghi nhận số liệu sản xuất thực tế tại hiện trường sau khi áp dụng các bộ lọc ngày, máy, tổ và thời gian thao tác.',
    notes:
      'Tự động phân tách số phiếu lập trực tiếp từ thiết bị MES tại hiện trường so với các nguồn khác.'
  },
  {
    id: 'kpi_over_12h_check',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'amber',
    columnId: 'runtimeOver12hCheck / AuditCategory',
    columnName: 'Phiếu chạy máy > 12h (Cần kiểm tra)',
    title: '2. Thời gian chạy máy > 12h (Cần kiểm tra)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 2) & Mục 4.2 (Cột: Đơn > 12h cần KT)',
    formula: 'Số phiếu = Count(Tickets) WHERE DurationMinutes > 720 VÀ ProdQty < 50.000 SP',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes, ProdQty, ActualRunTime)',
    description:
      'Cảnh báo các phiếu thống kê sản xuất có thời gian chạy máy kéo dài bất thường (>12 giờ) nhưng sản lượng nhỏ (<50k sp), cần Quản lý sản xuất kiểm tra nhật trình máy và giải trình nguyên nhân.',
    notes: 'Bấm trực tiếp vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu cần kiểm tra.'
  },
  {
    id: 'kpi_under_5min',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'red',
    columnId: 'runtimeUnder5Min / under5Min',
    columnName: 'Thao tác < 5 phút (Thao tác nhanh)',
    title: '3. Thao tác < 5 phút (Thao tác nhanh / Nhập vội)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 3) & Mục 4.2 (Cột: Đơn < 5p)',
    formula: 'Số phiếu = Count(Tickets) WHERE DurationMinutes < 5 phút',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes hoặc EndTime - StartTime < 5 phút)',
    description:
      'Cảnh báo các phiếu thống kê thao tác quá vội vàng hoặc nạp hàng loạt sau ca, cần kiểm tra và chuẩn hóa thao tác đúng quy trình vận hành MES.',
    notes: 'Bấm trực tiếp vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu thao tác nhanh.'
  },
  {
    id: 'kpi_mes_rate',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'blue',
    columnId: 'mesRate / TicketCreationLocation',
    columnName: 'Tỷ lệ số hóa quy trình qua MES (%)',
    title: '4. Tỷ lệ số hóa quy trình qua MES (MES Rate)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 4) & Mục 4.2 (Cột: Tỷ lệ MES)',
    formula: 'Tỷ lệ MES (%) = (Số phiếu tạo trực tiếp trên MES / Tổng số phiếu) × 100%',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCreationLocation / Source chứa "MES")',
    description:
      'Đo lường mức độ chuẩn hóa số hóa và tự động hóa quy trình sản xuất tại hiện trường, loại bỏ hoàn toàn việc ghi chép sổ sách thủ công.',
    notes: 'Mục tiêu vận hành chuẩn: Duy trì 100% phiếu lập trực tiếp tại trạm máy MES.'
  },
  {
    id: 'kpi_sync_latency',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'cyan',
    columnId: 'syncLatencyFormatted / SyncDelayMinutes',
    columnName: 'Độ trễ thời gian đồng bộ 2 hệ thống (Sync Latency)',
    title: '5. Độ trễ thời gian đồng bộ 2 hệ thống (Sync Latency)',
    scope: 'Mục III: Biểu đồ Tiến trình Đồng bộ & Thẻ KPI Tích hợp',
    formula: 'Độ trễ TB = Avg(MesApprovalTime - TicketCreatedDate) [Quy đổi sang HH:mm:ss]',
    source:
      'CSDL _ERPProdStatsDetail (Trường: SyncDelayMinutes, MesApprovalTime, TicketCreatedDate)',
    description:
      'Đánh giá tính tức thời và độ tin cậy của luồng dữ liệu truyền từ máy trạm sản xuất về máy chủ điều hành trung tâm.',
    notes:
      'Thời gian đồng bộ lý tưởng: < 10 giây. Hệ thống phân nhóm trực quan: ≤10s, 11–30s, 31–60s, >60s (Độ trễ cao) và Không đồng bộ.'
  },
  {
    id: 'kpi_auto_export',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'cyan',
    columnId: 'autoExportRate / AutoIoStatus',
    columnName: 'Tỷ lệ liên kết chứng từ tự động (Auto-Logistics Rate)',
    title: '6. Tỷ lệ liên kết chứng từ tự động (Auto-Logistics Rate)',
    scope: 'Mục III: Biểu đồ Phân bổ Loại Ghi chú Tự động & Thẻ KPI',
    formula:
      'Tỷ lệ tự động (%) = (Số phiếu Có XKTĐ, Có NKTĐ / (Số phiếu Có XKTĐ, Có NKTĐ + Số phiếu Không có XKTĐ, Không có NKTĐ)) × 100%',
    source: 'CSDL _ERPProdStatsDetail (Trường: AutoIoStatus, AutoExport, AutoImport, ExportDocNo)',
    description:
      'Theo dõi tỷ lệ phát sinh chứng từ kho tự động. Phiếu đạt (Đã sinh) chỉ tính các phiếu có trạng thái Có XKTĐ, Có NKTĐ (hoặc Có XKTĐ, Có NKTĐ); loại trừ không tính hạng mục "Không sử dụng NVL" vào tổng phiếu pass; phiếu thiếu tính theo điều kiện Không có XKTĐ và Không có NKTĐ (hiển thị màu đỏ).',
    notes:
      'Toàn bộ phân loại trạng thái chứng từ tự động được tổng hợp linh động từ cột AutoIoStatus thực tế.'
  },

  // ==================== II & III. BIỂU ĐỒ PHÂN TÍCH ====================
  {
    id: 'chart_machine_runtime',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'orange',
    columnId: 'totalRuntimeHours / RuntimeHours',
    columnName: 'Tổng giờ chạy máy theo cụm máy (Machine Runtime)',
    title: '7. Thống kê tổng giờ chạy máy theo cụm máy (Runtime Analysis)',
    scope: 'Mục I: Biểu đồ Giờ chạy máy theo cụm máy (Toàn bộ nhà máy)',
    formula: 'Tổng giờ chạy máy i = Sum(RuntimeHours) = Sum(DurationMinutes / 60) của máy i',
    source: 'CSDL _ERPProdStatsDetail (Trường: ActualRunTime, DurationMinutes, MachineCode)',
    description:
      'Đánh giá tổng thời gian vận hành thực tế tích lũy của từng cụm máy và tổ sản xuất, giúp ban điều hành phân tích tải trọng làm việc, năng suất máy và tương quan giữa thời gian chạy với số lượng phiếu thực hiện.',
    notes:
      'Được sắp xếp giảm dần theo tổng giờ chạy để làm nổi bật ngay các thiết bị làm việc công suất cao nhất.'
  },
  {
    id: 'chart_machine_limit_24h',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'red',
    columnId: 'isOver24h / ReferenceLine y=24',
    columnName: 'Đường chuẩn 24h & Cột đỏ cảnh báo quá tải',
    title: '8. Đường giới hạn 24h/ngày & Cảnh báo cột đỏ quá tải',
    scope: 'Mục I: Biểu đồ Giờ chạy máy (Đường nét đứt y=24 và màu cột)',
    formula: 'Cột đỏ = IF(totalRuntimeHours > 24, "#dc2626 (Đỏ Cảnh Báo)", "#01411b (Chuẩn)")',
    source: 'Quy chuẩn định mức vận hành 24 giờ/ngày trên mỗi thiết bị máy móc',
    description:
      'Đường tham chiếu đỏ nét đứt y=24h giúp nhận diện tức thì các cụm máy vận hành vượt quá giới hạn 24 giờ trong kỳ báo cáo (do trùng lặp ca hoặc nhập sai thời gian).',
    notes: 'Trục Y tự động co giãn tối thiểu 26h để đảm bảo đường 24h luôn hiển thị rõ ràng.'
  },
  {
    id: 'chart_filter_manual_machine',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'green',
    columnId: 'showManualMachines / isManualMachine',
    columnName: 'Lọc tạm ẩn / hiển thị máy thủ công',
    title: '9. Cơ chế lọc & tạm ẩn máy thủ công',
    scope: 'Mục I: Toolbar Biểu đồ & Mục 4.1 Toolbar Bảng Ma trận máy',
    formula:
      'Máy thủ công = MachineName / MachineGroup / MachineCode CONTAINS ("thủ công" | "thu cong")',
    source: 'CSDL _ERPProdStatsDetail (Trường: MachineName, MachineCode, MachineGroup)',
    description:
      'Mặc định tự động ẩn các cụm máy/tổ có tên "Thủ công" để tập trung phân tích máy móc cơ giới tự động. Khi tích chọn "Hiện máy thủ công", hệ thống sẽ nạp đầy đủ cả máy thủ công.',
    notes: 'Không làm mất dữ liệu, chỉ tạm ẩn và có thể chuyển đổi linh hoạt qua nút tích chọn.'
  },
  {
    id: 'chart_team_output_quality',
    category: 'CHARTS',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'orange',
    columnId: 'actualQty, passQty, defectQty',
    columnName: 'Sản lượng sản xuất, Đạt & Lỗi theo tổ',
    title: '10. Thống kê sản lượng sản xuất & đạt theo tổ (Team Output)',
    scope: 'Mục II: Biểu đồ Sản lượng sản xuất & Đạt theo tổ',
    formula: 'SL Sản xuất = Sum(actualQty) | SL Đạt = Sum(passQty) | SL Lỗi = Sum(defectQty)',
    source: 'CSDL _ERPProdStatsDetail (Trường: ProdQty, PassQty, DefectQty, TeamName)',
    description:
      'Trực quan hóa đối chiếu khối lượng sản xuất thực tế, số lượng đạt tiêu chuẩn và lượng phế phẩm/lỗi của từng tổ sản xuất trong kỳ lọc.',
    notes:
      'Biểu đồ cột 3 thành phần: SL Sản xuất (Xanh chuẩn #01411b), SL Đạt (Xanh lá #166534) và SL Lỗi (Đỏ #be123c).'
  },

  // ==================== IV. BẢNG BIỂU CHI TIẾT (GLIDE DATA GRID) ====================
  // 4.1. BẢNG MA TRẬN NĂNG LỰC CỤM MÁY
  {
    id: 'col_machine_name',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'machineName',
    columnName: 'Tên máy sản xuất',
    title: '11. Tên máy sản xuất (Machine Name)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 1) & Mục 4.3 (Cột 6)',
    formula: 'Hiển thị tên định danh máy từ hệ thống (hoặc MachineCode nếu tên trống)',
    source: 'CSDL _ERPProdStatsDetail (Trường: MachineName, MachineCode)',
    description: 'Tên định danh của máy móc hoặc vị trí công đoạn sản xuất tại hiện trường.',
    notes: 'Hỗ trợ tìm kiếm nhanh theo tên máy hoặc mã máy.'
  },
  {
    id: 'col_machine_code',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'machineCode',
    columnName: 'Mã máy sản xuất',
    title: '12. Mã máy sản xuất (Machine Code)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 2)',
    formula: 'Mã code kỹ thuật duy nhất của máy trên hệ thống ERP/MES',
    source: 'CSDL _ERPProdStatsDetail (Trường: MachineCode)',
    description: 'Mã máy chuẩn hóa dùng để liên kết dữ liệu thống kê, bảo trì và kế hoạch.',
    notes: 'Ví dụ: IN01, IN02, BE01, CL01, TC01...'
  },
  {
    id: 'col_machine_tickets',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'ticketCount',
    columnName: 'Số lượng phiếu (Phiếu)',
    title: '13. Số lượng phiếu thống kê theo máy (Ticket Count)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 3) & Mục 4.2 (Cột 2)',
    formula: 'Số lượng phiếu = Count(TicketCode) phát sinh trên máy trong kỳ lọc',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCode)',
    description: 'Tổng số lượt ghi nhận sản xuất phát sinh tại cụm máy hoặc tổ đội.',
    notes: 'Đơn vị tính: Phiếu.'
  },
  {
    id: 'col_machine_runtime_hours',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'totalRuntimeHours / runtimeHours',
    columnName: 'Giờ chạy máy tổng hợp (h)',
    title: '14. Giờ chạy máy tổng hợp (Runtime Hours)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 4) & Mục 4.3 (Cột 12)',
    formula: 'Giờ chạy (h) = Sum(DurationMinutes) / 60 [Làm tròn 1 chữ số thập phân]',
    source: 'CSDL _ERPProdStatsDetail (Trường: ActualRunTime, DurationMinutes)',
    description: 'Tổng số giờ máy hoạt động thực tế để tạo ra sản phẩm.',
    notes: 'Đơn vị tính: Giờ (h).'
  },
  {
    id: 'col_actual_qty',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'actualQty / totalActualQty',
    columnName: 'SL Sản xuất thực tế',
    title: '15. Sản lượng sản xuất thực tế (Actual Quantity)',
    scope: 'Mục 4.1: Cột 5 | Mục 4.2: Cột 3 | Mục 4.3: Cột 9',
    formula: 'SL Sản xuất = Sum(ProdQty) hoặc Sum(ActualMeters)',
    source: 'CSDL _ERPProdStatsDetail (Trường: ProdQty, ActualMeters, StatPassQty)',
    description: 'Tổng sản lượng thực tế máy đã thực hiện trong ca sản xuất.',
    notes: 'Đơn vị: Chiếc / Mét / Tấm tùy theo dòng sản phẩm.'
  },
  {
    id: 'col_pass_qty',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'passQty / totalPassQty',
    columnName: 'SL Đạt chuẩn KCS',
    title: '16. Sản lượng đạt tiêu chuẩn (Pass Quantity)',
    scope: 'Mục 4.1: Cột 6 | Mục 4.2: Cột 4 | Mục 4.3: Cột 10',
    formula: 'SL Đạt = Sum(PassQty)',
    source: 'CSDL _ERPProdStatsDetail (Trường: PassQty, StatPassQty)',
    description: 'Số lượng sản phẩm vượt qua quy trình kiểm soát chất lượng KCS.',
    notes: 'SL Đạt luôn nhỏ hơn hoặc bằng SL Sản xuất thực tế.'
  },
  {
    id: 'col_defect_qty',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'red',
    columnId: 'defectQty / totalDefectQty',
    columnName: 'SL Lỗi / Phế phẩm',
    title: '17. Số lượng lỗi / Phế phẩm (Defect Quantity)',
    scope: 'Mục 4.1: Cột 7 | Mục 4.2: Cột 5 | Mục 4.3: Cột 11',
    formula: 'SL Lỗi = DefectQty > 0 ? DefectQty : MAX(0, SL Sản xuất - SL Đạt)',
    source: 'CSDL _ERPProdStatsDetail (Trường: DefectQty, hoặc ProdQty - PassQty)',
    description:
      'Lượng sản phẩm bị loại bỏ do không đạt tiêu chuẩn kỹ thuật hoặc hỏng trong quá trình chạy máy.',
    notes: 'Được tính toán tự động đảm bảo số liệu luôn khớp với SL Sản xuất và SL Đạt.'
  },
  {
    id: 'col_pass_rate',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'passRate',
    columnName: 'Tỷ lệ đạt chuẩn KCS (%)',
    title: '18. Tỷ lệ đạt chuẩn KCS (Quality Pass Rate)',
    scope: 'Mục 4.1: Cột 8 | Mục 4.2: Cột 6 | Mục 4.3: Cột 12',
    formula:
      'Tỷ lệ đạt (%) = (Tổng SL Đạt / Tổng SL Sản xuất) × 100% [Làm tròn 1 chữ số thập phân]',
    source: 'Tính toán trực tiếp từ totalPassQty và totalActualQty',
    description:
      'Chỉ số đo lường chất lượng sản phẩm xuất xưởng của từng máy, tổ hoặc từng lệnh sản xuất.',
    notes: 'Ngưỡng chuẩn: ≥ 95% (Đạt tiêu chuẩn xanh), < 95% (Cần rà soát nguyên nhân phế phẩm).'
  },
  {
    id: 'col_unit',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'unit',
    columnName: 'Đơn vị tính (ĐVT)',
    title: '19. Đơn vị tính (Unit)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 9)',
    formula: 'Trích xuất từ trường Unit của sản phẩm (Mặc định: "Chiếc")',
    source: 'CSDL _ERPProdStatsDetail (Trường: Unit, ProductUnit)',
    description: 'Đơn vị đo lường sản lượng của lệnh sản xuất (Chiếc, Mét, Hộp, Thùng...).',
    notes: 'Hệ thống tự động hiển thị đơn vị chính xác theo mặt hàng.'
  },
  {
    id: 'col_machine_speed',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'speed / passPerHour',
    columnName: 'SL Đạt / Giờ (Tốc độ máy sp/h)',
    title: '20. Năng suất tốc độ máy theo giờ (Machine Speed & Productivity)',
    scope: 'Mục 4.1: Ma trận cụm máy (Cột 10)',
    formula: 'Tốc độ (SP/h) = Tổng SL Đạt KCS / Tổng Giờ chạy máy thực tế',
    source: 'Tính toán từ totalPassQty và totalRuntimeHours',
    description:
      'Đo lường năng lực tạo ra sản phẩm đạt chuẩn KCS trên mỗi giờ vận hành thực tế của từng máy.',
    notes: 'Định mức tính theo đơn vị sản phẩm trên giờ (SP/h).'
  },

  // 4.2. BẢNG PHÂN TÍCH THEO TỔ
  {
    id: 'col_team_name',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'teamName',
    columnName: 'Tổ sản xuất',
    title: '21. Tổ sản xuất (Team / Section Name)',
    scope: 'Mục 4.2: Cột 1 | Mục 4.3: Cột 7',
    formula: 'Tên tổ đội quản lý trực tiếp máy móc hoặc công đoạn',
    source: 'CSDL _ERPProdStatsDetail (Trường: TeamName, SectionName)',
    description:
      'Đơn vị quản lý cấp tổ đội chịu trách nhiệm về năng suất, chất lượng và kỷ luật sản xuất.',
    notes: 'Ví dụ: Tổ In Offset, Tổ Dán Tự Động, Tổ Sóng, Tổ Bế...'
  },
  {
    id: 'col_under_5min_count',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'red',
    columnId: 'under5Min',
    columnName: 'Đơn < 5p (Nhập nhanh / Thao tác vội)',
    title: '22. Số đơn chạy dưới 5 phút theo tổ',
    scope: 'Mục 4.2: Phân tích theo tổ (Cột 8)',
    formula: 'Số lượng = Count(Tickets của tổ) WHERE DurationMinutes < 5 phút',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes)',
    description:
      'Thống kê các lần kết thúc lệnh quá nhanh bất thường của từng tổ để chấn chỉnh kỷ luật nhập liệu.',
    notes: 'Mục tiêu: Giảm thiểu về 0 trường hợp nhập vội.'
  },
  {
    id: 'col_anomaly_count',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'amber',
    columnId: 'anomalyCount / anomalies',
    columnName: 'Đơn > 12h cần KT theo tổ',
    title: '23. Số đơn chạy trên 12h cần kiểm tra theo tổ',
    scope: 'Mục 4.2: Phân tích theo tổ (Cột 9)',
    formula: 'Số lượng = Count(Tickets của tổ) WHERE DurationMinutes > 720 VÀ ProdQty < 50.000',
    source: 'CSDL _ERPProdStatsDetail (Trường: DurationMinutes, ProdQty)',
    description:
      'Thống kê các đơn hàng kéo dài thời gian bất thường mà sản lượng không tương xứng.',
    notes: 'Căn cứ để QLSX yêu cầu tổ trưởng giải trình lý do máy dừng hoặc quên tắt lệnh.'
  },

  // 4.3. BẢNG NHẬT TRÌNH CHI TIẾT PHIẾU
  {
    id: 'col_ticket_code',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'ticketCode',
    columnName: 'Mã phiếu thống kê sản xuất (TKSX)',
    title: '24. Mã phiếu thống kê sản xuất (Ticket Code)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 2)',
    formula: 'Mã chứng từ thống kê duy nhất được cấp khi tạo phiếu tại xưởng',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCode, RegCode)',
    description:
      'Mã tra cứu gốc của từng lượt báo cáo sản xuất phục vụ đối soát và truy vết chất lượng.',
    notes: 'Hỗ trợ tìm kiếm nhanh theo mã phiếu.'
  },
  {
    id: 'col_order_code',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'orderCode',
    columnName: 'Mã đơn hàng / Lệnh sản xuất (LSX)',
    title: '25. Mã đơn hàng / Lệnh sản xuất (Order / Work Order Code)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 3)',
    formula: 'Mã đơn hàng hoặc lệnh sản xuất ERP liên kết với phiếu',
    source: 'CSDL _ERPProdStatsDetail (Trường: OrderCode, WorkOrderNo)',
    description:
      'Liên kết giữa nhật trình vận hành máy với đơn đặt vị trí kinh doanh của khách hàng.',
    notes: 'Hỗ trợ tra cứu nhanh tiến độ đơn hàng.'
  },
  {
    id: 'col_product_name',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'productName',
    columnName: 'Tên sản phẩm',
    title: '26. Tên sản phẩm sản xuất (Product Name)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 4)',
    formula: 'Tên quy cách thành phẩm hoặc bán thành phẩm gia công',
    source: 'CSDL _ERPProdStatsDetail (Trường: ProductName, ItemName)',
    description: 'Tên hàng hóa được sản xuất trên máy trong ca làm việc.',
    notes: 'Ví dụ: Thùng Carton 5 lớp, Hộp duplex bồi sóng...'
  },
  {
    id: 'col_customer_name',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'customerName',
    columnName: 'Tên khách hàng',
    title: '27. Tên khách hàng (Customer Name)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 5)',
    formula: 'Tên đối tác hoặc khách hàng đặt mua lô hàng',
    source: 'CSDL _ERPProdStatsDetail (Trường: CustomerName)',
    description: 'Khách hàng sở hữu đơn hàng sản xuất.',
    notes: 'Có thể áp dụng tính năng che mờ danh tính khi báo cáo ban giám đốc.'
  },
  {
    id: 'col_start_end_time',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    columnId: 'startTime, endTime',
    columnName: 'Thời gian Bắt đầu & Kết thúc ca máy',
    title: '28. Thời gian Bắt đầu & Kết thúc (Start & End Time)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 7, Cột 8)',
    formula: 'Thời gian thực ghi nhận lúc mở lệnh và lúc hoàn thành (YYYY-MM-DD HH:mm:ss)',
    source: 'CSDL _ERPProdStatsDetail (Trường: StartTime, EndTime)',
    description: 'Thời điểm bấm bắt đầu và kết thúc ca chạy máy trên giao diện MES.',
    notes: 'Khoảng cách giữa hai thời điểm này quyết định DurationMinutes.'
  },
  {
    id: 'col_audit_badge',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'amber',
    columnId: 'auditBadge / AuditCategory',
    columnName: 'Kiểm toán QLSX (Audit Status Badge)',
    title: '29. Phân loại kiểm toán tác nghiệp QLSX (Audit Category)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 13)',
    formula:
      'IF(duration < 5p, "< 5p Nhập nhanh", IF(duration > 720p AND actual >= 50k, "> 12h Đơn lớn (Chuẩn)", IF(duration > 720p, "> 12h Cần kiểm tra", "Chuẩn tiến độ")))',
    source: 'Tính toán trực tiếp từ DurationMinutes và ProdQty của từng phiếu',
    description:
      'Gắn nhãn đối soát tự động cho từng phiếu thống kê giúp Quản lý sản xuất kiểm tra nhanh các trường hợp ngoại lệ.',
    notes: 'Giúp lọc nhanh các phiếu bất thường để xác minh giải trình.'
  },
  {
    id: 'col_created_source',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'blue',
    columnId: 'createdSource / TicketCreationLocation',
    columnName: 'Nguồn tạo phiếu (Created Source)',
    title: '30. Nguồn tạo phiếu sản xuất (Creation Location)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 14)',
    formula: 'Phân loại nguồn: MES (trạm máy hiện trường) | Bravo ERP | Thủ công',
    source: 'CSDL _ERPProdStatsDetail (Trường: TicketCreationLocation, Source)',
    description:
      'Xác định phiếu được lập tại vị trí nào để kiểm soát tính tuân thủ quy trình số hóa.',
    notes: 'Màu sắc phân biệt: MES (Xanh dương), Bravo/Thủ công (Xám/Cam).'
  },
  {
    id: 'col_auto_export_status',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'cyan',
    columnId: 'autoExportStatus / AutoIoStatus',
    columnName: 'Ghi chú xuất nhập kho tự động (Auto-IO Status)',
    title: '31. Ghi chú xuất nhập kho tự động (Auto-Logistics Status)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 15)',
    formula: 'Trạng thái: "Có XKTĐ, Có NKTĐ" | "Có XKTĐ" | "Có NKTĐ" | "Không áp dụng"',
    source: 'CSDL _ERPProdStatsDetail (Trường: AutoIoStatus, AutoExport, AutoImport)',
    description: 'Ghi nhận việc tự động sinh chứng từ xuất kho nguyên liệu và nhập kho thành phẩm.',
    notes: 'Giúp theo dõi tiến trình liên thông giữa sản xuất và thủ kho.'
  },
  {
    id: 'col_sync_delay_seconds',
    category: 'TABLES',
    categoryName: 'IV. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'cyan',
    columnId: 'syncDelayFormatted / SyncDelayMinutes',
    columnName: 'Độ trễ thời gian đồng bộ (Sync Delay)',
    title: '32. Độ trễ thời gian đồng bộ 2 hệ thống (Sync Delay Time)',
    scope: 'Mục 4.3: Nhật trình chi tiết (Cột 16)',
    formula: 'Độ trễ = MesApprovalTime - TicketCreatedDate (Quy đổi sang HH:mm:ss hoặc số giây)',
    source:
      'CSDL _ERPProdStatsDetail (Trường: SyncDelayMinutes, MesApprovalTime, TicketCreatedDate)',
    description:
      'Khoảng cách thời gian từ lúc MES duyệt phiếu đến khi dữ liệu đồng bộ thành công về CSDL Datahub.',
    notes: 'Màu sắc hiển thị: Xanh lá (≤10s), Xanh dương (11-60s), Cam (>60s).'
  }
]
