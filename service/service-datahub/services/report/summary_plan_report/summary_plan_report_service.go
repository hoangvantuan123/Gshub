package summary_plan_report

import (
	"context"

	models "service-datahub/models/report"
	"service-datahub/services/report/plan_report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type SummaryPlanReportService struct {
	db          *gorm.DB
	planRepoSvc *plan_report.PlanReportService
	logger      *zap.Logger
}

func NewSummaryPlanReportService(db *gorm.DB, logger *zap.Logger) *SummaryPlanReportService {
	return &SummaryPlanReportService{
		db:          db,
		planRepoSvc: plan_report.NewPlanReportService(db, logger),
		logger:      logger,
	}
}

// GenerateSummaryPlanReport: Xử lý và tính toán số liệu Báo Cáo KHSX Tổng Hợp Toàn Công Ty
func (s *SummaryPlanReportService) GenerateSummaryPlanReport(ctx context.Context, filters map[string]string) (*models.PlanReportResponse, error) {
	execFilters := make(map[string]string)
	for k, v := range filters {
		execFilters[k] = v
	}

	// Báo cáo Tổng Hợp mặc định KHÔNG trả danh sách Items chi tiết để tối ưu hiệu năng
	execFilters["withoutItems"] = "true"

	reportData, err := s.planRepoSvc.GenerateProductionPlanReport(ctx, execFilters)
	if err != nil {
		return nil, err
	}

	// Đảm bảo Items luôn rỗng trong báo cáo tổng hợp
	reportData.Items = []models.PlanDetailReportItem{}
	reportData.Pagination.LoadedCount = 0
	reportData.Pagination.PageSize = 0

	return reportData, nil
}
