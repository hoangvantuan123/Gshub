package roles

import "time"

// ERPPermResourceActions tương ứng với bảng _ERPPermResourceActions (Chi tiết hành động theo Menu)
type ERPPermResourceActions struct {
	IdSeq             string    `db:"IdSeq" json:"IdSeq"`
	ResourceSeq       string    `db:"ResourceSeq" json:"ResourceSeq"`                         // FK -> _ERPPermResources / _ERPMenus
	ResourceCode      *string   `db:"ResourceCode" json:"ResourceCode,omitempty"`             // Mã menu hiển thị (qua JOIN)
	ResourceName      *string   `db:"ResourceName" json:"ResourceName,omitempty"`             // Tên menu hiển thị (qua JOIN)
	ActionSeq         string    `db:"ActionSeq" json:"ActionSeq"`                             // FK -> _ERPPermActions
	ActionCode        *string   `db:"ActionCode" json:"ActionCode,omitempty"`                 // Mã nút gốc (qua JOIN)
	ActionName        *string   `db:"ActionName" json:"ActionName,omitempty"`                 // Tên nút hiển thị kết hợp (COALESCE)
	LangKey           *string   `db:"LangKey" json:"LangKey,omitempty"`                       // Lang key gốc (qua JOIN)
	CustomActionName  *string   `db:"CustomActionName" json:"CustomActionName,omitempty"`     // Tên tùy biến riêng theo menu
	IsDefaultAllow    bool      `db:"IsDefaultAllow" json:"IsDefaultAllow"`
	OrderNo           int       `db:"OrderNo" json:"OrderNo"`
	Comment           *string   `db:"Comment" json:"Comment,omitempty"`
	RowVersion        int64     `db:"RowVersion" json:"RowVersion"`
	IdxNo             *int      `db:"IdxNo" json:"IdxNo,omitempty"`
	CreatedBy         *string   `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedByName     *string   `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt         time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy         *string   `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedByName     *string   `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt         time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
