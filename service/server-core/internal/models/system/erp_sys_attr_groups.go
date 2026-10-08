package system

import "time"

// ERPSysAttrGroups tương ứng với bảng _ERPSysAttrGroups (Đăng ký nhóm thuộc tính hệ thống)
type ERPSysAttrGroups struct {
	IdSeq         string     `db:"IdSeq" json:"IdSeq"`
	GroupCode     string     `db:"GroupCode" json:"GroupCode"`
	GroupName     *string    `db:"GroupName" json:"GroupName"`
	CodeHelp      int64      `db:"CodeHelp" json:"CodeHelp"`
	LangKey       *string    `db:"LangKey" json:"LangKey"`
	Comment       *string    `db:"Comment" json:"Comment"`
	RowVersion    int64      `db:"RowVersion" json:"RowVersion"`
	IdxNo         *int       `db:"IdxNo" json:"IdxNo"`
	CreatedBy     *string    `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName *string    `db:"CreatedByName" json:"CreatedByName"`
	CreatedAt     *time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string    `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName *string    `db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt     *time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}

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
