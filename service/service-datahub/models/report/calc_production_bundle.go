package report

import (
	"time"
)

// CalcProductionBundle represents the compressed .gsprod package stored on DataHub Server
type CalcProductionBundle struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	RegCode          string    `gorm:"column:reg_code;type:varchar(100);uniqueIndex;not null" json:"reg_code"`
	FactoryName      string    `gorm:"column:factory_name;type:varchar(100);default:'GS1 Hà Nội'" json:"factory_name"`
	ApplyDate        string    `gorm:"column:apply_date;type:varchar(50)" json:"apply_date"`
	ProductionTeam   string    `gorm:"column:production_team;type:varchar(100)" json:"production_team"`
	Status           string    `gorm:"column:status;type:varchar(50);default:'PUBLISHED'" json:"status"`
	Version          string    `gorm:"column:version;type:varchar(20);default:'1.0'" json:"version"`
	TotalRows        int       `gorm:"column:total_rows;default:0" json:"total_rows"`
	RawSizeMB        float64   `gorm:"column:raw_size_mb;type:numeric(8,2)" json:"raw_size_mb"`
	CompressedSizeMB float64   `gorm:"column:compressed_size_mb;type:numeric(8,2)" json:"compressed_size_mb"`
	CompressionRatio string    `gorm:"column:compression_ratio;type:varchar(20)" json:"compression_ratio"`
	BundleData       []byte    `gorm:"column:bundle_data;type:bytea" json:"-"` // Binary stream of .gsprod (<1MB)
	FileSummaries    string    `gorm:"column:file_summaries;type:jsonb" json:"file_summaries"`
	CalcSummary      string    `gorm:"column:calc_summary;type:jsonb" json:"calc_summary"`
	Remark           string    `gorm:"column:remark;type:text" json:"remark"`
	CreatedBy        string    `gorm:"column:created_by;type:varchar(100)" json:"created_by"`
	CreatedAt        time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (CalcProductionBundle) TableName() string {
	return "calc_production_bundles"
}
