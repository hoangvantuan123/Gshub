package plan_detail

import (
	"sync/atomic"
	"time"

	models "service-datahub/models/report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type PlanDetailService struct {
	db     *gorm.DB
	logger *zap.Logger

	totalAllCount atomic.Int64
}

func NewPlanDetailService(db *gorm.DB, logger *zap.Logger) *PlanDetailService {
	svc := &PlanDetailService{
		db:     db,
		logger: logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *PlanDetailService) GetDefaultQueryLimit() int {
	return 1500
}

func (s *PlanDetailService) GetMaxQueryLimit() int {
	return 10000
}

func (s *PlanDetailService) GetMaxBatchSaveLimit() int {
	return 5000
}

func (s *PlanDetailService) initTotalAllCounter() {
	var count int64
	if err := s.db.Model(&models.ERPPlanDetail{}).Count(&count).Error; err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Model(&models.ERPPlanDetail{}).Count(&c).Error; err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *PlanDetailService) GetTotalAll() int64 {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Model(&models.ERPPlanDetail{}).Count(&c).Error; err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return c
		}
	}
	return val
}
