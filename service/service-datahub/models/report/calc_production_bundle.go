package report

import (
	"time"
)

// CalcProductionBundle represents the compressed .gsprod package stored on DataHub Server
type CalcProductionBundle struct {
	ID               uint      `gorm:"primaryKey;autoIncrement;column:Id" json:"id"`
	RegCode          string    `gorm:"column:RegCode;type:varchar(100);uniqueIndex:idx_reg_version;not null" json:"reg_code"`
	Version          string    `gorm:"column:Version;type:varchar(20);uniqueIndex:idx_reg_version;default:'1.0'" json:"version"`
	FileName         string    `gorm:"column:FileName;type:varchar(255)" json:"file_name"`
	FilePath         string    `gorm:"column:FilePath;type:varchar(500)" json:"file_path"`
	StorageDisk      string    `gorm:"column:StorageDisk;type:varchar(50);default:'local'" json:"storage_disk"`
	FactoryName      string    `gorm:"column:FactoryName;type:varchar(100);default:'GS1 Hà Nội'" json:"factory_name"`
	ApplyDate        string    `gorm:"column:ApplyDate;type:varchar(50);index" json:"apply_date"`
	ProductionTeam   string    `gorm:"column:ProductionTeam;type:varchar(100);index" json:"production_team"`
	Status           string    `gorm:"column:Status;type:varchar(50);default:'PUBLISHED'" json:"status"`
	TotalRows        int       `gorm:"column:TotalRows;default:0" json:"total_rows"`
	RawSizeMB        float64   `gorm:"column:RawSizeMB;type:numeric(8,3)" json:"raw_size_mb"`
	CompressedSizeMB float64   `gorm:"column:CompressedSizeMB;type:numeric(8,3)" json:"compressed_size_mb"`
	CompressionRatio string    `gorm:"column:CompressionRatio;type:varchar(20)" json:"compression_ratio"`
	BundleData       []byte    `gorm:"column:BundleData;type:bytea" json:"-"` // Binary stream of .gsprod (<1MB)
	FileSummaries    string    `gorm:"column:FileSummaries;type:jsonb" json:"file_summaries"`
	CalcSummary      string    `gorm:"column:CalcSummary;type:jsonb" json:"calc_summary"`
	Remark           string    `gorm:"column:Remark;type:text" json:"remark"`
	CreatedBy        string    `gorm:"column:CreatedBy;type:varchar(100)" json:"created_by"`
	CreatedAt        time.Time `gorm:"column:CreatedAt;autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time `gorm:"column:UpdatedAt;autoUpdateTime" json:"updated_at"`
}

func (CalcProductionBundle) TableName() string {
	return "_ERPProductionBundle"
}
