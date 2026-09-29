package technique

import (
	"time"
)

// ERPTblGrp corresponds to the _ERPTblGrp table
type ERPTblGrp struct {
	IdSeq     string    `db:"IdSeq" json:"IdSeq"`
	IdxNo     *int      `db:"IdxNo" json:"IdxNo"`
	KeyCode   string    `db:"KeyCode" json:"KeyCode"`
	TableName *string   `db:"TableName" json:"TableName"`
	CreatedBy *int      `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy *int      `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}




