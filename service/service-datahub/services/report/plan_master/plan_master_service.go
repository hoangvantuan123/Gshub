package plan_master

import (
	"sync/atomic"
	"time"

	models "service-datahub/models/report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type PlanMasterService struct {
	db     *gorm.DB
	logger *zap.Logger

	totalAllCount atomic.Int64
}

func NewPlanMasterService(db *gorm.DB, logger *zap.Logger) *PlanMasterService {
	svc := &PlanMasterService{
		db:     db,
		logger: logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *PlanMasterService) GetDefaultQueryLimit() int {
	return 1500
}

func (s *PlanMasterService) GetMaxQueryLimit() int {
	return 10000
}

func (s *PlanMasterService) GetMaxBatchSaveLimit() int {
	return 5000
}

func (s *PlanMasterService) initTotalAllCounter() {
	var count int64
	if err := s.db.Model(&models.ERPPlanMaster{}).Count(&count).Error; err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Model(&models.ERPPlanMaster{}).Count(&c).Error; err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *PlanMasterService) GetTotalAll() int64 {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Model(&models.ERPPlanMaster{}).Count(&c).Error; err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return c
		}
	}
	return val
}
