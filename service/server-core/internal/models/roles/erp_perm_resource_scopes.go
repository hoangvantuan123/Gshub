package roles

import "time"

// ERPPermResourceScopes tương ứng với bảng _ERPPermResourceScopes (Chi tiết phạm vi dữ liệu theo Menu)
type ERPPermResourceScopes struct {
	IdSeq            string    `db:"IdSeq" json:"IdSeq"`
	ResourceSeq      string    `db:"ResourceSeq" json:"ResourceSeq"`                         // FK -> _ERPPermResources / _ERPMenus
	ResourceCode     *string   `db:"ResourceCode" json:"ResourceCode,omitempty"`             // Mã menu hiển thị (qua JOIN)
	ResourceName     *string   `db:"ResourceName" json:"ResourceName,omitempty"`             // Tên menu hiển thị (qua JOIN)
	ScopeSeq         string    `db:"ScopeSeq" json:"ScopeSeq"`                               // FK -> _ERPPermScopes
	ScopeCode        *string   `db:"ScopeCode" json:"ScopeCode,omitempty"`                   // Mã phạm vi gốc (qua JOIN)
	ScopeName        *string   `db:"ScopeName" json:"ScopeName,omitempty"`                   // Tên phạm vi hiển thị kết hợp (COALESCE)
	LangKey          *string   `db:"LangKey" json:"LangKey,omitempty"`                       // Lang key gốc (qua JOIN)
	CustomScopeName  *string   `db:"CustomScopeName" json:"CustomScopeName,omitempty"`       // Tên tùy biến riêng theo menu
	OrderNo          int       `db:"OrderNo" json:"OrderNo"`
	Comment          *string   `db:"Comment" json:"Comment,omitempty"`
	RowVersion       int64     `db:"RowVersion" json:"RowVersion"`
	IdxNo            *int      `db:"IdxNo" json:"IdxNo,omitempty"`
	CreatedBy        *string   `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedByName    *string   `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt        time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy        *string   `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedByName    *string   `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt        time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
