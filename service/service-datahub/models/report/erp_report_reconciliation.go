package report

import "time"

// ERPReportReconciliation stores user-edited audit notes separately from the
// calculated production report payloads.
type ERPReportReconciliation struct {
	ReportType    string    `gorm:"primaryKey;column:ReportType;size:30;not null;index:idx_report_reconciliation_scope,priority:1;index:idx_report_reconciliation_reg,priority:1" json:"ReportType"`
	DetailIdSeq   string    `gorm:"primaryKey;column:DetailIdSeq;size:36;not null" json:"DetailIdSeq"`
	MasterSeq     string    `gorm:"column:MasterSeq;size:36;not null;index:idx_report_reconciliation_scope,priority:2" json:"MasterSeq"`
	RegCode       string    `gorm:"column:RegCode;type:text;not null;index:idx_report_reconciliation_scope,priority:3;index:idx_report_reconciliation_reg,priority:2" json:"RegCode"`
	StatTicketNo  string    `gorm:"column:StatTicketNo;type:text;not null;default:''" json:"StatTicketNo,omitempty"`
	RemarkTypeSeq string    `gorm:"column:RemarkTypeSeq;type:varchar(36);not null;default:''" json:"RemarkTypeSeq"`
	RemarkContent string    `gorm:"column:RemarkContent;type:text;not null;default:''" json:"RemarkContent"`
	RowVersion    int64     `gorm:"column:RowVersion;not null;default:1" json:"RowVersion"`
	UpdatedBy     string    `gorm:"column:UpdatedBy;type:text;not null;default:''" json:"UpdatedBy"`
	CreatedAt     time.Time `gorm:"column:CreatedAt;autoCreateTime" json:"CreatedAt"`
	UpdatedAt     time.Time `gorm:"column:UpdatedAt;autoUpdateTime" json:"UpdatedAt"`
}

func (ERPReportReconciliation) TableName() string { return "_ERPReportReconciliation" }
