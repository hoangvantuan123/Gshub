package prod_stats_detail

import (
	"context"
	"errors"
	"time"

	models "service-datahub/models/report"

	"gorm.io/gorm"
)

// ProdStatsDetailU chỉ cập nhật hai trường nhật trình đối soát và thông tin audit.
func (s *ProdStatsDetailService) ProdStatsDetailU(
	ctx context.Context,
	items []models.ERPProdStatsDetail,
	userId string,
) ([]models.ERPProdStatsDetail, error) {
	if len(items) == 0 {
		return nil, errors.New("danh sách dòng cập nhật TKSX rỗng")
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			updates := map[string]interface{}{
				"UpdatedBy": userId,
				"UpdatedAt": time.Now(),
			}
			if item.RemarkTypeSeq != nil {
				updates["RemarkTypeSeq"] = *item.RemarkTypeSeq
			}
			if item.RemarkContent != nil {
				updates["RemarkContent"] = *item.RemarkContent
			}
			if item.RemarkTypeSeq == nil && item.RemarkContent == nil {
				return errors.New("không có trường phân loại hoặc diễn giải để cập nhật")
			}

			q := tx.Model(&models.ERPProdStatsDetail{})
			if item.IdSeq != "" {
				q = q.Where(`"IdSeq" = ?`, item.IdSeq)
			} else if item.StatTicketNo != nil && *item.StatTicketNo != "" {
				q = q.Where(`"StatTicketNo" = ?`, *item.StatTicketNo)
			} else {
				return errors.New("thiếu IdSeq hoặc StatTicketNo để xác định dòng cần cập nhật")
			}
			if err := q.Updates(updates).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return items, nil
}
