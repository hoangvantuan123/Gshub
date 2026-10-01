package plan_master

import (
	"context"
	"errors"
	"fmt"
	"time"

	models "service-datahub/models/report"

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

	if err := s.db.WithContext(ctx).Model(&models.ERPPlanMaster{}).Where(`"IdSeq" = ?`, master.IdSeq).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("lỗi cập nhật Master: %w", err)
	}

	var updated models.ERPPlanMaster
	if err := s.db.WithContext(ctx).Where(`"IdSeq" = ?`, master.IdSeq).First(&updated).Error; err != nil {
		return nil, err
	}

	return &updated, nil
}
