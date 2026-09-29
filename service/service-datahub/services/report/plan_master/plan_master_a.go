package plan_master

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	models "service-datahub/models/report"
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

	record := models.ERPPlanMaster{
		RegCode:       regCode,
		ReportType:    master.ReportType,
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
