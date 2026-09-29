package prod_stats_detail

import (
	"sync/atomic"
	"time"

	models "service-datahub/models/report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type ProdStatsDetailService struct {
	db     *gorm.DB
	logger *zap.Logger

	totalAllCount atomic.Int64
}

func NewProdStatsDetailService(db *gorm.DB, logger *zap.Logger) *ProdStatsDetailService {
	svc := &ProdStatsDetailService{
		db:     db,
		logger: logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *ProdStatsDetailService) GetDefaultQueryLimit() int {
	return 1500
}

func (s *ProdStatsDetailService) GetMaxQueryLimit() int {
	return 10000
}

func (s *ProdStatsDetailService) GetMaxBatchSaveLimit() int {
	return 5000
}

func (s *ProdStatsDetailService) initTotalAllCounter() {
	var count int64
	if err := s.db.Model(&models.ERPProdStatsDetail{}).Count(&count).Error; err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Model(&models.ERPProdStatsDetail{}).Count(&c).Error; err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *ProdStatsDetailService) GetTotalAll() int64 {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Model(&models.ERPProdStatsDetail{}).Count(&c).Error; err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return c
		}
	}
	return val
}
