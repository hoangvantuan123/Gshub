package report

import "time"

// ERPProdMachineCatalog intentionally has no primary key, foreign key or unique constraint in DB schema.
type ERPProdMachineCatalog struct {
	IdSeq       string     `gorm:"column:IdSeq;type:varchar(36)" json:"IdSeq"`
	MachineCode string     `gorm:"column:MachineCode;type:varchar(100)" json:"MachineCode"`
	MachineName string     `gorm:"column:MachineName;type:varchar(255)" json:"MachineName"`
	TeamCode    string     `gorm:"column:TeamCode;type:varchar(100)" json:"TeamCode"`
	TeamName    string     `gorm:"column:TeamName;type:varchar(255)" json:"TeamName"`
	Factory     string     `gorm:"column:Factory;type:varchar(100)" json:"Factory"`
	Description *string    `gorm:"column:Description;type:text" json:"Description"`
	IsActive    *bool      `gorm:"column:IsActive;default:true" json:"IsActive"`
	IdxNo       *int       `gorm:"column:IdxNo" json:"IdxNo"`
	CreatedBy   *string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt   *time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy   *string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt   *time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion  int64      `gorm:"column:RowVersion;not null;default:1" json:"RowVersion"`
}

func (ERPProdMachineCatalog) TableName() string { return "_ERPProdMachineCatalog" }
