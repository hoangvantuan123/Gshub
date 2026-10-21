package prod_stats_remark_type

import (
	"context"
	"gorm.io/gorm"
	models "service-datahub/models/report"
	"strings"
)

func (s *ProdStatsRemarkTypeService) ProdStatsRemarkTypeD(ctx context.Context, ids []string) (int64, error) {
	if len(ids) == 0 || len(ids) > MaxBatchSize {
		return 0, invalid("Số IdSeq phải từ 1 đến 500")
	}
	seen := map[string]bool{}
	for i := range ids {
		ids[i] = strings.TrimSpace(ids[i])
		if !validID(ids[i]) || seen[ids[i]] {
			return 0, invalid("IdSeq phải là UUIDv7 chuẩn và không trùng")
		}
		seen[ids[i]] = true
	}
	var deleted int64
	err := s.write(ctx, func(tx *gorm.DB) error {
		var used int64
		if err := tx.Table(`"_ERPProdStatsDetail"`).Where(`"RemarkTypeSeq" IN ?`, ids).Count(&used).Error; err != nil {
			return err
		}
		if used > 0 {
			return conflict("Phân loại đang được sử dụng; hãy ngừng sử dụng bằng IsActive=false")
		}
		// No FK or cascading delete: protect referenced types in the application.
		for _, id := range ids {
			res := tx.Where(`"IdSeq" = ?`, id).Delete(&models.ERPProdStatsRemarkType{})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return &APIError{404, "Không tìm thấy phân loại: " + id}
			}
			if res.RowsAffected != 1 {
				return conflict("IdSeq bị trùng trong DB")
			}
			deleted++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return deleted, nil
}
