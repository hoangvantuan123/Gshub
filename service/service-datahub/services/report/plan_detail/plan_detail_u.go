package plan_detail

import (
	"context"
	"errors"
	"time"

	models "service-datahub/models/report"

	"gorm.io/gorm"
)

// PlanDetailU - Cập nhật chi tiết các dòng KHSX Điều Phối
func (s *PlanDetailService) PlanDetailU(
	ctx context.Context,
	items []models.ERPPlanDetail,
	userId string,
) ([]models.ERPPlanDetail, error) {
	if len(items) == 0 {
		return nil, errors.New("danh sách dòng cập nhật KHSX rỗng")
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			if item.IdSeq == "" {
				continue
			}

			updates := map[string]interface{}{
				"WorkingTag":       "U",
				"PicDp":            item.PicDp,
				"OperationNo":      item.OperationNo,
				"OpDate":           item.OpDate,
				"RoutingDocNo":     item.RoutingDocNo,
				"RoutingDocDate":   item.RoutingDocDate,
				"ItemCode":         item.ItemCode,
				"ItemName":         item.ItemName,
				"OperationName":    item.OperationName,
				"OpTypeName":       item.OpTypeName,
				"MachineName":      item.MachineName,
				"Unit":             item.Unit,
				"TargetPassQty":    item.TargetPassQty,
				"TargetProdQty":    item.TargetProdQty,
				"StatPassQty":      item.StatPassQty,
				"StartTime":        item.StartTime,
				"EndTime":          item.EndTime,
				"StandardProdTime": item.StandardProdTime,
				"ActualProdTime":   item.ActualProdTime,
				"StandardCapa":     item.StandardCapa,
				"ActualCapa":       item.ActualCapa,
				"StatusDpSx":       item.StatusDpSx,
				"TimeStatus":       item.TimeStatus,
				"CapaStatus":       item.CapaStatus,
				"UserMemo":         item.UserMemo,
				"RowVersion":       gorm.Expr(`"RowVersion" + 1`),
				"UpdatedBy":        userId,
				"UpdatedAt":        time.Now(),
			}

			if err := tx.Model(&models.ERPPlanDetail{}).Where(`"IdSeq" = ?`, item.IdSeq).Updates(updates).Error; err != nil {
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
