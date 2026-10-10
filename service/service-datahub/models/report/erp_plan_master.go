package report

import (
	"time"
)

// ERPPlanMaster tương ứng với bảng _ERPPlanMaster (Đăng ký đợt báo cáo KHSX / TKSX)
// Không sử dụng khóa phụ Foreign Key, liên kết trực tiếp bằng IdSeq (UUIDv7) và RegCode
type ERPPlanMaster struct {
	IdSeq         string     `gorm:"primaryKey;column:IdSeq;size:36;not null" db:"IdSeq" json:"IdSeq"`
	RegCode       string     `gorm:"column:RegCode;uniqueIndex;size:100;not null" db:"RegCode" json:"RegCode"`
	ReportType    string     `gorm:"column:ReportType;size:50;not null;default:'plan'" db:"ReportType" json:"ReportType"` // 'plan' (KHSX) | 'statistics' (TKSX)
	FactoryCode   *string    `gorm:"column:FactoryCode;size:50;default:'GS1'" db:"FactoryCode" json:"FactoryCode"`
	FactoryName   *string    `gorm:"column:FactoryName;size:255" db:"FactoryName" json:"FactoryName"`
	ApplyDate     *string    `gorm:"column:ApplyDate;size:50" db:"ApplyDate" json:"ApplyDate"`
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

// PlanPageInfo: Thông tin phân trang chuẩn cho báo cáo KHSX / TKSX
type PlanPageInfo struct {
	Page         int   `json:"page"`
	PageSize     int   `json:"pageSize"`
	TotalRows    int   `json:"totalRows"`
	Total        int64 `json:"total"`
	TotalPages   int   `json:"totalPages"`
	TotalAll     int64 `json:"totalAll"`
	LoadedCount  int   `json:"loadedCount"`
	TotalColumns int   `json:"totalColumns"`
}

// PlanRegistrationSaveRequest: Body gửi lên khi lưu đợt nạp dữ liệu KHSX / TKSX
type PlanRegistrationSaveRequest struct {
	RegCode       string                   `json:"regCode"`
	ReportType    string                   `json:"reportType"`
	FactoryCode   string                   `json:"factoryCode"`
	FactoryName   string                   `json:"factoryName"`
	ApplyDate     string                   `json:"applyDate"`
	Version       string                   `json:"version"`
	CalcVersion   string                   `json:"calcVersion"`
	Remark        string                   `json:"remark"`
	Status        string                   `json:"status"`
	IsDraft       bool                     `json:"isDraft"`
	TotalRows     int                      `json:"totalRows"`
	CreatedBy     string                   `json:"createdBy"`
	CreatedByName string                   `json:"createdByName"`
	UserSeq       string                   `json:"userSeq"`
	UserName      string                   `json:"userName"`
	StatsData     []ERPProdStatsDetail     `json:"statsData"`
	PlanData      []ERPPlanDetail          `json:"planData"`
	SheetData     []map[string]interface{} `json:"sheetData"`
	Data          []map[string]interface{} `json:"data"`
}

