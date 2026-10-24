package plan_detail

import (
	"context"
	"errors"
	"fmt"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services/report/report_cache"

	"gorm.io/gorm"
)

// PlanDetailU - Cập nhật đúng 2 trường RemarkTypeSeq và RemarkContent theo IdSeq của từng dòng KHSX,
// kiểm tra RowVersion khi lưu để cảnh báo xung đột dữ liệu và cập nhật UpdatedBy người thực hiện.
func (s *PlanDetailService) PlanDetailU(
	ctx context.Context,
	items []models.ERPPlanDetail,
	userId string,
) ([]models.ERPPlanDetail, error) {
	if len(items) == 0 {
		return nil, errors.New("danh sách dòng cập nhật KHSX rỗng")
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		changedBatches := make([]report_cache.BatchIdentity, 0, len(items))
		for _, item := range items {
			if item.IdSeq == "" {
				continue
			}

			// 1. Kiểm tra RowVersion nếu client gửi lên
			var current models.ERPPlanDetail
			if err := tx.Select(`"IdSeq", "MasterSeq", "RegCode", "RowVersion"`).Where(`"IdSeq" = ?`, item.IdSeq).First(&current).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("không tìm thấy bản ghi KHSX với IdSeq=%s", item.IdSeq)
				}
				return err
			}
			if item.RowVersion > 0 && current.RowVersion != item.RowVersion {
				return fmt.Errorf("xung đột phiên bản: Dòng kế hoạch %s đã bị thay đổi bởi người khác (version hiện tại: %d, version của bạn: %d). Vui lòng tải lại trang!", item.IdSeq, current.RowVersion, item.RowVersion)
			}

			// 2. Chỉ cập nhật đúng 2 trường RemarkTypeSeq, RemarkContent và các trường quản trị hệ thống
			updates := map[string]interface{}{
				"UpdatedBy":  userId,
				"UpdatedAt":  time.Now(),
				"RowVersion": gorm.Expr(`"RowVersion" + 1`),
			}

			if item.RemarkTypeSeq != nil {
				updates["RemarkTypeSeq"] = *item.RemarkTypeSeq
			}
			if item.RemarkContent != nil {
				updates["RemarkContent"] = *item.RemarkContent
			}

			q := tx.Model(&models.ERPPlanDetail{}).Where(`"IdSeq" = ?`, item.IdSeq)
			if item.RowVersion > 0 {
				q = q.Where(`"RowVersion" = ?`, item.RowVersion)
			}

			res := q.Updates(updates)
			if res.Error != nil {
				return res.Error
			}
			if item.RowVersion > 0 && res.RowsAffected == 0 {
				return fmt.Errorf("xung đột phiên bản: Dòng kế hoạch %s đã bị cập nhật đồng thời bởi người dùng khác. Vui lòng tải lại!", item.IdSeq)
			}
			if res.RowsAffected > 0 {
				changedBatches = append(changedBatches, report_cache.BatchIdentity{MasterSeq: current.MasterSeq, RegCode: current.RegCode})
			}
		}
		return report_cache.InvalidateBatchResults(tx, "plan", changedBatches)
	})

	if err != nil {
		return nil, err
	}

	return items, nil
}
