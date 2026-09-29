package roles

import "time"

type ERPGroupActionPerms struct {
	Idseq      string    `db:"Idseq" json:"Idseq"`
	Name       *string   `db:"Name" json:"Name"`
	IdxNo      *int      `db:"IdxNo" json:"IdxNo"`
	ScreenName *string   `db:"ScreenName" json:"ScreenName"`
	Comment    *string   `db:"Comment" json:"Comment"`
	CreatedBy  *string   `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt  time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy  *string   `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt  time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
