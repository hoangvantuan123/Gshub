package auth

import (
	"time"
)

// ERPUserDetails corresponds to the _ERPUserDetails table with UUIDv7 IDs
type ERPUserDetails struct {
	IdSeq         string    `db:"IdSeq" json:"IdSeq"`
	UserSeq       *string   `db:"UserSeq" json:"UserSeq"`
	PartSeq       *int      `db:"PartSeq" json:"PartSeq"`
	ProdDepartSeq *int      `db:"ProdDepartSeq" json:"ProdDepartSeq"`
	PositionSeq   *int      `db:"PositionSeq" json:"PositionSeq"`
	CanScanQR     *bool     `db:"CanScanQR" json:"CanScanQR"`
	IsActive      *bool     `db:"IsActive" json:"IsActive"`
	IdxNo         *int      `db:"IdxNo" json:"IdxNo"`
	RowVersion    int64     `db:"RowVersion" json:"RowVersion"`
	CreatedBy     *string   `db:"CreatedBy" json:"CreatedBy"`
	CreatedAt     time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string   `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt     time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
