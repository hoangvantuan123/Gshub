package report

// ====================================================================
// BÁO CÁO KẾ HOẠCH SẢN XUẤT (PLAN REPORT DTO & RESPONSE MODELS)
// ====================================================================

// PlanReportSummary: Chỉ số KPI Cards tổng quan của Báo cáo KHSX
type PlanReportSummary struct {
	TotalOrders     int     `json:"totalOrders"`     // Tổng số lệnh điều phối (lệnh thao tác)
	TotalTickets    int     `json:"totalTickets"`    // Alias cho FE
	TotalPlanQty    float64 `json:"totalPlanQty"`    // Tổng sản lượng kế hoạch giao
	TotalActualQty  float64 `json:"totalActualQty"`  // Tổng sản lượng thực tế máy đạt được
	TotalPassQty    float64 `json:"totalPassQty"`    // Tổng sản lượng đạt chuẩn
	OverallProgress float64 `json:"overallProgress"` // % Tiến độ hoàn thành = (TotalActual / TotalPlan) * 100
	AvgPassRate     float64 `json:"avgPassRate"`     // % Đạt bình quân
	TotalItems      int     `json:"totalItems"`      // Số mã mặt hàng (SKU)
	SxSaiNgayCount  int     `json:"sxSaiNgayCount"`  // Số lệnh SX sai ngày KH
	SxSaiNgayRate   float64 `json:"sxSaiNgayRate"`   // % Lệnh SX sai ngày KH
	TruotKhCount    int     `json:"truotKhCount"`    // Số lệnh Trượt KH
	TruotKhRate     float64 `json:"truotKhRate"`     // % Lệnh Trượt KH
	KhopSlCount     int     `json:"khopSlCount"`     // Số lệnh Khớp số lượng
	KhopSlRate      float64 `json:"khopSlRate"`      // % Lệnh Khớp số lượng
	KhopJobCount    int     `json:"khopJobCount"`    // Số lệnh Khớp job
	KhopJobRate     float64 `json:"khopJobRate"`     // % Lệnh Khớp job
	TotalDays       int     `json:"totalDays"`       // Số ngày trong kỳ báo cáo
	FromDate        string  `json:"fromDate"`
	ToDate          string  `json:"toDate"`
}

// PlanStatusBreakdownItem: Nhóm phân loại trạng thái (ĐP-SX, Thời gian, Capa)
type PlanStatusBreakdownItem struct {
	Name  string  `json:"name"`  // Tên phân loại (ví dụ: 'SX sai ngày KH', 'Chậm hơn ĐM')
	Count int     `json:"count"` // Số lượng lệnh
	Rate  float64 `json:"rate"`  // Tỷ lệ %
	Color string  `json:"color"` // Mã màu biểu đồ
	Tag   string  `json:"tag"`   // Thẻ chú thích
}

// PicPlanAggregate: Thống kê hiệu suất theo PIC Điều Phối
type PicPlanAggregate struct {
	Pic               string  `json:"pic"`               // Tên nhân sự điều phối
	PicName           string  `json:"picName"`           // Alias
	TotalOrders       int     `json:"totalOrders"`       // Tổng số lệnh giao
	PlanQty           float64 `json:"planQty"`           // Sản lượng kế hoạch
	ActualQty         float64 `json:"actualQty"`         // Sản lượng thực tế
	PassRate          float64 `json:"passRate"`          // % Hoàn thành
	SxSaiNgayCount    int     `json:"sxSaiNgayCount"`    // Lệnh sai ngày
	SxSaiNgayRate     float64 `json:"sxSaiNgayRate"`     // % Lệnh sai ngày
	TruotKhCount      int     `json:"truotKhCount"`      // Lệnh trượt
	TruotKhRate       float64 `json:"truotKhRate"`       // % Lệnh trượt
	KhopSlCount       int     `json:"khopSlCount"`       // Lệnh khớp SL
	KhopSlRate        float64 `json:"khopSlRate"`        // % Lệnh khớp SL
	KhopJobCount      int     `json:"khopJobCount"`      // Lệnh khớp job
	KhopJobRate       float64 `json:"khopJobRate"`       // % Lệnh khớp job
	PassBenchmarkRate float64 `json:"passBenchmarkRate"` // % Khớp tổng cộng (Khớp SL + Khớp Job)
	KhopRate          float64 `json:"khopRate"`          // Alias % Khớp tổng cộng
}

// TeamPlanAggregate: Thống kê theo Tổ Sản Xuất
type TeamPlanAggregate struct {
	TeamName    string  `json:"teamName"`    // Tên tổ sản xuất
	TeamCode    string  `json:"teamCode"`    // Mã tổ
	TotalOrders int     `json:"totalOrders"` // Số lệnh
	PlanQty     float64 `json:"planQty"`     // Sản lượng KH
	ActualQty   float64 `json:"actualQty"`   // Sản lượng TT
	PassRate    float64 `json:"passRate"`    // % Đạt
}

// MachinePlanAggregate: Thống kê theo Thiết Bị / Cụm Máy
type MachinePlanAggregate struct {
	MachineCode string  `json:"machineCode"` // Mã máy
	MachineName string  `json:"machineName"` // Tên máy
	TeamName    string  `json:"teamName"`    // Tên tổ
	TotalOrders int     `json:"totalOrders"` // Số lệnh
	PlanQty     float64 `json:"planQty"`     // Sản lượng KH
	ActualQty   float64 `json:"actualQty"`   // Sản lượng TT
	PassRate    float64 `json:"passRate"`    // % Đạt
}

// DailyPlanAggregate: Thống kê xu hướng tiến độ theo Ngày
type DailyPlanAggregate struct {
	Date       string  `json:"date"`       // Ngày (YYYY-MM-DD)
	PlanQty    float64 `json:"planQty"`    // Sản lượng KH
	ActualQty  float64 `json:"actualQty"`  // Sản lượng TT
	OrderCount int     `json:"orderCount"` // Số lệnh
	PassRate   float64 `json:"passRate"`   // % Đạt
}

// PlanMasterOption: Thông tin rút gọn đợt kế hoạch để đổ vào dropdown filter trên FE
type PlanMasterOption struct {
	RegCode     string `json:"regCode"`
	MasterSeq   string `json:"masterSeq"`
	FactoryCode string `json:"factoryCode"`
	FactoryName string `json:"factoryName"`
	ApplyDate   string `json:"applyDate"`
	Remark      string `json:"remark"`
	TotalRows   int    `json:"totalRows"`
}

// PlanFilterOptionList: Danh sách bộ lọc động
type PlanFilterOptionList struct {
	Factories   []string           `json:"factories"`
	PlanMasters []PlanMasterOption `json:"planMasters"`
	Pics        []string           `json:"pics"`
	Teams       []string           `json:"teams"`
	Machines    []string           `json:"machines"`
	Dates       []string           `json:"dates"`
}

// PlanDetailReportItem: Bản ghi chi tiết kế hoạch sản xuất mở rộng
type PlanDetailReportItem struct {
	ERPPlanDetail
	Id             *string  `json:"id,omitempty"`
	DocNo          *string  `json:"docNo,omitempty"`
	OrderNoVal     *string  `json:"orderNo,omitempty"`
	PlanNoVal      *string  `json:"planNo,omitempty"`
	PicVal         *string  `json:"pic,omitempty"`
	MachineCodeVal *string  `json:"machineCode,omitempty"`
	MachineNameVal *string  `json:"machineName,omitempty"`
	TeamNameVal    *string  `json:"teamName,omitempty"`
	TeamVal        *string  `json:"team,omitempty"`
	PlanQtyVal     *float64 `json:"planQty,omitempty"`
	ActualQtyVal   *float64 `json:"actualQty,omitempty"`
	PassQtyVal     *float64 `json:"passQty,omitempty"`
	DefectQtyVal   *float64 `json:"defectQty,omitempty"`
	PassRateVal    *float64 `json:"passRate,omitempty"`
	PlanDateVal    *string  `json:"planDate,omitempty"`
	ActualDateVal  *string  `json:"actualDate,omitempty"`
	DpStatusCode   *string  `json:"dpStatusCode,omitempty"`
	DpStatusText   *string  `json:"dpStatusText,omitempty"`
	TimeStatusText *string  `json:"timeStatusText,omitempty"`
	CapaStatusText *string  `json:"capaStatusText,omitempty"`
}

// PlanReportResponse: Cấu trúc dữ liệu đầy đủ trả về cho Frontend
type PlanReportResponse struct {
	Summary             PlanReportSummary         `json:"summary"`
	DpStatusBreakdown   []PlanStatusBreakdownItem `json:"dpStatusBreakdown"`
	TimeStatusBreakdown []PlanStatusBreakdownItem `json:"timeStatusBreakdown"`
	CapaStatusBreakdown []PlanStatusBreakdownItem `json:"capaStatusBreakdown"`
	PicBreakdown        []PicPlanAggregate        `json:"picBreakdown"`
	TeamBreakdown       []TeamPlanAggregate       `json:"teamBreakdown"`
	MachineBreakdown    []MachinePlanAggregate    `json:"machineBreakdown"`
	DailyTrendData      []DailyPlanAggregate      `json:"dailyTrendData"`
	FilterOptions       PlanFilterOptionList      `json:"filterOptions"`
	Items               []PlanDetailReportItem    `json:"items"`
	Pagination          PlanPageInfo              `json:"pagination"`
}
