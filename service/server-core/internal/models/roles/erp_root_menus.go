package roles

// ERPRootMenus corresponds to the _ERPRootMenus table
type ERPRootMenus struct {
	Id            interface{} `db:"Id" json:"Id"`
	Key           *string     `db:"Key" json:"Key"`
	IdxNo         *int        `db:"IdxNo" json:"IdxNo"`
	Label         *string     `db:"Label" json:"Label"`
	Icon          *string     `db:"Icon" json:"Icon"`
	Link          *string     `db:"Link" json:"Link"`
	Utilities     bool        `db:"Utilities" json:"Utilities"`
	RowVersion    int64       `db:"RowVersion" json:"RowVersion"`
	CreatedBy     interface{} `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedByName *string     `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt     interface{} `db:"CreatedAt" json:"CreatedAt,omitempty"`
	UpdatedBy     interface{} `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedByName *string     `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt     interface{} `db:"UpdatedAt" json:"UpdatedAt,omitempty"`
}

type ERPRootMenusWEB = ERPRootMenus

// RowErrorDetail provides structured line-level error and conflict details
type RowErrorDetail struct {
	Id      interface{} `json:"Id,omitempty"`
	IdxNo   int         `json:"IdxNo,omitempty"`
	Key     string      `json:"Key,omitempty"`
	Label   string      `json:"Label,omitempty"`
	Field   string      `json:"Field,omitempty"`
	Type    string      `json:"Type,omitempty"`
	Message string      `json:"Message"`
}

// BatchSaveError wraps a list of structured row errors for batch operations
type BatchSaveError struct {
	Message string           `json:"Message"`
	Details []RowErrorDetail `json:"Details"`
}

func (e *BatchSaveError) Error() string {
	return e.Message
}
