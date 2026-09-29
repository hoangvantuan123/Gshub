package prod_stats_detail

import (
	"context"
	"errors"
	"time"

	models "service-datahub/models/report"

	"gorm.io/gorm"
)

// ProdStatsDetailU - Cập nhật chi tiết các dòng Thống Kê Sản Xuất
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
			if item.IdSeq <= 0 {
				continue
			}

			updates := map[string]interface{}{
				"WorkingTag":             "U",
				"ItemCode":               item.ItemCode,
				"ItemName":               item.ItemName,
				"Version":                item.Version,
				"Model":                  item.Model,
				"DefectMarginWeight":     item.DefectMarginWeight,
				"TechMarginWeight":       item.TechMarginWeight,
				"OperationNo":            item.OperationNo,
				"MainWorker":             item.MainWorker,
				"SubWorker1":             item.SubWorker1,
				"SubWorker2":             item.SubWorker2,
				"BreakdownReason":        item.BreakdownReason,
				"MachineCode":            item.MachineCode,
				"MachineName":            item.MachineName,
				"OpTypeCode":             item.OpTypeCode,
				"OpTypeName":             item.OpTypeName,
				"UvPlate":                item.UvPlate,
				"MoldSetQty1":            item.MoldSetQty1,
				"MoldSetQty2":            item.MoldSetQty2,
				"MoldSetQty3":            item.MoldSetQty3,
				"ProdQty":                item.ProdQty,
				"PassQty":                item.PassQty,
				"ActualMeters":           item.ActualMeters,
				"StandardMeters":         item.StandardMeters,
				"TeamName":               item.TeamName,
				"Shift":                  item.Shift,
				"StartDate":              item.StartDate,
				"StartTime":              item.StartTime,
				"EndDate":                item.EndDate,
				"EndTime":                item.EndTime,
				"StatDate":               item.StatDate,
				"StatTicketNo":           item.StatTicketNo,
				"StatStaff":              item.StatStaff,
				"Customer":               item.Customer,
				"SalesStaff":             item.SalesStaff,
				"OrderNo":                item.OrderNo,
				"ProcessName":            item.ProcessName,
				"Unit":                   item.Unit,
				"ConvUnit":               item.ConvUnit,
				"ProcessSpec":            item.ProcessSpec,
				"PartNo":                 item.PartNo,
				"CorrugatedPartNo":       item.CorrugatedPartNo,
				"TrimPartNo":             item.TrimPartNo,
				"ColorQty":               item.ColorQty,
				"OutPlateType":           item.OutPlateType,
				"FrontColors":            item.FrontColors,
				"BackColors":             item.BackColors,
				"JobNumber":              item.JobNumber,
				"Width":                  item.Width,
				"Length":                 item.Length,
				"Height":                 item.Height,
				"ProductLine":            item.ProductLine,
				"RawWidth":               item.RawWidth,
				"RawLength":              item.RawLength,
				"RawLineCode":            item.RawLineCode,
				"RawLineName":            item.RawLineName,
				"FlipType":               item.FlipType,
				"BomPlates":              item.BomPlates,
				"Coating":                item.Coating,
				"SlitterBlades":          item.SlitterBlades,
				"CodePositions":          item.CodePositions,
				"PunchHoles":             item.PunchHoles,
				"StructureCode":          item.StructureCode,
				"StructureName":          item.StructureName,
				"RoutingDocNo":           item.RoutingDocNo,
				"RoutingDate":            item.RoutingDate,
				"ReleaseDate":            item.ReleaseDate,
				"TargetPassQty":          item.TargetPassQty,
				"TargetProdQty":          item.TargetProdQty,
				"RoutingUnit":            item.RoutingUnit,
				"BreakdownMinutes":       item.BreakdownMinutes,
				"WaitingMaterialMinutes": item.WaitingMaterialMinutes,
				"SetupMinutes":           item.SetupMinutes,
				"RepairMinutes":          item.RepairMinutes,
				"TotalWasteMinutes":      item.TotalWasteMinutes,
				"RigidBoxGlue":           item.RigidBoxGlue,
				"Outsourcing":            item.Outsourcing,
				"DefectQty":              item.DefectQty,
				"DefectRate":             item.DefectRate,
				"DefectUnit":             item.DefectUnit,
				"Status":                 item.Status,
				"AutoExport":             item.AutoExport,
				"AutoImport":             item.AutoImport,
				"ExportDocNo":            item.ExportDocNo,
				"ImportDocNo":            item.ImportDocNo,
				"WrongOpCode":            item.WrongOpCode,
				"IsAdditionalStat":       item.IsAdditionalStat,
				"TicketCreatedDate":      item.TicketCreatedDate,
				"ActualRunTime":          item.ActualRunTime,
				"ActualCapa":             item.ActualCapa,
				"CheckPlanStatus":        item.CheckPlanStatus,
				"MesApprovalTime":        item.MesApprovalTime,
				"SyncDelayMinutes":       item.SyncDelayMinutes,
				"IsDuplicateTicket":      item.IsDuplicateTicket,
				"TicketCreationLocation": item.TicketCreationLocation,
				"AutoIoStatus":           item.AutoIoStatus,
				"UserMemo":               item.UserMemo,
				"RowVersion":             gorm.Expr(`"RowVersion" + 1`),
				"UpdatedBy":              userId,
				"UpdatedAt":              time.Now(),
			}

			if err := tx.Model(&models.ERPProdStatsDetail{}).Where(`"IdSeq" = ?`, item.IdSeq).Updates(updates).Error; err != nil {
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
