// Sổ tay cơ sở dữ liệu công thức, nguồn dữ liệu và vị trí áp dụng
export const FORMULA_DATABASE = [
  {
    id: 'kpi_total_tickets',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'blue',
    title: '1. Tổng phiếu thống kê (Report Records Count)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 1)',
    formula: 'Tổng số phiếu = Count(ticketCode) trong kỳ lọc',
    source: 'CSDL Đồng bộ KHSX & Hệ thống MES (ticketCode / source)',
    description:
      'Phản ánh tổng lượng tác nghiệp ghi nhận số liệu sản xuất thực tế tại hiện trường sau khi áp dụng các bộ lọc ngày, máy, tổ và thời gian thao tác.',
    notes:
      'Phân tách rõ số phiếu lập trực tiếp từ thiết bị MES tại hiện trường so với các nguồn khác.'
  },
  {
    id: 'kpi_over_12h_check',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'amber',
    title: '2. Thời gian chạy máy > 12h (Cần kiểm tra)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 2) & Mục 3.2',
    formula: 'Số phiếu có Thời gian chạy máy > 12h và Sản lượng < 50.000 SP',
    source: 'Trường runtimeHours / durationMinutes đối chiếu với output / plan',
    description:
      'Cảnh báo các phiếu thống kê sản xuất có thời gian chạy máy kéo dài bất thường so với quy mô đơn hàng, cần Quản lý sản xuất kiểm tra nhật trình máy và giải trình nguyên nhân.',
    notes: 'Bấm vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu cần kiểm tra.'
  },
  {
    id: 'kpi_under_5min',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'red',
    title: '3. Thao tác < 5 phút (Thao tác nhanh)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 3) & Mục 3.2',
    formula: 'Số phiếu có Thời gian thao tác < 5 phút',
    source: 'Trường durationMinutes / khoảng cách thời gian giữa giờ bắt đầu và kết thúc',
    description:
      'Cảnh báo các phiếu thống kê thao tác quá vội vàng hoặc nạp hàng loạt sau ca, cần kiểm tra và chuẩn hóa thao tác đúng quy trình vận hành MES.',
    notes: 'Bấm vào thẻ để mở cửa sổ tra cứu chi tiết danh sách phiếu thao tác nhanh.'
  },
  {
    id: 'kpi_mes_rate',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'blue',
    title: '4. Tỷ lệ số hóa quy trình qua MES (MES Digitalization Rate)',
    scope: 'Mục I: Thẻ KPI Tổng quan (Ô 4)',
    formula: 'Tỷ lệ MES (%) = (Số phiếu tạo trực tiếp trên MES / Tổng số phiếu) × 100%',
    source: 'Cờ định danh isMesOrigin hoặc trường source từ cổng nạp dữ liệu MES',
    description:
      'Đo lường mức độ chuẩn hóa số hóa và tự động hóa quy trình sản xuất tại hiện trường, loại bỏ hoàn toàn việc ghi chép sổ sách thủ công.',
    notes: 'Mục tiêu vận hành: Duy trì 100% phiếu lập trực tiếp tại trạm máy.'
  },
  {
    id: 'kpi_sync_latency',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'cyan',
    title: '5. Độ trễ thời gian đồng bộ 2 hệ thống (Sync Latency)',
    scope: 'Mục I: Biểu đồ Tiến trình Đồng bộ (Khung 1)',
    formula: 'Độ trễ trung bình = Avg(Timestamp đồng bộ CSDL - Timestamp hoàn thành ca máy)',
    source: 'Mô-đun Real-time Data Sync Engine (Cột: Độ trễ thời gian đồng bộ 2 hệ)',
    description:
      'Đánh giá tính tức thời và độ tin cậy của luồng dữ liệu truyền từ máy trạm sản xuất về máy chủ điều hành trung tâm.',
    notes:
      'Thời gian đồng bộ lý tưởng: < 10 giây. Hệ thống phân nhóm trực quan: ≤10s, 11–30s, 31–60s, >60s (Độ trễ cao) và Không đồng bộ (trống).'
  },
  {
    id: 'kpi_auto_export',
    category: 'KPI',
    categoryName: 'I. Thẻ KPI Điều hành',
    badgeColor: 'cyan',
    title: '6. Tỷ lệ liên kết chứng từ tự động (Auto-Logistics Rate)',
    scope: 'Mục I: Biểu đồ Phân bổ Loại Ghi chú Tự động (Khung 2)',
    formula:
      'Tỷ lệ tự động (%) = (Số phiếu có trạng thái sinh phiếu tự động / Tổng số phiếu) × 100%',
    source: 'Cột: Ghi chú xuất kho tự động (Trường autoIoStatus)',
    description:
      'Theo dõi mức độ liên thông tự động giữa dữ liệu sản xuất phân xưởng với nghiệp vụ quản lý kho thành phẩm và vật tư.',
    notes:
      'Toàn bộ phân loại loại hình (Có XKTĐ, Có NKTĐ, Chưa sinh...) được tổng hợp 100% linh động từ dữ liệu thực tế.'
  },
  {
    id: 'chart_machine_runtime',
    category: 'CHART',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'orange',
    title: '7. Thống kê giờ chạy máy & Cảnh báo bất thường (Machine Runtime Audit)',
    scope: 'Mục I: Biểu đồ Giờ chạy máy theo cụm máy',
    formula: 'Tổng giờ chạy máy i = Sum(runtimeHours của máy i trong kỳ)',
    source: 'Tổng hợp từ toàn bộ phiếu thống kê của từng máy trong kỳ lọc',
    description:
      'Đánh giá tổng thời gian vận hành thực tế của từng cụm máy, tự động phát hiện các thiết bị có tổng giờ chạy > 24.0h/ngày (vượt giới hạn vật lý) hoặc có sự bất thường về thời gian so với số phiếu.',
    notes:
      'Đường giới hạn vật lý 1 ngày (24.0h) được hiển thị nét đứt màu đỏ. Các máy vượt 24h được tô màu cảnh báo đỏ đậm.'
  },
  {
    id: 'chart_machine_tickets',
    category: 'CHART',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'orange',
    title: '8. Số lượng phiếu thống kê theo cụm máy (Machine Tickets Count)',
    scope: 'Mục I: Biểu đồ Giờ chạy & Số phiếu (Kết hợp)',
    formula: 'Số phiếu máy i = Count(phiếu của máy i trong kỳ)',
    source: 'Trường ticketCode / mã phiếu thống kê của từng cụm máy',
    description:
      'Đo lường tần suất tác nghiệp và số lượng phiếu phát sinh tại từng cụm máy, đối chiếu với tổng giờ chạy để tính giờ bình quân mỗi phiếu.',
    notes: 'Đơn vị tính: Phiếu.'
  },
  {
    id: 'chart_runtime_audit',
    category: 'CHART',
    categoryName: 'II. Biểu đồ Phân tích & Ma trận',
    badgeColor: 'orange',
    title: '9. Kiểm toán kỷ luật thời gian vận hành (Runtime Discipline Audit)',
    scope: 'Mục II: Biểu đồ 2 & Ma trận 4 Thẻ Quyết Định QLSX',
    formula:
      'Phân nhóm thời gian: Thao tác < 5p (Cảnh báo), Chuẩn (5p - 12h), Đơn lớn > 12h (SL ≥ 50k - Chuẩn), Đơn nhỏ > 12h (Cảnh báo)',
    source: 'Khoảng chênh lệch: Thời gian bắt đầu (startTime) - Thời gian kết thúc (endTime)',
    description:
      'Ngăn chặn gian lận thao tác, nhập vội hoặc quên kết thúc ca máy, nâng cao kỷ luật quản trị nhà máy chuẩn MES.',
    notes:
      'Hệ thống tự động kích hoạt cảnh báo trực tiếp gửi Phân xưởng trưởng đối với các đơn hàng bất thường.'
  },
  {
    id: 'table_machine_ratio24h',
    category: 'TABLE',
    categoryName: 'III. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    title: '10. Hệ số khai thác máy so với 24 giờ (Machine Utilization vs 24h)',
    scope: 'Mục IV: 4.1. Ma trận năng lực cụm máy (Cột: So với 24 giờ)',
    formula: 'Hệ số 24h (%) = (Tổng giờ chạy của máy / 24 giờ) × 100%',
    source: 'Trường runtimeHours trên mỗi máy',
    description:
      'Đo lường tỷ lệ tận dụng công suất khả dụng trong 1 ngày làm việc (24h) của từng thiết bị.',
    notes: 'Màu sắc trực quan: > 50% hiển thị màu xanh lá đậm (khai thác cao).'
  },
  {
    id: 'table_team_plan_rate',
    category: 'TABLE',
    categoryName: 'III. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    title: '11. Tỷ lệ hoàn thành kế hoạch theo tổ (Team Plan Completion Rate)',
    scope: 'Mục IV: 4.2. Phân tích đối chiếu theo tổ (Cột: Đạt KH)',
    formula: 'Đạt KH (%) = (Tổng SL Thực tế của tổ / Tổng SL Kế hoạch của tổ) × 100%',
    source: 'Tổng hợp sản lượng thực tế và kế hoạch giao cho từng tổ sản xuất',
    description:
      'Đánh giá mức độ hoàn thành nhiệm vụ và kỷ luật sản xuất của từng tổ trưởng và công nhân đứng máy.',
    notes: 'Định mức chuẩn: ≥ 95% (Đạt tiến độ), < 95% (Cần đôn đốc tăng ca).'
  },
  {
    id: 'table_audit_status_badge',
    category: 'TABLE',
    categoryName: 'III. Bảng biểu Chi tiết (Glide Data Grid)',
    badgeColor: 'green',
    title: '12. Phân loại kiểm toán tác nghiệp (QLSX Audit Status)',
    scope: 'Mục IV: 4.3. Nhật trình chi tiết phiếu (Cột: Kiểm toán QLSX)',
    formula:
      'IF(duration < 5p, "< 5p Nhập nhanh", IF(duration > 720p AND actual >= 50k, "> 12h Đơn lớn (Chuẩn)", IF(duration > 720p, "> 12h Cần kiểm tra", "Chuẩn tiến độ")))',
    source: 'Tính toán trực tiếp từ thời gian chạy và sản lượng thực tế của từng phiếu',
    description:
      'Gắn nhãn đối soát tự động cho từng phiếu thống kê, giúp Quản lý sản xuất kiểm tra nhanh các trường hợp ngoại lệ.',
    notes: 'Toàn bộ dữ liệu hiển thị rõ ràng, hỗ trợ sao chép TSV và xuất Excel độc lập từng bảng.'
  }
]
