package prod_machine_catalog

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	models "service-datahub/models/report"
)

func (s *ProdMachineCatalogService) ProdMachineCatalogA(ctx context.Context, items []models.ERPProdMachineCatalog, userId string) ([]models.ERPProdMachineCatalog, error) {
	if err := validateItems(items, false); err != nil {
		return nil, err
	}
	now := time.Now()
	for i := range items {
		items[i].RowVersion = 1
		if items[i].IdSeq == "" {
			id, err := uuid.NewV7()
			if err != nil {
				return nil, err
			}
			items[i].IdSeq = id.String()
		}
		if items[i].IsActive == nil {
			active := true
			items[i].IsActive = &active
		}
		items[i].CreatedBy, items[i].UpdatedBy = &userId, &userId
		items[i].CreatedAt, items[i].UpdatedAt = &now, &now
	}
	err := s.write(ctx, func(tx *gorm.DB) error {
		for _, it := range items {
			if err := checkCode(tx, it.MachineCode, ""); err != nil {
				return err
			}
			var count int64
			if err := tx.Model(&models.ERPProdMachineCatalog{}).Where(`"IdSeq" = ?`, it.IdSeq).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return conflict("IdSeq đã tồn tại")
			}
		}
		return tx.CreateInBatches(&items, MaxBatchSize).Error
	})
	return items, err
}
