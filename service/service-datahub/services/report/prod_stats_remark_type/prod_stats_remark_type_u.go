package prod_stats_remark_type

import (
	"context"
	"gorm.io/gorm"
	models "service-datahub/models/report"
	"time"
)

// U replaces editable text fields; an omitted IsActive retains its current value.
func (s *ProdStatsRemarkTypeService) ProdStatsRemarkTypeU(ctx context.Context, items []models.ERPProdStatsRemarkType, userSeq string) ([]models.ERPProdStatsRemarkType, error) {
	if err := validateItems(items, true); err != nil {
		return nil, err
	}
	updated := make([]models.ERPProdStatsRemarkType, 0, len(items))
	err := s.write(ctx, func(tx *gorm.DB) error {
		for _, it := range items {
			if err := checkCode(tx, it.TypeCode, it.IdSeq); err != nil {
				return err
			}
			values := map[string]interface{}{"TypeCode": it.TypeCode, "TypeName": it.TypeName, "Description": it.Description, "IdxNo": it.IdxNo, "UpdatedBy": userSeq, "UpdatedAt": time.Now()}
			if it.IsActive != nil {
				values["IsActive"] = *it.IsActive
			}
			values["RowVersion"] = gorm.Expr(`"RowVersion" + 1`)
			res := tx.Model(&models.ERPProdStatsRemarkType{}).
				Where(`"IdSeq" = ? AND "RowVersion" = ?`, it.IdSeq, it.RowVersion).
				Updates(values)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return conflict("Dữ liệu đã được người khác cập nhật. Hãy truy vấn lại trước khi lưu: " + it.TypeCode)
			}
			if res.RowsAffected != 1 {
				return conflict("IdSeq bị trùng trong DB; cần xử lý dữ liệu trước khi cập nhật")
			}
			var row models.ERPProdStatsRemarkType
			if err := tx.Where(`"IdSeq" = ?`, it.IdSeq).Take(&row).Error; err != nil {
				return err
			}
			updated = append(updated, row)
		}
		return nil
	})
	return updated, err
}
