package report

import (
	"time"
)

// ERPProdStatsDetail tương ứng với bảng _ERPProdStatsDetail (Chi tiết thống kê sản xuất thực tế)
// Liên kết thông qua MasterSeq và RegCode, IdSeq và MasterSeq dùng UUIDv7
type ERPProdStatsDetail struct {
	IdSeq                  string     `gorm:"primaryKey;column:IdSeq;size:36;not null" db:"IdSeq" json:"IdSeq"`
	MasterSeq              string     `gorm:"column:MasterSeq;index;size:36;not null" db:"MasterSeq" json:"MasterSeq"`
	RegCode                string     `gorm:"column:RegCode;index;type:text;not null" db:"RegCode" json:"RegCode"`
	RowSeq                 int        `gorm:"column:RowSeq;default:0" db:"RowSeq" json:"RowSeq"`
	WorkingTag             string     `gorm:"column:WorkingTag;size:10;default:'A'" db:"WorkingTag" json:"WorkingTag"`
	ItemCode               *string    `gorm:"column:ItemCode;type:text" db:"ItemCode" json:"ItemCode"`
	ItemName               *string    `gorm:"column:ItemName;type:text" db:"ItemName" json:"ItemName"`
	Version                *string    `gorm:"column:Version;type:text" db:"Version" json:"Version"`
	Model                  *string    `gorm:"column:Model;type:text" db:"Model" json:"Model"`
	DefectMarginWeight     *string    `gorm:"column:DefectMarginWeight;type:text" db:"DefectMarginWeight" json:"DefectMarginWeight"`
	TechMarginWeight       *string    `gorm:"column:TechMarginWeight;type:text" db:"TechMarginWeight" json:"TechMarginWeight"`
	OperationNo            *string    `gorm:"column:OperationNo;type:text" db:"OperationNo" json:"OperationNo"`
	MainWorker             *string    `gorm:"column:MainWorker;type:text" db:"MainWorker" json:"MainWorker"`
	SubWorker1             *string    `gorm:"column:SubWorker1;type:text" db:"SubWorker1" json:"SubWorker1"`
	SubWorker2             *string    `gorm:"column:SubWorker2;type:text" db:"SubWorker2" json:"SubWorker2"`
	BreakdownReason        *string    `gorm:"column:BreakdownReason;type:text" db:"BreakdownReason" json:"BreakdownReason"`
	MachineCode            *string    `gorm:"column:MachineCode;type:text" db:"MachineCode" json:"MachineCode"`
	MachineName            *string    `gorm:"column:MachineName;type:text" db:"MachineName" json:"MachineName"`
	OpTypeCode             *string    `gorm:"column:OpTypeCode;type:text" db:"OpTypeCode" json:"OpTypeCode"`
	OpTypeName             *string    `gorm:"column:OpTypeName;type:text" db:"OpTypeName" json:"OpTypeName"`
	UvPlate                *string    `gorm:"column:UvPlate;type:text" db:"UvPlate" json:"UvPlate"`
	MoldSetQty1            *string    `gorm:"column:MoldSetQty1;type:text" db:"MoldSetQty1" json:"MoldSetQty1"`
	MoldSetQty2            *string    `gorm:"column:MoldSetQty2;type:text" db:"MoldSetQty2" json:"MoldSetQty2"`
	MoldSetQty3            *string    `gorm:"column:MoldSetQty3;type:text" db:"MoldSetQty3" json:"MoldSetQty3"`
	ProdQty                *string    `gorm:"column:ProdQty;type:text" db:"ProdQty" json:"ProdQty"`
	PassQty                *string    `gorm:"column:PassQty;type:text" db:"PassQty" json:"PassQty"`
	ActualMeters           *string    `gorm:"column:ActualMeters;type:text" db:"ActualMeters" json:"ActualMeters"`
	StandardMeters         *string    `gorm:"column:StandardMeters;type:text" db:"StandardMeters" json:"StandardMeters"`
	TeamName               *string    `gorm:"column:TeamName;type:text" db:"TeamName" json:"TeamName"`
	Shift                  *string    `gorm:"column:Shift;type:text" db:"Shift" json:"Shift"`
	StartDate              *string    `gorm:"column:StartDate;type:text" db:"StartDate" json:"StartDate"`
	StartTime              *string    `gorm:"column:StartTime;type:text" db:"StartTime" json:"StartTime"`
	EndDate                *string    `gorm:"column:EndDate;type:text" db:"EndDate" json:"EndDate"`
	EndTime                *string    `gorm:"column:EndTime;type:text" db:"EndTime" json:"EndTime"`
	StatDate               *string    `gorm:"column:StatDate;type:text" db:"StatDate" json:"StatDate"`
	StatTicketNo           *string    `gorm:"column:StatTicketNo;type:text" db:"StatTicketNo" json:"StatTicketNo"`
	StatStaff              *string    `gorm:"column:StatStaff;type:text" db:"StatStaff" json:"StatStaff"`
	Customer               *string    `gorm:"column:Customer;type:text" db:"Customer" json:"Customer"`
	SalesStaff             *string    `gorm:"column:SalesStaff;type:text" db:"SalesStaff" json:"SalesStaff"`
	OrderNo                *string    `gorm:"column:OrderNo;type:text" db:"OrderNo" json:"OrderNo"`
	ProcessName            *string    `gorm:"column:ProcessName;type:text" db:"ProcessName" json:"ProcessName"`
	Unit                   *string    `gorm:"column:Unit;type:text" db:"Unit" json:"Unit"`
	ConvUnit               *string    `gorm:"column:ConvUnit;type:text" db:"ConvUnit" json:"ConvUnit"`
	ProcessSpec            *string    `gorm:"column:ProcessSpec;type:text" db:"ProcessSpec" json:"ProcessSpec"`
	PartNo                 *string    `gorm:"column:PartNo;type:text" db:"PartNo" json:"PartNo"`
	CorrugatedPartNo       *string    `gorm:"column:CorrugatedPartNo;type:text" db:"CorrugatedPartNo" json:"CorrugatedPartNo"`
	TrimPartNo             *string    `gorm:"column:TrimPartNo;type:text" db:"TrimPartNo" json:"TrimPartNo"`
	ColorQty               *string    `gorm:"column:ColorQty;type:text" db:"ColorQty" json:"ColorQty"`
	OutPlateType           *string    `gorm:"column:OutPlateType;type:text" db:"OutPlateType" json:"OutPlateType"`
	FrontColors            *string    `gorm:"column:FrontColors;type:text" db:"FrontColors" json:"FrontColors"`
	BackColors             *string    `gorm:"column:BackColors;type:text" db:"BackColors" json:"BackColors"`
	JobNumber              *string    `gorm:"column:JobNumber;type:text" db:"JobNumber" json:"JobNumber"`
	Width                  *string    `gorm:"column:Width;type:text" db:"Width" json:"Width"`
	Length                 *string    `gorm:"column:Length;type:text" db:"Length" json:"Length"`
	Height                 *string    `gorm:"column:Height;type:text" db:"Height" json:"Height"`
	ProductLine            *string    `gorm:"column:ProductLine;type:text" db:"ProductLine" json:"ProductLine"`
	RawWidth               *string    `gorm:"column:RawWidth;type:text" db:"RawWidth" json:"RawWidth"`
	RawLength              *string    `gorm:"column:RawLength;type:text" db:"RawLength" json:"RawLength"`
	RawLineCode            *string    `gorm:"column:RawLineCode;type:text" db:"RawLineCode" json:"RawLineCode"`
	RawLineName            *string    `gorm:"column:RawLineName;type:text" db:"RawLineName" json:"RawLineName"`
	FlipType               *string    `gorm:"column:FlipType;type:text" db:"FlipType" json:"FlipType"`
	BomPlates              *string    `gorm:"column:BomPlates;type:text" db:"BomPlates" json:"BomPlates"`
	Coating                *string    `gorm:"column:Coating;type:text" db:"Coating" json:"Coating"`
	SlitterBlades          *string    `gorm:"column:SlitterBlades;type:text" db:"SlitterBlades" json:"SlitterBlades"`
	CodePositions          *string    `gorm:"column:CodePositions;type:text" db:"CodePositions" json:"CodePositions"`
	PunchHoles             *string    `gorm:"column:PunchHoles;type:text" db:"PunchHoles" json:"PunchHoles"`
	StructureCode          *string    `gorm:"column:StructureCode;type:text" db:"StructureCode" json:"StructureCode"`
	StructureName          *string    `gorm:"column:StructureName;type:text" db:"StructureName" json:"StructureName"`
	RoutingDocNo           *string    `gorm:"column:RoutingDocNo;type:text" db:"RoutingDocNo" json:"RoutingDocNo"`
	RoutingDate            *string    `gorm:"column:RoutingDate;type:text" db:"RoutingDate" json:"RoutingDate"`
	ReleaseDate            *string    `gorm:"column:ReleaseDate;type:text" db:"ReleaseDate" json:"ReleaseDate"`
	TargetPassQty          *string    `gorm:"column:TargetPassQty;type:text" db:"TargetPassQty" json:"TargetPassQty"`
	TargetProdQty          *string    `gorm:"column:TargetProdQty;type:text" db:"TargetProdQty" json:"TargetProdQty"`
	RoutingUnit            *string    `gorm:"column:RoutingUnit;type:text" db:"RoutingUnit" json:"RoutingUnit"`
	BreakdownMinutes       *string    `gorm:"column:BreakdownMinutes;type:text" db:"BreakdownMinutes" json:"BreakdownMinutes"`
	WaitingMaterialMinutes *string    `gorm:"column:WaitingMaterialMinutes;type:text" db:"WaitingMaterialMinutes" json:"WaitingMaterialMinutes"`
	SetupMinutes           *string    `gorm:"column:SetupMinutes;type:text" db:"SetupMinutes" json:"SetupMinutes"`
	RepairMinutes          *string    `gorm:"column:RepairMinutes;type:text" db:"RepairMinutes" json:"RepairMinutes"`
	TotalWasteMinutes      *string    `gorm:"column:TotalWasteMinutes;type:text" db:"TotalWasteMinutes" json:"TotalWasteMinutes"`
	RigidBoxGlue           *string    `gorm:"column:RigidBoxGlue;type:text" db:"RigidBoxGlue" json:"RigidBoxGlue"`
	Outsourcing            *string    `gorm:"column:Outsourcing;type:text" db:"Outsourcing" json:"Outsourcing"`
	DefectQty              *string    `gorm:"column:DefectQty;type:text" db:"DefectQty" json:"DefectQty"`
	DefectRate             *string    `gorm:"column:DefectRate;type:text" db:"DefectRate" json:"DefectRate"`
	DefectUnit             *string    `gorm:"column:DefectUnit;type:text" db:"DefectUnit" json:"DefectUnit"`
	Status                 *string    `gorm:"column:Status;type:text" db:"Status" json:"Status"`
	AutoExport             *string    `gorm:"column:AutoExport;type:text" db:"AutoExport" json:"AutoExport"`
	AutoImport             *string    `gorm:"column:AutoImport;type:text" db:"AutoImport" json:"AutoImport"`
	ExportDocNo            *string    `gorm:"column:ExportDocNo;type:text" db:"ExportDocNo" json:"ExportDocNo"`
	ImportDocNo            *string    `gorm:"column:ImportDocNo;type:text" db:"ImportDocNo" json:"ImportDocNo"`
	WrongOpCode            *string    `gorm:"column:WrongOpCode;type:text" db:"WrongOpCode" json:"WrongOpCode"`
	IsAdditionalStat       *string    `gorm:"column:IsAdditionalStat;type:text" db:"IsAdditionalStat" json:"IsAdditionalStat"`
	TicketCreatedDate      *string    `gorm:"column:TicketCreatedDate;type:text" db:"TicketCreatedDate" json:"TicketCreatedDate"`
	ActualRunTime          *string    `gorm:"column:ActualRunTime;type:text" db:"ActualRunTime" json:"ActualRunTime"`
	ActualCapa             *string    `gorm:"column:ActualCapa;type:text" db:"ActualCapa" json:"ActualCapa"`
	CheckPlanStatus        *string    `gorm:"column:CheckPlanStatus;type:text" db:"CheckPlanStatus" json:"CheckPlanStatus"`
	MesApprovalTime        *string    `gorm:"column:MesApprovalTime;type:text" db:"MesApprovalTime" json:"MesApprovalTime"`
	SyncDelayMinutes       *string    `gorm:"column:SyncDelayMinutes;type:text" db:"SyncDelayMinutes" json:"SyncDelayMinutes"`
	IsDuplicateTicket      *string    `gorm:"column:IsDuplicateTicket;type:text" db:"IsDuplicateTicket" json:"IsDuplicateTicket"`
	TicketCreationLocation *string    `gorm:"column:TicketCreationLocation;type:text" db:"TicketCreationLocation" json:"TicketCreationLocation"`
	AutoIoStatus           *string    `gorm:"column:AutoIoStatus;type:text" db:"AutoIoStatus" json:"AutoIoStatus"`
	UserMemo               *string    `gorm:"column:UserMemo;type:text" db:"UserMemo" json:"UserMemo"`
	RowVersion             int64      `gorm:"column:RowVersion;default:1" db:"RowVersion" json:"RowVersion"`
	IsActive               bool       `gorm:"column:IsActive;default:true" db:"IsActive" json:"IsActive"`
	CreatedBy              *string    `gorm:"column:CreatedBy;type:text" db:"CreatedBy" json:"CreatedBy"`
	CreatedByName          *string    `gorm:"column:CreatedByName;type:text" db:"CreatedByName" json:"CreatedByName"`
	CreatedAt              *time.Time `gorm:"column:CreatedAt;autoCreateTime" db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy              *string    `gorm:"column:UpdatedBy;type:text" db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName          *string    `gorm:"column:UpdatedByName;type:text" db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt              *time.Time `gorm:"column:UpdatedAt;autoUpdateTime" db:"UpdatedAt" json:"UpdatedAt"`
}

func (ERPProdStatsDetail) TableName() string {
	return "_ERPProdStatsDetail"
}
