package roles

import "time"

type ERPActionPerms struct {
	Id                 string    `db:"Id" json:"Id"`
	IdxNo              *int      `db:"IdxNo" json:"IdxNo"`
	ScreenName         *string   `db:"ScreenName" json:"ScreenName"`
	ViewScreen         bool      `db:"ViewScreen" json:"ViewScreen"`
	EditScreen         bool      `db:"EditScreen" json:"EditScreen"`
	GroupActionPermsId *string   `db:"GroupActionPermsId" json:"GroupActionPermsId"`
	GroupSeq           *string   `db:"GroupSeq" json:"GroupSeq"`
	UserSeq            *string   `db:"UserSeq" json:"UserSeq"`
	Type               *string   `db:"Type" json:"Type"`
	CreatedBy          *string   `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt          time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy          *string   `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt          time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
