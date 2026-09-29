package report

import (
	"time"
)

// ERPPlanDetail tương ứng với bảng _ERPPlanDetail (Chi tiết kế hoạch sản xuất của điều phối - 24 cột)
// Liên kết thông qua MasterSeq và RegCode, không sử dụng Foreign Key
type ERPPlanDetail struct {
	IdSeq            int64      `gorm:"primaryKey;autoIncrement;column:IdSeq" db:"IdSeq" json:"IdSeq"`
	MasterSeq        int64      `gorm:"column:MasterSeq;index;not null" db:"MasterSeq" json:"MasterSeq"`
	RegCode          string     `gorm:"column:RegCode;index;type:text;not null" db:"RegCode" json:"RegCode"`
	RowSeq           int        `gorm:"column:RowSeq;default:0" db:"RowSeq" json:"RowSeq"`
	WorkingTag       string     `gorm:"column:WorkingTag;size:10;default:'A'" db:"WorkingTag" json:"WorkingTag"`
	PicDp            *string    `gorm:"column:PicDp;type:text" db:"PicDp" json:"PicDp"`
	OperationNo      *string    `gorm:"column:OperationNo;type:text" db:"OperationNo" json:"OperationNo"`
	OpDate           *string    `gorm:"column:OpDate;type:text" db:"OpDate" json:"OpDate"`
	RoutingDocNo     *string    `gorm:"column:RoutingDocNo;type:text" db:"RoutingDocNo" json:"RoutingDocNo"`
	RoutingDocDate   *string    `gorm:"column:RoutingDocDate;type:text" db:"RoutingDocDate" json:"RoutingDocDate"`
	ItemCode         *string    `gorm:"column:ItemCode;type:text" db:"ItemCode" json:"ItemCode"`
	ItemName         *string    `gorm:"column:ItemName;type:text" db:"ItemName" json:"ItemName"`
	OperationName    *string    `gorm:"column:OperationName;type:text" db:"OperationName" json:"OperationName"`
	OpTypeName       *string    `gorm:"column:OpTypeName;type:text" db:"OpTypeName" json:"OpTypeName"`
	MachineName      *string    `gorm:"column:MachineName;type:text" db:"MachineName" json:"MachineName"`
	Unit             *string    `gorm:"column:Unit;type:text" db:"Unit" json:"Unit"`
	TargetPassQty    *string    `gorm:"column:TargetPassQty;type:text" db:"TargetPassQty" json:"TargetPassQty"`
	TargetProdQty    *string    `gorm:"column:TargetProdQty;type:text" db:"TargetProdQty" json:"TargetProdQty"`
	StatPassQty      *string    `gorm:"column:StatPassQty;type:text" db:"StatPassQty" json:"StatPassQty"`
	StartTime        *string    `gorm:"column:StartTime;type:text" db:"StartTime" json:"StartTime"`
	EndTime          *string    `gorm:"column:EndTime;type:text" db:"EndTime" json:"EndTime"`
	StandardProdTime *string    `gorm:"column:StandardProdTime;type:text" db:"StandardProdTime" json:"StandardProdTime"`
	ActualProdTime   *string    `gorm:"column:ActualProdTime;type:text" db:"ActualProdTime" json:"ActualProdTime"`
	StandardCapa     *string    `gorm:"column:StandardCapa;type:text" db:"StandardCapa" json:"StandardCapa"`
	ActualCapa       *string    `gorm:"column:ActualCapa;type:text" db:"ActualCapa" json:"ActualCapa"`
	StatusDpSx       *string    `gorm:"column:StatusDpSx;type:text" db:"StatusDpSx" json:"StatusDpSx"`
	TimeStatus       *string    `gorm:"column:TimeStatus;type:text" db:"TimeStatus" json:"TimeStatus"`
	CapaStatus       *string    `gorm:"column:CapaStatus;type:text" db:"CapaStatus" json:"CapaStatus"`
	UserMemo         *string    `gorm:"column:UserMemo;type:text" db:"UserMemo" json:"UserMemo"`
	RowVersion       int64      `gorm:"column:RowVersion;default:1" db:"RowVersion" json:"RowVersion"`
	IsActive         bool       `gorm:"column:IsActive;default:true" db:"IsActive" json:"IsActive"`
	CreatedBy        *string    `gorm:"column:CreatedBy;type:text" db:"CreatedBy" json:"CreatedBy"`
	CreatedByName    *string    `gorm:"column:CreatedByName;type:text" db:"CreatedByName" json:"CreatedByName"`
	CreatedAt        *time.Time `gorm:"column:CreatedAt;autoCreateTime" db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy        *string    `gorm:"column:UpdatedBy;type:text" db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName    *string    `gorm:"column:UpdatedByName;type:text" db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt        *time.Time `gorm:"column:UpdatedAt;autoUpdateTime" db:"UpdatedAt" json:"UpdatedAt"`
}

func (ERPPlanDetail) TableName() string {
	return "_ERPPlanDetail"
}
