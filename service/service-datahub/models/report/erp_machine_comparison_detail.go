package report

import (
	"time"
)

// ERPMachineComparisonDetail stores Tab 7 machine-comparison rows. TKSXRegCode
// identifies the source statistics report; RegCode retains the associated plan code.
type ERPMachineComparisonDetail struct {
	IdSeq                   string     `gorm:"primaryKey;column:IdSeq;size:36;not null" db:"IdSeq" json:"IdSeq"`
	MasterSeq               string     `gorm:"column:MasterSeq;index;size:36;not null" db:"MasterSeq" json:"MasterSeq"`
	RegCode                 string     `gorm:"column:RegCode;index;type:text;not null" db:"RegCode" json:"RegCode"`
	TKSXRegCode             *string    `gorm:"column:TKSXRegCode;index;type:text" db:"TKSXRegCode" json:"TKSXRegCode,omitempty"`
	RowSeq                  int        `gorm:"column:RowSeq;default:0" db:"RowSeq" json:"RowSeq"`
	WorkingTag              string     `gorm:"column:WorkingTag;size:10;default:'A'" db:"WorkingTag" json:"WorkingTag"`
	SourceRow               int        `gorm:"column:SourceRow;default:0" db:"SourceRow" json:"SourceRow"`
	StatSlipNo              *string    `gorm:"column:StatSlipNo;type:text" db:"StatSlipNo" json:"StatSlipNo"`
	StatDate                *string    `gorm:"column:StatDate;type:text" db:"StatDate" json:"StatDate"`
	OperationOrderNo        *string    `gorm:"column:OperationOrderNo;type:text" db:"OperationOrderNo" json:"OperationOrderNo"`
	StageOrderNo            *string    `gorm:"column:StageOrderNo;type:text" db:"StageOrderNo" json:"StageOrderNo"`
	OperationName           *string    `gorm:"column:OperationName;type:text" db:"OperationName" json:"OperationName"`
	MaterialCode            *string    `gorm:"column:MaterialCode;type:text" db:"MaterialCode" json:"MaterialCode"`
	MaterialName            *string    `gorm:"column:MaterialName;type:text" db:"MaterialName" json:"MaterialName"`
	ActualMachineCode       *string    `gorm:"column:ActualMachineCode;type:text" db:"ActualMachineCode" json:"ActualMachineCode"`
	ActualMachineName       *string    `gorm:"column:ActualMachineName;type:text" db:"ActualMachineName" json:"ActualMachineName"`
	MesSlipNo               *string    `gorm:"column:MesSlipNo;type:text" db:"MesSlipNo" json:"MesSlipNo"`
	MesMachineCode          *string    `gorm:"column:MesMachineCode;type:text" db:"MesMachineCode" json:"MesMachineCode"`
	MesMachineName          *string    `gorm:"column:MesMachineName;type:text" db:"MesMachineName" json:"MesMachineName"`
	MesComparisonStatus     *string    `gorm:"column:MesComparisonStatus;type:text" db:"MesComparisonStatus" json:"MesComparisonStatus"`
	MesComparisonBasis      *string    `gorm:"column:MesComparisonBasis;type:text" db:"MesComparisonBasis" json:"MesComparisonBasis"`
	PlannedMachineCode      *string    `gorm:"column:PlannedMachineCode;type:text" db:"PlannedMachineCode" json:"PlannedMachineCode"`
	PlannedMachineName      *string    `gorm:"column:PlannedMachineName;type:text" db:"PlannedMachineName" json:"PlannedMachineName"`
	IsBelongToFactory       *string    `gorm:"column:IsBelongToFactory;type:text" db:"IsBelongToFactory" json:"IsBelongToFactory"`
	MachineComparisonStatus *string    `gorm:"column:MachineComparisonStatus;type:text" db:"MachineComparisonStatus" json:"MachineComparisonStatus"`
	MachineDifference       *string    `gorm:"column:MachineDifference;type:text" db:"MachineDifference" json:"MachineDifference"`
	KhsxStatus              *string    `gorm:"column:KhsxStatus;type:text" db:"KhsxStatus" json:"KhsxStatus"`
	ProducedQty             *string    `gorm:"column:ProducedQty;type:text" db:"ProducedQty" json:"ProducedQty"`
	QualifiedQty            *string    `gorm:"column:QualifiedQty;type:text" db:"QualifiedQty" json:"QualifiedQty"`
	UserMemo                *string    `gorm:"column:UserMemo;type:text" db:"UserMemo" json:"UserMemo"`
	RemarkTypeSeq           *string    `gorm:"column:RemarkTypeSeq;type:varchar(36)" db:"RemarkTypeSeq" json:"RemarkTypeSeq"`
	RemarkContent           *string    `gorm:"column:RemarkContent;type:text" db:"RemarkContent" json:"RemarkContent"`
	RowVersion              int64      `gorm:"column:RowVersion;default:1" db:"RowVersion" json:"RowVersion"`
	IsActive                bool       `gorm:"column:IsActive;default:true" db:"IsActive" json:"IsActive"`
	CreatedBy               *string    `gorm:"column:CreatedBy;type:text" db:"CreatedBy" json:"CreatedBy"`
	CreatedByName           *string    `gorm:"column:CreatedByName;type:text" db:"CreatedByName" json:"CreatedByName"`
	CreatedAt               *time.Time `gorm:"column:CreatedAt;autoCreateTime" db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy               *string    `gorm:"column:UpdatedBy;type:text" db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName           *string    `gorm:"column:UpdatedByName;type:text" db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt               *time.Time `gorm:"column:UpdatedAt;autoUpdateTime" db:"UpdatedAt" json:"UpdatedAt"`

	// Joined Master fields from _ERPPlanMaster
	FactoryCode  *string `gorm:"->;column:FactoryCode" json:"FactoryCode,omitempty"`
	FactoryName  *string `gorm:"->;column:FactoryName" json:"FactoryName,omitempty"`
	ApplyDate    *string `gorm:"->;column:ApplyDate" json:"ApplyDate,omitempty"`
	MasterStatus *string `gorm:"->;column:MasterStatus" json:"MasterStatus,omitempty"`
	MasterRemark *string `gorm:"->;column:MasterRemark" json:"MasterRemark,omitempty"`
	ReportType   *string `gorm:"->;column:ReportType" json:"ReportType,omitempty"`
}

func (ERPMachineComparisonDetail) TableName() string {
	return "_ERPMachineComparisonDetail"
}
