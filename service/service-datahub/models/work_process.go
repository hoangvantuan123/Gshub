package models

// WorkProcessRequest represents the user request payload to query Lệnh công đoạn with multi-column and OR/AND criteria
type WorkProcessRequest struct {
	DocNo         string                 `json:"doc_no" form:"doc_no"`                 // Mã lệnh công đoạn / Lệnh tổng (e.g. "CD05-0926-0009")
	ItemCode      string                 `json:"item_code" form:"item_code"`           // Mã mặt hàng (e.g. "FIN-PFB-" hoặc "CAN,FIN")
	ItemCodes     []string               `json:"item_codes" form:"item_codes"`         // Danh sách mã mặt hàng (tìm kiếm theo điều kiện OR)
	ItemName      string                 `json:"item_name" form:"item_name"`           // Tên hàng hóa / vật tư (e.g. "Tờ in")
	ItemNames     []string               `json:"item_names" form:"item_names"`         // Danh sách tên hàng hóa (tìm kiếm theo điều kiện OR)
	Unit          string                 `json:"unit" form:"unit"`                     // Đơn vị tính (e.g. "pcs", "Hộp")
	CustomerName  string                 `json:"customer_name" form:"customer_name"`   // Tên khách hàng
	Description   string                 `json:"description" form:"description"`       // Diễn giải
	ColumnFilters map[string]interface{} `json:"column_filters" form:"column_filters"` // Lọc tự do theo từng cột: { "ItemCode": ["CAN", "FIN"], "ItemName": "Tờ in" }
	RawSSE        map[string]interface{} `json:"raw_sse" form:"raw_sse"`               // Raw Bravo SSE Filter tree nếu client muốn can thiệp trực tiếp
	BranchCode    string                 `json:"branch_code" form:"branch_code"`       // Đơn vị / Chi nhánh (mặc định "A01")
	FiscalYear    string                 `json:"fiscal_year" form:"fiscal_year"`       // Năm tài chính (mặc định "2026")
	ConfigKey     string                 `json:"config_key" form:"config_key"`         // Cấu hình ERP (mặc định "BravoDefault")
	Username      string                 `json:"username" form:"username"`             // User account thực hiện query
	Endpoint      string                 `json:"endpoint" form:"endpoint"`             // Endpoint route hash (mặc định "4e9b7232116b4a4af1b990d81e00a049")
	FetchSteps    *bool                  `json:"fetch_steps" form:"fetch_steps"`       // Có query bước công đoạn TT hay không (mặc định true)
	IncludeRaw    bool                   `json:"include_raw" form:"include_raw"`       // Trả kèm raw response của Bravo
}

// WorkProcessItem contains Master, Detail table, and nested TT Steps
type WorkProcessItem struct {
	Master  map[string]interface{} `json:"master"`
	Details []WorkProcessDetail    `json:"details"`
}

// WorkProcessDetail contains child table row and its process steps
type WorkProcessDetail struct {
	Detail map[string]interface{}   `json:"detail"`
	Steps  []map[string]interface{} `json:"steps"`
}

// WorkProcessResult holds the complete aggregated output
type WorkProcessResult struct {
	DocNo       string                 `json:"doc_no"`
	TotalMaster int                    `json:"total_master"`
	TotalDetail int                    `json:"total_detail"`
	TotalSteps  int                    `json:"total_steps"`
	Data        []WorkProcessItem      `json:"data"`
	Raw         map[string]interface{} `json:"raw,omitempty"`
}

// WorkProcessStepsRequest represents the request to fetch TT steps on demand for a detail row
type WorkProcessStepsRequest struct {
	RowID      string `json:"row_id" form:"row_id" binding:"required"` // RowId của Lệnh CĐ chi tiết e.g. "12262611CD"
	BranchCode string `json:"branch_code" form:"branch_code"`         // Chi nhánh (default "A01")
	FiscalYear string `json:"fiscal_year" form:"fiscal_year"`         // Năm tài chính (default "2026")
	ConfigKey  string `json:"config_key" form:"config_key"`           // Cấu hình ERP (default "BravoDefault")
	Username   string `json:"username" form:"username"`               // Username
	Endpoint   string `json:"endpoint" form:"endpoint"`               // Endpoint (default "4e9b7232116b4a4af1b990d81e00a049")
}
