package plan_master

import (
	"context"
	"errors"
	"fmt"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services/report/report_cache"

	"gorm.io/gorm"
)

// PlanMasterU - Cập nhật thông tin Master đăng ký báo cáo
func (s *PlanMasterService) PlanMasterU(
	ctx context.Context,
	master *models.ERPPlanMaster,
	userId string,
) (*models.ERPPlanMaster, error) {
	if master == nil || master.IdSeq == "" {
		return nil, errors.New("thiếu IdSeq của bản ghi Master cần cập nhật")
	}

	updates := map[string]interface{}{
		"FactoryCode": master.FactoryCode,
		"FactoryName": master.FactoryName,
		"ApplyDate":   master.ApplyDate,
		"Remark":      master.Remark,
		"Status":      master.Status,
		"TotalRows":   master.TotalRows,
		"RowVersion":  gorm.Expr(`"RowVersion" + 1`),
		"UpdatedBy":   userId,
		"UpdatedAt":   time.Now(),
	}

	var updated models.ERPPlanMaster
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.ERPPlanMaster
		if err := tx.Where(`"IdSeq" = ?`, master.IdSeq).First(&current).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.ERPPlanMaster{}).Where(`"IdSeq" = ?`, master.IdSeq).Updates(updates).Error; err != nil {
			return fmt.Errorf("lỗi cập nhật Master: %w", err)
		}
		if err := tx.Where(`"IdSeq" = ?`, master.IdSeq).First(&updated).Error; err != nil {
			return err
		}
		identity := []report_cache.BatchIdentity{{MasterSeq: updated.IdSeq, RegCode: updated.RegCode}}
		if err := report_cache.InvalidateBatchResults(tx, report_cache.NormalizeReportType(current.ReportType), identity); err != nil {
			return err
		}
		if report_cache.NormalizeReportType(updated.ReportType) != report_cache.NormalizeReportType(current.ReportType) {
			if err := report_cache.InvalidateBatchResults(tx, report_cache.NormalizeReportType(updated.ReportType), identity); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return &updated, nil
}
