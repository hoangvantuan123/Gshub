package plan_detail

import (
	"context"
	"errors"

	models "service-datahub/models/report"
	"service-datahub/services/report/report_cache"

	"gorm.io/gorm"
)

// PlanDetailD - Xóa danh sách dòng chi tiết KHSX Điều Phối
func (s *PlanDetailService) PlanDetailD(
	ctx context.Context,
	detailSeqs []string,
	userId string,
) error {
	if len(detailSeqs) == 0 {
		return errors.New("danh sách IdSeq Detail KHSX cần xóa rỗng")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var rows []models.ERPPlanDetail
		if err := tx.Select(`"MasterSeq", "RegCode"`).Where(`"IdSeq" IN ?`, detailSeqs).Find(&rows).Error; err != nil {
			return err
		}
		if err := tx.Where(`"IdSeq" IN ?`, detailSeqs).Delete(&models.ERPPlanDetail{}).Error; err != nil {
			return err
		}
		if err := tx.Where(`"ReportType" = ? AND "DetailIdSeq" IN ?`, "plan", detailSeqs).Delete(&models.ERPReportReconciliation{}).Error; err != nil {
			return err
		}
		identities := make([]report_cache.BatchIdentity, 0, len(rows))
		for _, row := range rows {
			identities = append(identities, report_cache.BatchIdentity{MasterSeq: row.MasterSeq, RegCode: row.RegCode})
		}
		return report_cache.InvalidateBatchResults(tx, "plan", identities)
	})
}
