package technique

import (
	"time"
)

// ERPTblGrpPerm corresponds to the _ERPTblGrpPerm table
type ERPTblGrpPerm struct {
	IdSeq          string    `db:"IdSeq" json:"IdSeq"`
	IdxNo          *int      `db:"IdxNo" json:"IdxNo"`
	TblGrpPermName *string   `db:"TblGrpPermName" json:"TblGrpPermName"`
	CreatedBy      *int      `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt      time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy      *int      `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt      time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}




