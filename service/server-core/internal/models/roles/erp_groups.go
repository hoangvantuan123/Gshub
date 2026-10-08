package roles

import "time"

type ERPGroups struct {
	Id            string     `db:"Id" json:"Id"`
	Name          *string    `db:"Name" json:"Name"`
	Comment       *string    `db:"Comment" json:"Comment"`
	IdxNo         *int       `db:"IdxNo" json:"IdxNo"`
	RowVersion    int64      `db:"RowVersion" json:"RowVersion"`
	CreatedBy     *string    `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName *string    `db:"CreatedByName" json:"CreatedByName"`
	CreatedAt     *time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string    `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName *string    `db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt     *time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}

type ERPGroupsWEB = ERPGroups
