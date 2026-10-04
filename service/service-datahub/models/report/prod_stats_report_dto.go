package report

// ProdStatsSummary: Chỉ số KPI Cards tổng hợp toàn bộ báo cáo theo đúng Sổ tay công thức
type ProdStatsSummary struct {
	TotalTickets          int     `json:"totalTickets"`
	TotalPlanQty          float64 `json:"totalPlanQty"`
	TotalActualQty        float64 `json:"totalActualQty"`
	TotalPassQty          float64 `json:"totalPassQty"`
	TotalDefectQty        float64 `json:"totalDefectQty"`
	OverallPassRate       float64 `json:"overallPassRate"`       // % Đạt = (TotalPass / TotalActual) * 100
	AvgPassRate           float64 `json:"avgPassRate"`           // Alias % Đạt
	PlanCompletionRate    float64 `json:"planCompletionRate"`    // % Hoàn thành = (TotalActual / TotalPlan) * 100
	TotalRuntimeHours     float64 `json:"totalRuntimeHours"`     // Tổng giờ chạy máy
	AvgRuntimeHours       float64 `json:"avgRuntimeHours"`       // Trung bình giờ chạy máy / phiếu
	MesCreatedCount       int     `json:"mesCreatedCount"`       // Số phiếu tạo qua MES
	BravoCreatedCount     int     `json:"bravoCreatedCount"`     // Số phiếu tạo nguồn khác
	MesRate               float64 `json:"mesRate"`               // Tỷ lệ số hóa MES (%)
	AutoExportCount       int     `json:"autoExportCount"`       // Số phiếu có XKTĐ / NKTĐ
	NoAutoExportCount     int     `json:"noAutoExportCount"`     // Số phiếu thiếu chứng từ
	NoMaterialCount       int     `json:"noMaterialCount"`       // Không sử dụng NVL
	AutoExportRate        float64 `json:"autoExportRate"`        // Tỷ lệ chứng từ tự động (%)
	RuntimeUnder5Min      int     `json:"runtimeUnder5Min"`      // Thao tác < 5 phút
	RuntimeNormal         int     `json:"runtimeNormal"`         // Thao tác chuẩn 5p - 12h
	RuntimeOver12hCheck   int     `json:"runtimeOver12hCheck"`   // Chạy > 12h cần kiểm tra (<50k SP)
	CountCompleted        int     `json:"countCompleted"`
	CountRunning          int     `json:"countRunning"`
	AvgSyncDelaySeconds   float64 `json:"avgSyncDelaySeconds"`   // Độ trễ đồng bộ trung bình (giây)
	AvgSyncDelayFormatted string  `json:"avgSyncDelayFormatted"` // Độ trễ format HH:mm:ss
	TotalDays             int     `json:"totalDays"`             // Tổng số ngày trong chu kỳ báo cáo
	StandardCapacityHours float64 `json:"standardCapacityHours"` // Định mức công suất tối đa chu kỳ = TotalDays * 24h
	FromDate              string  `json:"fromDate"`
	ToDate                string  `json:"toDate"`
}

// TeamStatAggregate: Bảng ma trận & biểu đồ theo Tổ sản xuất
type TeamStatAggregate struct {
	TeamName          string  `json:"teamName"`
	TeamCode          string  `json:"teamCode"`
	TicketCount       int     `json:"ticketCount"`
	PlanQty           float64 `json:"planQty"`
	ActualQty         float64 `json:"actualQty"`
	TotalActualQty    float64 `json:"totalActualQty"`    // Alias cho FE Table 2
	PassQty           float64 `json:"passQty"`
	TotalPassQty      float64 `json:"totalPassQty"`      // Alias cho FE Table 2
	DefectQty         float64 `json:"defectQty"`
	TotalDefectQty    float64 `json:"totalDefectQty"`    // Alias cho FE Table 2
	PassRate          float64 `json:"passRate"`          // % Đạt
	RuntimeHours      float64 `json:"runtimeHours"`      // Tổng giờ chạy
	TotalRuntimeHours float64 `json:"totalRuntimeHours"` // Alias cho FE
	MesCount          int     `json:"mesCount"`          // Số phiếu MES
	MesRate           float64 `json:"mesRate"`           // % MES
	Under5Min         int     `json:"under5Min"`         // Alias cho FE Table 2
	Under5MinCount    int     `json:"under5MinCount"`    // Số đơn < 5 phút
	Anomalies         int     `json:"anomalies"`         // Alias cho FE Table 2
	Over12hCheckCount int     `json:"over12hCheckCount"` // Số đơn > 12h cần KT
	AutoExportPass    int     `json:"autoExportPass"`
	AutoExportMissing int     `json:"autoExportMissing"`
	AutoExportRate    float64 `json:"autoExportRate"` // % Chứng từ tự động
}

// MachineStatAggregate: Bảng ma trận & biểu đồ theo Cụm máy
type MachineStatAggregate struct {
	MachineCode           string  `json:"machineCode"`
	MachineName           string  `json:"machineName"`
	TeamName              string  `json:"teamName"`
	TicketCount           int     `json:"ticketCount"`
	PlanQty               float64 `json:"planQty"`
	ActualQty             float64 `json:"actualQty"`
	TotalActualQty        float64 `json:"totalActualQty"`
	PassQty               float64 `json:"passQty"`
	TotalPassQty          float64 `json:"totalPassQty"`
	DefectQty             float64 `json:"defectQty"`
	TotalDefectQty        float64 `json:"totalDefectQty"`
	PassRate              float64 `json:"passRate"`
	RuntimeHours          float64 `json:"runtimeHours"`
	TotalRuntimeHours     float64 `json:"totalRuntimeHours"`
	IsOver24h             bool    `json:"isOver24h"` // Cảnh báo quá tải > định mức chu kỳ
	IsManual              bool    `json:"isManual"`  // Máy thủ công
	Under5Min             int     `json:"under5Min"`
	Under5MinCount        int     `json:"under5MinCount"`
	Anomalies             int     `json:"anomalies"`
	Over12hCheckCount     int     `json:"over12hCheckCount"`
	MesCount              int     `json:"mesCount"`
	MesRate               float64 `json:"mesRate"`
	AutoExportRate        float64 `json:"autoExportRate"`
	StandardCapacityHours float64 `json:"standardCapacityHours"`
	RuntimeVsCapacity     float64 `json:"runtimeVsCapacity"`
	AvgDailyHours         float64 `json:"avgDailyHours"`
}

// DailyStatAggregate: Dữ liệu xu hướng theo Ngày
type DailyStatAggregate struct {
	Date              string  `json:"date"`
	PlanQty           float64 `json:"planQty"`
	ActualQty         float64 `json:"actualQty"`
	TotalActualQty    float64 `json:"totalActualQty"`
	PassQty           float64 `json:"passQty"`
	TotalPassQty      float64 `json:"totalPassQty"`
	DefectQty         float64 `json:"defectQty"`
	TotalDefectQty    float64 `json:"totalDefectQty"`
	PassRate          float64 `json:"passRate"`
	RuntimeHours      float64 `json:"runtimeHours"`
	TotalRuntimeHours float64 `json:"totalRuntimeHours"`
	TicketCount       int     `json:"ticketCount"`
}

// SyncDelayGroupItem: Nhóm độ trễ đồng bộ
type SyncDelayGroupItem struct {
	Group      string  `json:"group"`
	ShortGroup string  `json:"shortGroup"`
	Count      int     `json:"count"`
	Rate       float64 `json:"rate"`
	Color      string  `json:"color"`
}

// AutoExportGroupItem: Nhóm phân loại chứng từ tự động
type AutoExportGroupItem struct {
	Label string  `json:"label"`
	Count int     `json:"count"`
	Rate  float64 `json:"rate"`
	Color string  `json:"color"`
}

// FilterOptionList: Danh sách dropdown bộ lọc độc nhất do BE trích xuất sẵn
type FilterOptionList struct {
	Teams    []string `json:"teams"`
	Machines []string `json:"machines"`
	Shifts   []string `json:"shifts"`
	Dates    []string `json:"dates"`
}

// ProdStatsDetailReportItem: Bản ghi chi tiết TKSX kế thừa toàn bộ cấu trúc bảng DB _ERPProdStatsDetail + các chỉ số tính toán cho Báo cáo
type ProdStatsDetailReportItem struct {
	ERPProdStatsDetail
	Id              *string  `json:"id,omitempty"`
	TicketNo        *string  `json:"ticketNo,omitempty"`
	DocNo           *string  `json:"docNo,omitempty"`
	OrderNoVal      *string  `json:"orderNo,omitempty"`
	Team            *string  `json:"team,omitempty"`
	TeamNameVal     *string  `json:"teamName,omitempty"`
	MachineNameVal  *string  `json:"machineName,omitempty"`
	MachineCodeVal  *string  `json:"machineCode,omitempty"`
	PlanQtyVal      *float64 `json:"planQty,omitempty"`
	ActualQtyVal    *float64 `json:"actualQty,omitempty"`
	PassQtyVal      *float64 `json:"passQty,omitempty"`
	DefectQtyVal    *float64 `json:"defectQty,omitempty"`
	DurationMinutes *float64 `json:"DurationMinutes,omitempty"`
	DurationMinVal  *float64 `json:"durationMinutes,omitempty"`
	RuntimeHours    *float64 `json:"RuntimeHours,omitempty"`
	RuntimeHoursVal *float64 `json:"runtimeHours,omitempty"`
	AuditCategory   *string  `json:"AuditCategory,omitempty"`
	PassRate        *float64 `json:"PassRate,omitempty"`
	PassRateVal     *float64 `json:"passRate,omitempty"`
	ProdDateVal     *string  `json:"prodDate,omitempty"`
	StartTimeVal    *string  `json:"startTime,omitempty"`
	EndTimeVal      *string  `json:"endTime,omitempty"`
	CreatedSource   *string  `json:"createdSource,omitempty"`
	Supervisor      *string  `json:"supervisor,omitempty"`
	StatusVal       *string  `json:"status,omitempty"`
}

// ProdStatsReportResponse: Toàn bộ kết quả trả về cho FE
type ProdStatsReportResponse struct {
	Summary             ProdStatsSummary            `json:"summary"`
	ChartByTeam         []TeamStatAggregate         `json:"chartByTeam"`
	TeamBreakdown       []TeamStatAggregate         `json:"teamBreakdown"`
	ChartByMachine      []MachineStatAggregate      `json:"chartByMachine"`
	MachineBreakdown    []MachineStatAggregate      `json:"machineBreakdown"`
	ChartByDay          []DailyStatAggregate        `json:"chartByDay"`
	DailyTrendData      []DailyStatAggregate        `json:"dailyTrendData"`
	DailyAggregates     []DailyStatAggregate        `json:"dailyAggregates"`
	SyncDelayBreakdown  []SyncDelayGroupItem        `json:"syncDelayBreakdown"`
	AutoExportBreakdown []AutoExportGroupItem       `json:"autoExportBreakdown"`
	FilterOptions       FilterOptionList            `json:"filterOptions"`
	Items               []ProdStatsDetailReportItem `json:"items"`
	Pagination          PlanPageInfo                `json:"pagination"`
}
