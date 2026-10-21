package report

import "time"

// ERPProdStatsRemarkType intentionally has no primary key, foreign key or unique constraint.
type ERPProdStatsRemarkType struct {
	IdSeq       string     `gorm:"column:IdSeq;type:varchar(36)" json:"IdSeq"`
	TypeCode    string     `gorm:"column:TypeCode;type:varchar(100)" json:"TypeCode"`
	TypeName    string     `gorm:"column:TypeName;type:varchar(255)" json:"TypeName"`
	Description *string    `gorm:"column:Description;type:text" json:"Description"`
	IsActive    *bool      `gorm:"column:IsActive;default:true" json:"IsActive"`
	IdxNo       *int       `gorm:"column:IdxNo" json:"IdxNo"`
	CreatedBy   *string    `gorm:"column:CreatedBy;type:varchar(36)" json:"CreatedBy"`
	CreatedAt   *time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy   *string    `gorm:"column:UpdatedBy;type:varchar(36)" json:"UpdatedBy"`
	UpdatedAt   *time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
}

func (ERPProdStatsRemarkType) TableName() string { return "_ERPProdStatsRemarkType" }
