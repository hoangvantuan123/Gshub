package report

// PlanRegistrationSaveRequest - Đăng ký báo cáo chung từ UI Modal
type PlanRegistrationSaveRequest struct {
	ReportType    string               `json:"reportType"`    // 'plan' | 'statistics'
	FactoryCode   string               `json:"factoryCode"`   // 'GS1' | 'GS5'
	FactoryName   string               `json:"factoryName"`   // Tên nhà máy
	ApplyDate     string               `json:"applyDate"`     // Ngày áp dụng
	RegCode       string               `json:"regCode"`       // Mã đăng ký
	Remark        string               `json:"remark"`
	Status        string               `json:"status"`
	IsDraft       bool                 `json:"isDraft"`
	CreatedBy     string               `json:"createdBy"`     // UserSeq / UserId người đăng ký
	CreatedByName string               `json:"createdByName"` // Tên người đăng ký
	UserSeq       string               `json:"userSeq"`       // UUIDv7 của người dùng
	UserName      string               `json:"userName"`      // Tên hiển thị người dùng
	TotalRows     int                  `json:"totalRows"`     // Tổng số dòng nếu gửi theo chunk
	PlanData      []ERPPlanDetail      `json:"planData"`      // Data KHSX
	StatsData     []ERPProdStatsDetail `json:"statsData"`     // Data TKSX
	SheetData     []map[string]any     `json:"sheetData"`     // Fallback SheetData từ frontend
	Data          []map[string]any     `json:"data"`          // Raw fallback data từ frontend
}

// PlanReportBatchSaveRequest - Batch save KHSX
type PlanReportBatchSaveRequest struct {
	Master *ERPPlanMaster  `json:"master,omitempty"`
	Items  []ERPPlanDetail `json:"items"`
}

// StatsReportBatchSaveRequest - Batch save TKSX
type StatsReportBatchSaveRequest struct {
	Master *ERPPlanMaster       `json:"master,omitempty"`
	Items  []ERPProdStatsDetail `json:"items"`
}

// PlanPageInfo - Thông tin phân trang & tổng bản ghi
type PlanPageInfo struct {
	Page         int   `json:"page"`
	PageSize     int   `json:"pageSize"`
	Total        int64 `json:"total"`
	TotalAll     int64 `json:"totalAll"`
	TotalPages   int   `json:"totalPages"`
	LoadedCount  int   `json:"loadedCount"`
	TotalColumns int   `json:"totalColumns"`
}
