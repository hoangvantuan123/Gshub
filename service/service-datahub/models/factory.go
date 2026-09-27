package models

// FactoryItem represents a single factory record returned from Bravo ERP
type FactoryItem struct {
	FactoryName string `json:"FactoryName"`
	Id          int64  `json:"Id"`
	ParentId    int64  `json:"ParentId"`
}

// FactoryRequest represents query options for retrieving the factory list
type FactoryRequest struct {
	ConfigKey   string `json:"config_key" form:"config_key"`
	MenuKey     string `json:"menu_key" form:"menu_key"`
	ApiKey      string `json:"api_key" form:"api_key"`
	EndpointKey string `json:"endpoint_key" form:"endpoint_key"`
	Username    string `json:"username" form:"username"`
	BranchCode  string `json:"branch_code" form:"branch_code"`
	FiscalYear  string `json:"fiscal_year" form:"fiscal_year"`
	Endpoint    string `json:"endpoint" form:"endpoint"`
	Token       string `json:"token,omitempty" form:"token"`
}
