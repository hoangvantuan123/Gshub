package report

import (
	"time"
)

// ERPPlanMaster tương ứng với bảng _ERPPlanMaster (Đăng ký đợt báo cáo KHSX / TKSX)
// Không sử dụng khóa phụ Foreign Key, liên kết trực tiếp bằng IdSeq và RegCode
type ERPPlanMaster struct {
	IdSeq         int64      `gorm:"primaryKey;autoIncrement;column:IdSeq" db:"IdSeq" json:"IdSeq"`
	RegCode       string     `gorm:"column:RegCode;uniqueIndex;size:50;not null" db:"RegCode" json:"RegCode"`
	ReportType    string     `gorm:"column:ReportType;size:50;not null;default:'plan'" db:"ReportType" json:"ReportType"` // 'plan' (KHSX) | 'statistics' (TKSX)
	FactoryName   *string    `gorm:"column:FactoryName;size:100" db:"FactoryName" json:"FactoryName"`
	ApplyDate     *string    `gorm:"column:ApplyDate;size:20" db:"ApplyDate" json:"ApplyDate"`
	Remark        *string    `gorm:"column:Remark;type:text" db:"Remark" json:"Remark"`
	Status        *string    `gorm:"column:Status;size:50;default:'published'" db:"Status" json:"Status"` // 'draft', 'published', 'cancelled'
	TotalRows     int        `gorm:"column:TotalRows;default:0" db:"TotalRows" json:"TotalRows"`
	RowVersion    int64      `gorm:"column:RowVersion;default:1" db:"RowVersion" json:"RowVersion"`
	IsActive      bool       `gorm:"column:IsActive;default:true" db:"IsActive" json:"IsActive"`
	CreatedBy     *string    `gorm:"column:CreatedBy;size:100" db:"CreatedBy" json:"CreatedBy"`
	CreatedByName *string    `gorm:"column:CreatedByName;size:255" db:"CreatedByName" json:"CreatedByName"`
	CreatedAt     *time.Time `gorm:"column:CreatedAt;autoCreateTime" db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string    `gorm:"column:UpdatedBy;size:100" db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName *string    `gorm:"column:UpdatedByName;size:255" db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt     *time.Time `gorm:"column:UpdatedAt;autoUpdateTime" db:"UpdatedAt" json:"UpdatedAt"`
}

func (ERPPlanMaster) TableName() string {
	return "_ERPPlanMaster"
}
