package technique

import (
	"time"
)

// ERPTblGrpItem corresponds to the _ERPTblGrpItem table
type ERPTblGrpItem struct {
	IdSeq     string    `db:"IdSeq" json:"IdSeq"`
	IdxNo     *int      `db:"IdxNo" json:"IdxNo"`
	TblGrpSeq *string   `db:"TblGrpSeq" json:"TblGrpSeq"`
	KeyCode   string    `db:"KeyCode" json:"KeyCode"`
	CreatedBy *int      `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy *int      `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}




