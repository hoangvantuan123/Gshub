package summary_stat_report

import (
	"context"

	models "service-datahub/models/report"
	"service-datahub/services/report/prod_stats_detail"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type SummaryStatReportService struct {
	db          *gorm.DB
	statRepoSvc *prod_stats_detail.ProdStatsDetailService
	logger      *zap.Logger
}

func NewSummaryStatReportService(db *gorm.DB, logger *zap.Logger) *SummaryStatReportService {
	return &SummaryStatReportService{
		db:          db,
		statRepoSvc: prod_stats_detail.NewProdStatsDetailService(db, logger),
		logger:      logger,
	}
}

// GenerateSummaryStatReport: Xử lý và tính toán số liệu Báo Cáo TKSX Tổng Hợp Toàn Công Ty
func (s *SummaryStatReportService) GenerateSummaryStatReport(ctx context.Context, filters map[string]string) (*models.ProdStatsReportResponse, error) {
	execFilters := make(map[string]string)
	for k, v := range filters {
		execFilters[k] = v
	}

	// Báo cáo Tổng Hợp mặc định KHÔNG trả danh sách Items chi tiết để tối ưu hiệu năng
	execFilters["withoutItems"] = "true"

	reportData, err := s.statRepoSvc.GenerateProductionStatisticsReport(ctx, execFilters)
	if err != nil {
		return nil, err
	}

	// Đảm bảo Items luôn rỗng trong báo cáo tổng hợp
	reportData.Items = []models.ProdStatsDetailReportItem{}
	reportData.Pagination.LoadedCount = 0
	reportData.Pagination.PageSize = 0

	return reportData, nil
}
