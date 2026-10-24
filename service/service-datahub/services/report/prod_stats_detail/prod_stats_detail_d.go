package prod_stats_detail

import (
	"context"
	"errors"

	models "service-datahub/models/report"
	"service-datahub/services/report/report_cache"

	"gorm.io/gorm"
)

// ProdStatsDetailD - Xóa danh sách dòng chi tiết Thống Kê Sản Xuất
func (s *ProdStatsDetailService) ProdStatsDetailD(
	ctx context.Context,
	detailSeqs []string,
	userId string,
) error {
	if len(detailSeqs) == 0 {
		return errors.New("danh sách IdSeq Detail TKSX cần xóa rỗng")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var rows []models.ERPProdStatsDetail
		if err := tx.Select(`"MasterSeq", "RegCode"`).Where(`"IdSeq" IN ?`, detailSeqs).Find(&rows).Error; err != nil {
			return err
		}
		if err := tx.Where(`"IdSeq" IN ?`, detailSeqs).Delete(&models.ERPProdStatsDetail{}).Error; err != nil {
			return err
		}
		if err := tx.Where(`"ReportType" = ? AND "DetailIdSeq" IN ?`, "statistics", detailSeqs).Delete(&models.ERPReportReconciliation{}).Error; err != nil {
			return err
		}
		identities := make([]report_cache.BatchIdentity, 0, len(rows))
		for _, row := range rows {
			identities = append(identities, report_cache.BatchIdentity{MasterSeq: row.MasterSeq, RegCode: row.RegCode})
		}
		return report_cache.InvalidateBatchResults(tx, "statistics", identities)
	})
}
