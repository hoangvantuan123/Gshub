package prod_machine_catalog

import (
	"context"
	"time"

	"gorm.io/gorm"
	models "service-datahub/models/report"
)

// ProdMachineCatalogU updates editable machine catalog fields with optimistic locking via RowVersion.
func (s *ProdMachineCatalogService) ProdMachineCatalogU(ctx context.Context, items []models.ERPProdMachineCatalog, userId string) ([]models.ERPProdMachineCatalog, error) {
	if err := validateItems(items, true); err != nil {
		return nil, err
	}
	updated := make([]models.ERPProdMachineCatalog, 0, len(items))
	err := s.write(ctx, func(tx *gorm.DB) error {
		for _, it := range items {
			if err := checkCode(tx, it.MachineCode, it.IdSeq); err != nil {
				return err
			}
			values := map[string]interface{}{
				"MachineCode": it.MachineCode,
				"MachineName": it.MachineName,
				"TeamCode":    it.TeamCode,
				"TeamName":    it.TeamName,
				"Factory":     it.Factory,
				"Description": it.Description,
				"IdxNo":       it.IdxNo,
				"UpdatedBy":   userId,
				"UpdatedAt":   time.Now(),
			}
			if it.IsActive != nil {
				values["IsActive"] = *it.IsActive
			}
			values["RowVersion"] = gorm.Expr(`"RowVersion" + 1`)
			res := tx.Model(&models.ERPProdMachineCatalog{}).
				Where(`"IdSeq" = ? AND "RowVersion" = ?`, it.IdSeq, it.RowVersion).
				Updates(values)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return conflict("Dữ liệu đã được người khác cập nhật. Hãy truy vấn lại trước khi lưu: " + it.MachineCode)
			}
			if res.RowsAffected != 1 {
				return conflict("IdSeq bị trùng trong DB; cần xử lý dữ liệu trước khi cập nhật")
			}
			var row models.ERPProdMachineCatalog
			if err := tx.Where(`"IdSeq" = ?`, it.IdSeq).Take(&row).Error; err != nil {
				return err
			}
			updated = append(updated, row)
		}
		return nil
	})
	return updated, err
}
