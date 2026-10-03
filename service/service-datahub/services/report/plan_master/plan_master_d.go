package plan_master

import (
	"context"
	"errors"
	"fmt"

	models "service-datahub/models/report"

	"gorm.io/gorm"
)

// PlanMasterD - Xóa Master và tự động xóa dữ liệu chi tiết liên kết ở cả 2 bảng Detail (không cần FK)
func (s *PlanMasterService) PlanMasterD(
	ctx context.Context,
	masterSeqs []string,
	userId string,
) error {
	if len(masterSeqs) == 0 {
		return errors.New("danh sách IdSeq Master cần xóa rỗng")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var masters []models.ERPPlanMaster
		if err := tx.Where(`"IdSeq" IN ? OR "RegCode" IN ?`, masterSeqs, masterSeqs).Find(&masters).Error; err == nil && len(masters) > 0 {
			var allRegCodes []string
			var allIdSeqs []string
			for _, m := range masters {
				allRegCodes = append(allRegCodes, m.RegCode)
				allIdSeqs = append(allIdSeqs, m.IdSeq)
			}
			// 1. Xóa các dòng KHSX trong _ERPPlanDetail
			if err := tx.Where(`"MasterSeq" IN ? OR "RegCode" IN ?`, allIdSeqs, allRegCodes).Delete(&models.ERPPlanDetail{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa các dòng chi tiết KHSX liên kết: %w", err)
			}
			// 2. Xóa các dòng TKSX trong _ERPProdStatsDetail
			if err := tx.Where(`"MasterSeq" IN ? OR "RegCode" IN ?`, allIdSeqs, allRegCodes).Delete(&models.ERPProdStatsDetail{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa các dòng chi tiết TKSX liên kết: %w", err)
			}
			// 3. Xóa các bản ghi Master trong _ERPPlanMaster
			if err := tx.Where(`"IdSeq" IN ? OR "RegCode" IN ?`, allIdSeqs, allRegCodes).Delete(&models.ERPPlanMaster{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa bản ghi Master: %w", err)
			}
		} else {
			if err := tx.Where(`"MasterSeq" IN ? OR "RegCode" IN ?`, masterSeqs, masterSeqs).Delete(&models.ERPPlanDetail{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa các dòng chi tiết KHSX liên kết: %w", err)
			}
			if err := tx.Where(`"MasterSeq" IN ? OR "RegCode" IN ?`, masterSeqs, masterSeqs).Delete(&models.ERPProdStatsDetail{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa các dòng chi tiết TKSX liên kết: %w", err)
			}
			if err := tx.Where(`"IdSeq" IN ? OR "RegCode" IN ?`, masterSeqs, masterSeqs).Delete(&models.ERPPlanMaster{}).Error; err != nil {
				return fmt.Errorf("lỗi khi xóa bản ghi Master: %w", err)
			}
		}

		return nil
	})
}
