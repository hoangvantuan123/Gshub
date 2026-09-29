package plan_detail

import (
	"context"
	"errors"
	"time"

	models "service-datahub/models/report"
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
		items[i].IdSeq = 0
		items[i].WorkingTag = "A"
		items[i].RowVersion = 1
		items[i].CreatedBy = &userId
		items[i].UpdatedBy = &userId
		items[i].CreatedAt = &now
		items[i].UpdatedAt = &now
		items[i].IsActive = true
	}

	if err := s.db.WithContext(ctx).CreateInBatches(items, 500).Error; err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(items)))
	return items, nil
}
