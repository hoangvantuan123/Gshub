package plan_detail

import (
	"context"
	"errors"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services"
	"service-datahub/services/report/report_cache"

	"gorm.io/gorm"
)

// PlanDetailA - Thêm mới danh sách dòng chi tiết KHSX Điều Phối
func (s *PlanDetailService) PlanDetailA(
	ctx context.Context,
	items []models.ERPPlanDetail,
	userId string,
) ([]models.ERPPlanDetail, error) {
	if len(items) == 0 {
		return nil, errors.New("không có dòng chi tiết KHSX nào để thêm mới")
	}

	now := time.Now()
	for i := range items {
		if items[i].IdSeq == "" {
			items[i].IdSeq = services.GenerateUUIDv7()
		}
		items[i].WorkingTag = "A"
		items[i].RowVersion = 1
		items[i].CreatedBy = &userId
		items[i].UpdatedBy = &userId
		items[i].CreatedAt = &now
		items[i].UpdatedAt = &now
		items[i].IsActive = true
	}

	identities := make([]report_cache.BatchIdentity, 0, len(items))
	for _, item := range items {
		identities = append(identities, report_cache.BatchIdentity{MasterSeq: item.MasterSeq, RegCode: item.RegCode})
	}
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.CreateInBatches(items, 500).Error; err != nil {
			return err
		}
		return report_cache.InvalidateBatchResults(tx, "plan", identities)
	}); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(items)))
	return items, nil
}
