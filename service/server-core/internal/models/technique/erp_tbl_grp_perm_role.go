package technique

import (
	"time"
)

// ERPTblGrpPermRole corresponds to the _ERPTblGrpPermRole table
type ERPTblGrpPermRole struct {
	IdSeq         string    `db:"IdSeq" json:"IdSeq"`
	IdxNo         *int      `db:"IdxNo" json:"IdxNo"`
	TblGrpPermSeq *string   `db:"TblGrpPermSeq" json:"TblGrpPermSeq"`
	TblGrpSeq     *string   `db:"TblGrpSeq" json:"TblGrpSeq"`
	TblGrpItemSeq *string   `db:"TblGrpItemSeq" json:"TblGrpItemSeq"`
	UserSeq       *int      `db:"UserSeq" json:"UserSeq"`
	TypeRole      *string   `db:"TypeRole" json:"TypeRole"`
	View          bool      `db:"View" json:"View"`
	Edit          bool      `db:"Edit" json:"Edit"`
	CreatedBy     *int      `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt     time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *int      `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt     time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}




