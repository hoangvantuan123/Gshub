package report

import (
	"time"
)

// ERPMesApprovalDetail tương ứng với bảng _ERPMesApprovalDetail (Chi tiết duyệt sản lượng MES)
// SlipNo (Mã phiếu) là khóa nghiệp vụ của dữ liệu MES.
// Khóa hệ thống lưu trữ dự án dùng IdSeq (UUIDv7), RowVersion, CreatedBy (Người tạo Seq), CreatedAt, UpdatedBy, UpdatedAt.
type ERPMesApprovalDetail struct {
	IdSeq            string     `gorm:"primaryKey;column:IdSeq;size:36;not null" db:"IdSeq" json:"IdSeq"`
	MasterSeq        string     `gorm:"column:MasterSeq;index;size:36" db:"MasterSeq" json:"MasterSeq"`
	RegCode          string     `gorm:"column:RegCode;index;type:text" db:"RegCode" json:"RegCode"`
	RowSeq           int        `gorm:"column:RowSeq;default:0" db:"RowSeq" json:"RowSeq"`
	WorkingTag       string     `gorm:"column:WorkingTag;size:10;default:'A'" db:"WorkingTag" json:"WorkingTag"`
	SlipNo           string     `gorm:"column:SlipNo;index;type:text;not null" db:"SlipNo" json:"SlipNo"`
	StageOrderNo     *string    `gorm:"column:StageOrderNo;type:text" db:"StageOrderNo" json:"StageOrderNo"`
	OperationOrderNo *string    `gorm:"column:OperationOrderNo;index;type:text" db:"OperationOrderNo" json:"OperationOrderNo"`
	OperationName    *string    `gorm:"column:OperationName;type:text" db:"OperationName" json:"OperationName"`
	MachineName      *string    `gorm:"column:MachineName;type:text" db:"MachineName" json:"MachineName"`
	ProductCode      *string    `gorm:"column:ProductCode;type:text" db:"ProductCode" json:"ProductCode"`
	ProductName      *string    `gorm:"column:ProductName;type:text" db:"ProductName" json:"ProductName"`
	Unit             *string    `gorm:"column:Unit;type:text" db:"Unit" json:"Unit"`
	ProductionTeam   *string    `gorm:"column:ProductionTeam;type:text" db:"ProductionTeam" json:"ProductionTeam"`
	Creator          *string    `gorm:"column:Creator;type:text" db:"Creator" json:"Creator"`
	Approver         *string    `gorm:"column:Approver;type:text" db:"Approver" json:"Approver"`
	ApprovedTime     *string    `gorm:"column:ApprovedTime;index;type:text" db:"ApprovedTime" json:"ApprovedTime"`
	StartTime        *string    `gorm:"column:StartTime;type:text" db:"StartTime" json:"StartTime"`
	EndTime          *string    `gorm:"column:EndTime;type:text" db:"EndTime" json:"EndTime"`
	ProducedQty      *string    `gorm:"column:ProducedQty;type:text" db:"ProducedQty" json:"ProducedQty"`
	QualifiedQty     *string    `gorm:"column:QualifiedQty;type:text" db:"QualifiedQty" json:"QualifiedQty"`
	DefectQty        *string    `gorm:"column:DefectQty;type:text" db:"DefectQty" json:"DefectQty"`
	Classification   *string    `gorm:"column:Classification;type:text" db:"Classification" json:"Classification"`
	Status           *string    `gorm:"column:Status;type:text" db:"Status" json:"Status"`
	BravoStatCode    *string    `gorm:"column:BravoStatCode;index;type:text" db:"BravoStatCode" json:"BravoStatCode"`
	Factory          *string    `gorm:"column:Factory;type:text" db:"Factory" json:"Factory"`
	UserMemo         *string    `gorm:"column:UserMemo;type:text" db:"UserMemo" json:"UserMemo"`
	RowVersion       int64      `gorm:"column:RowVersion;default:1" db:"RowVersion" json:"RowVersion"`
	IsActive         bool       `gorm:"column:IsActive;default:true" db:"IsActive" json:"IsActive"`
	CreatedBy        *string    `gorm:"column:CreatedBy;type:text" db:"CreatedBy" json:"CreatedBy"`
	CreatedByName    *string    `gorm:"column:CreatedByName;type:text" db:"CreatedByName" json:"CreatedByName"`
	CreatedAt        *time.Time `gorm:"column:CreatedAt;autoCreateTime" db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy        *string    `gorm:"column:UpdatedBy;type:text" db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName    *string    `gorm:"column:UpdatedByName;type:text" db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt        *time.Time `gorm:"column:UpdatedAt;autoUpdateTime" db:"UpdatedAt" json:"UpdatedAt"`

	// Joined Master fields from _ERPPlanMaster
	FactoryCode      *string    `gorm:"->;column:FactoryCode" json:"FactoryCode,omitempty"`
	FactoryName      *string    `gorm:"->;column:FactoryName" json:"FactoryName,omitempty"`
	ApplyDate        *string    `gorm:"->;column:ApplyDate" json:"ApplyDate,omitempty"`
	MasterStatus     *string    `gorm:"->;column:MasterStatus" json:"MasterStatus,omitempty"`
	MasterRemark     *string    `gorm:"->;column:MasterRemark" json:"MasterRemark,omitempty"`
	ReportType       *string    `gorm:"->;column:ReportType" json:"ReportType,omitempty"`
}

func (ERPMesApprovalDetail) TableName() string {
	return "_ERPMesApprovalDetail"
}
