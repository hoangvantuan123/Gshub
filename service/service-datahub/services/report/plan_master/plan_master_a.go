package plan_master

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services"
)

// PlanMasterA - Thêm mới bản ghi Master đăng ký báo cáo
func (s *PlanMasterService) PlanMasterA(
	ctx context.Context,
	master *models.ERPPlanMaster,
	userId string,
) (*models.ERPPlanMaster, error) {
	if master == nil {
		return nil, errors.New("dữ liệu master đăng ký rỗng")
	}

	if master.ReportType == "" {
		master.ReportType = "plan"
	}

	regCode := strings.TrimSpace(master.RegCode)
	if regCode == "" {
		prefix := "KHSX"
		if master.ReportType == "statistics" || master.ReportType == "tksx" {
			prefix = "TKSX"
		}
		applyDateStr := ""
		if master.ApplyDate != nil {
			applyDateStr = strings.ReplaceAll(*master.ApplyDate, "-", "")
		} else {
			applyDateStr = time.Now().Format("20060102")
		}
		regCode = fmt.Sprintf("%s_%s_%04d", prefix, applyDateStr, time.Now().UnixNano()%10000)
	}

	now := time.Now()
	statusPublished := "published"
	if master.Status == nil || *master.Status == "" {
		master.Status = &statusPublished
	}

	factoryCode := "GS1"
	if master.FactoryCode != nil && *master.FactoryCode != "" {
		factoryCode = *master.FactoryCode
	} else if master.FactoryName != nil {
		if strings.Contains(strings.ToUpper(*master.FactoryName), "GS5") || strings.Contains(strings.ToLower(*master.FactoryName), "quế võ") {
			factoryCode = "GS5"
		}
	}

	// Kiểm tra tính duy nhất: 1 nhà máy + 1 loại báo cáo + 1 ngày chỉ được tối đa 1 master
	if master.ApplyDate != nil && *master.ApplyDate != "" {
		var existingCount int64
		if master.ReportType == "statistics" || master.ReportType == "tksx" {
			s.db.WithContext(ctx).Model(&models.ERPPlanMaster{}).
				Where(`"FactoryCode" = ? AND ("ReportType" = 'statistics' OR "ReportType" = 'tksx') AND "ApplyDate" = ?`, factoryCode, *master.ApplyDate).
				Count(&existingCount)
		} else {
			s.db.WithContext(ctx).Model(&models.ERPPlanMaster{}).
				Where(`"FactoryCode" = ? AND ("ReportType" = 'plan' OR "ReportType" = 'khsx') AND "ApplyDate" = ?`, factoryCode, *master.ApplyDate).
				Count(&existingCount)
		}
		if existingCount > 0 {
			repTypeName := "Kế hoạch sản xuất"
			if master.ReportType == "statistics" || master.ReportType == "tksx" {
				repTypeName = "Thống kê sản xuất"
			}
			return nil, fmt.Errorf("nhà máy %s đã có đợt đăng ký %s cho ngày %s (mỗi nhà máy chỉ được đăng ký tối đa 1 đợt trong 1 ngày)", factoryCode, repTypeName, *master.ApplyDate)
		}
	}

	masterIdSeq := master.IdSeq
	if masterIdSeq == "" {
		masterIdSeq = services.GenerateUUIDv7()
	}

	record := models.ERPPlanMaster{
		IdSeq:         masterIdSeq,
		RegCode:       regCode,
		ReportType:    master.ReportType,
		FactoryCode:   &factoryCode,
		FactoryName:   master.FactoryName,
		ApplyDate:     master.ApplyDate,
		Remark:        master.Remark,
		Status:        master.Status,
		TotalRows:     master.TotalRows,
		RowVersion:    1,
		IsActive:      true,
		CreatedBy:     &userId,
		CreatedByName: master.CreatedByName,
		CreatedAt:     &now,
		UpdatedBy:     &userId,
		UpdatedByName: master.UpdatedByName,
		UpdatedAt:     &now,
	}

	if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, fmt.Errorf("lỗi khi tạo master: %w", err)
	}

	s.totalAllCount.Add(1)
	return &record, nil
}
