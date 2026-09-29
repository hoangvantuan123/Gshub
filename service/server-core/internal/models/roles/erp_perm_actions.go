package roles

import "time"

// ERPPermActions tương ứng với bảng _ERPPermActions (Đăng ký hành động quyền hạn)
type ERPPermActions struct {
	IdSeq          string     `db:"IdSeq" json:"IdSeq"`
	ActionCode     string     `db:"ActionCode" json:"ActionCode"`
	ActionName     string     `db:"ActionName" json:"ActionName"`
	LangKey        *string    `db:"LangKey" json:"LangKey"`
	IsDefaultAllow bool       `db:"IsDefaultAllow" json:"IsDefaultAllow"`
	Comment        *string    `db:"Comment" json:"Comment"`
	RowVersion     int64      `db:"RowVersion" json:"RowVersion"`
	IdxNo          *int       `db:"IdxNo" json:"IdxNo"`
	CreatedBy      *string    `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName  *string    `db:"CreatedByName" json:"CreatedByName"`
	CreatedAt      *time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy      *string    `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName  *string    `db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt      *time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
