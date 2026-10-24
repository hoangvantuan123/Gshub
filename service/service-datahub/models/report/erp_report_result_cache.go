package report

import "time"

// ERPReportResultCache stores final API response variants under one report identity.
// CacheVersion is bumped when report calculations or response fields change.
type ERPReportResultCache struct {
	CacheKey     string    `gorm:"primaryKey;column:CacheKey;size:64" json:"-"`
	ReportType   string    `gorm:"column:ReportType;size:30;not null;index:idx_report_cache_type_factory,priority:1" json:"-"`
	FactoryCode  string    `gorm:"column:FactoryCode;size:50;not null;default:'ALL';index:idx_report_cache_type_factory,priority:2" json:"-"`
	MasterSeq    string    `gorm:"column:MasterSeq;size:36;not null;default:'';index:idx_report_cache_master" json:"-"`
	RegCode      string    `gorm:"column:RegCode;type:text;not null;default:'';index:idx_report_cache_regcode" json:"-"`
	CacheVersion int       `gorm:"column:CacheVersion;not null" json:"-"`
	Payload      string    `gorm:"column:Payload;type:jsonb;not null" json:"-"`
	CreatedAt    time.Time `gorm:"column:CreatedAt;autoCreateTime" json:"-"`
	UpdatedAt    time.Time `gorm:"column:UpdatedAt;autoUpdateTime" json:"-"`
}

func (ERPReportResultCache) TableName() string { return "_ERPReportResultCache" }
