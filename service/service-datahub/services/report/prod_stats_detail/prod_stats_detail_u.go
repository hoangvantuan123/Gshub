package prod_stats_detail

import (
	"context"
	"errors"
	"fmt"
	"time"

	models "service-datahub/models/report"

	"gorm.io/gorm"
)

// ProdStatsDetailU - Cập nhật đúng 2 trường RemarkTypeSeq và RemarkContent theo IdSeq của từng dòng TKSX,
// kiểm tra RowVersion khi lưu để cảnh báo xung đột dữ liệu và cập nhật UpdatedBy người thực hiện.
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
			if item.IdSeq == "" && (item.StatTicketNo == nil || *item.StatTicketNo == "") {
				continue
			}

			// 1. Kiểm tra RowVersion nếu client gửi lên
			if item.RowVersion > 0 && item.IdSeq != "" {
				var current models.ERPProdStatsDetail
				if err := tx.Select(`"IdSeq", "RowVersion"`).Where(`"IdSeq" = ?`, item.IdSeq).First(&current).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return fmt.Errorf("không tìm thấy bản ghi TKSX với IdSeq=%s", item.IdSeq)
					}
					return err
				}
				if current.RowVersion != item.RowVersion {
					return fmt.Errorf("xung đột phiên bản: Phiếu thống kê %s đã bị thay đổi bởi người khác (version hiện tại: %d, version của bạn: %d). Vui lòng tải lại trang!", item.IdSeq, current.RowVersion, item.RowVersion)
				}
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

			q := tx.Model(&models.ERPProdStatsDetail{})
			if item.IdSeq != "" {
				q = q.Where(`"IdSeq" = ?`, item.IdSeq)
				if item.RowVersion > 0 {
					q = q.Where(`"RowVersion" = ?`, item.RowVersion)
				}
			} else if item.StatTicketNo != nil && *item.StatTicketNo != "" {
				q = q.Where(`"StatTicketNo" = ?`, *item.StatTicketNo)
			}

			res := q.Updates(updates)
			if res.Error != nil {
				return res.Error
			}
			if item.RowVersion > 0 && item.IdSeq != "" && res.RowsAffected == 0 {
				return fmt.Errorf("xung đột phiên bản: Phiếu thống kê %s đã bị cập nhật đồng thời bởi người dùng khác. Vui lòng tải lại!", item.IdSeq)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return items, nil
}
