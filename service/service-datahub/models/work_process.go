package models

// WorkProcessRequest represents the user request payload to query Lệnh công đoạn with multi-column and OR/AND criteria
type WorkProcessRequest struct {
	StageOrderNo    string                 `json:"stage_order_no" form:"stage_order_no"`       // Lệnh công đoạn (Detail: DocNo_Detail)
	DocNo           string                 `json:"doc_no" form:"doc_no"`                       // Mã lệnh tổng (Master: Ct.DocNo)
	ItemCode        string                 `json:"item_code" form:"item_code"`                 // Mã mặt hàng (Detail: ItemCode)
	ItemCodes       []string               `json:"item_codes" form:"item_codes"`               // Danh sách mã mặt hàng (tìm kiếm theo điều kiện OR)
	ItemName        string                 `json:"item_name" form:"item_name"`                 // Tên hàng hóa / vật tư (Detail: ItemName)
	ItemNames       []string               `json:"item_names" form:"item_names"`               // Danh sách tên hàng hóa (tìm kiếm theo điều kiện OR)
	Unit            string                 `json:"unit" form:"unit"`                           // Đơn vị tính (Detail: Unit)
	WorkProcessCode string                 `json:"work_process_code" form:"work_process_code"` // Mã quy trình CĐ (Master: WorkProcessCode)
	ProductTypeName string                 `json:"product_type_name" form:"product_type_name"` // Loại sản phẩm (Master: ProductTypeName)
	CustomerName    string                 `json:"customer_name" form:"customer_name"`         // Tên khách hàng (Master: CustomerName)
	FactoryName     string                 `json:"factory_name" form:"factory_name"`           // Tên nhà máy / Chi nhánh (Master: FactoryName)
	Description     string                 `json:"description" form:"description"`             // Diễn giải (Master: Description)
	ColumnFilters   map[string]interface{} `json:"column_filters" form:"column_filters"`       // Lọc tự do theo từng cột: { "ItemCode": ["CAN", "FIN"], "ItemName": "Tờ in" }
	RawSSE          map[string]interface{} `json:"raw_sse" form:"raw_sse"`                     // Raw Bravo SSE Filter tree nếu client muốn can thiệp trực tiếp
	BranchCode      string                 `json:"branch_code" form:"branch_code"`             // Đơn vị / Chi nhánh (mặc định "A01", hoặc rỗng để lấy tất cả)
	FiscalYear      string                 `json:"fiscal_year" form:"fiscal_year"`             // Năm tài chính (mặc định "2026")
	ConfigKey       string                 `json:"config_key" form:"config_key"`               // Cấu hình ERP (mặc định "BravoDefault")
	MenuKey         string                 `json:"menu_key" form:"menu_key"`                   // Mã định danh Menu (vd: "production_work_process")
	ApiKey          string                 `json:"api_key" form:"api_key"`                     // Mã định danh API (vd: "WorkDocCD")
	EndpointKey     string                 `json:"endpoint_key" form:"endpoint_key"`           // Mã định danh Endpoint (vd: "WorkDocCD_Master")
	Username        string                 `json:"username" form:"username"`                   // User account thực hiện query
	Endpoint        string                 `json:"endpoint" form:"endpoint"`                   // Endpoint route hash (nếu ghi đè trực tiếp)
	IncludeRaw      bool                   `json:"include_raw" form:"include_raw"`             // Trả kèm raw response của Bravo
	Page            int                    `json:"page" form:"page"`                           // Số trang cần lấy (0-indexed: 0, 1, 2... tương ứng pnb của Bravo)
	PageSize        int                    `json:"page_size" form:"page_size"`                 // Kích thước trang
	Token           string                 `json:"token,omitempty" form:"token"`               // Bearer Token trực tiếp từ FE
}

// WorkProcessItem contains Master and Detail table
type WorkProcessItem struct {
	Master  map[string]interface{} `json:"master"`
	Details []WorkProcessDetail    `json:"details"`
}

// WorkProcessDetail contains child table row
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
	TotalCount  int                    `json:"total_count"` // Tổng số bản ghi thực tế trên Bravo ERP (opv[0])
	Page        int                    `json:"page"`        // Trang hiện tại (0-indexed)
	PageSize    int                    `json:"page_size"`   // Số dòng mỗi trang
	HasMore     bool                   `json:"has_more"`    // Còn trang để tải tiếp hay không
	Data        []WorkProcessItem      `json:"data"`
	Raw         map[string]interface{} `json:"raw,omitempty"`
}
