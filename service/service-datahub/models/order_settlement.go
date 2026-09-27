package models

// OrderSettlementRequest represents search criteria for Order Settlement
type OrderSettlementRequest struct {
	ConfigKey     string                 `json:"config_key,omitempty"`
	MenuKey       string                 `json:"menu_key,omitempty"`
	ApiKey        string                 `json:"api_key,omitempty"`
	Username      string                 `json:"username,omitempty"`
	BranchCode    string                 `json:"branch_code,omitempty"`
	FiscalYear    string                 `json:"fiscal_year,omitempty"`
	StageOrderNo  string                 `json:"stage_order_no,omitempty"`
	ItemCode      string                 `json:"item_code,omitempty"`
	ItemCodes     []string               `json:"item_codes,omitempty"`
	ItemName      string                 `json:"item_name,omitempty"`
	ItemNames     []string               `json:"item_names,omitempty"`
	OperationCode string                 `json:"operation_code,omitempty"`
	Status        string                 `json:"status,omitempty"`
	FactoryName   string                 `json:"factory_name,omitempty"`
	ColumnFilters map[string]interface{} `json:"column_filters,omitempty"`
	RawSSE        map[string]interface{} `json:"raw_sse,omitempty"`
	Page          int                    `json:"page,omitempty"`
	PageSize      int                    `json:"page_size,omitempty"`
	IncludeRaw    bool                   `json:"include_raw,omitempty"`
	Token         string                 `json:"token,omitempty"`
}

// OrderSettlementFlatItem represents one row matching FE MOCK_SETTLEMENT_FLAT_DATA structure
type OrderSettlementFlatItem struct {
	ID                    string  `json:"id"`
	WorkingTag            string  `json:"WorkingTag"`
	StageOrderNo          string  `json:"StageOrderNo"`
	ItemCode              string  `json:"ItemCode"`
	ItemName              string  `json:"ItemName"`
	DoRequiredQty         float64 `json:"DoRequiredQty"`
	InitialAdjustQty      float64 `json:"InitialAdjustQty"`
	AdjustedRequiredQty   float64 `json:"AdjustedRequiredQty"`
	WasteCompensationQty  float64 `json:"WasteCompensationQty"`
	ProductionRequiredQty float64 `json:"ProductionRequiredQty"`
	IsSettled             bool    `json:"IsSettled"`
	SettlementQty         float64 `json:"SettlementQty"`
	DetailNo              string  `json:"DetailNo"`
	OperationCode         string  `json:"OperationCode"`
	OperationName         string  `json:"OperationName,omitempty"`
	PlannedAchievedQty    float64 `json:"PlannedAchievedQty"`
	PlannedProductionQty  float64 `json:"PlannedProductionQty"`
	StatAchievedQty       float64 `json:"StatAchievedQty"`
	StatProductionQty     float64 `json:"StatProductionQty"`
	WarehouseReceiptQty   float64 `json:"WarehouseReceiptQty"`
	Status                string  `json:"Status"`
	SettledDate           string  `json:"SettledDate"`
	Notes                 string  `json:"Notes,omitempty"`
	FactoryName           string  `json:"FactoryName,omitempty"`
	BranchCode            string  `json:"BranchCode,omitempty"`
}

// OrderSettlementResponse represents the API response with flat items for FE
type OrderSettlementResponse struct {
	Items      []OrderSettlementFlatItem `json:"items"`
	TotalCount int                       `json:"total_count"`
	Page       int                       `json:"page"`
	PageSize   int                       `json:"page_size"`
	HasMore    bool                      `json:"has_more"`
	Latency    int64                     `json:"latency_ms,omitempty"`
	Raw        interface{}               `json:"raw,omitempty"`
}
