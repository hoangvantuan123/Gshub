package plan_detail

import (
	"context"
	"errors"

	models "service-datahub/models/report"
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

	return s.db.WithContext(ctx).Where(`"IdSeq" IN ?`, detailSeqs).Delete(&models.ERPPlanDetail{}).Error
}
