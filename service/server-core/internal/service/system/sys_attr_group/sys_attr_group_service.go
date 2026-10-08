package sys_attr_group

import (
	"context"
	"encoding/json"
	"sync/atomic"
	"time"

	"server-core/internal/config"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type SysAttrGroupsService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger

	totalAllCount atomic.Int64
}

func (s *SysAttrGroupsService) GetDefaultQueryLimit() int {
	return config.GetDefaultQueryLimit("SYS_ATTR_GROUP")
}

func (s *SysAttrGroupsService) GetMaxQueryLimit() int {
	return config.GetMaxQueryLimit("SYS_ATTR_GROUP")
}

func (s *SysAttrGroupsService) GetMaxBatchSaveLimit() int {
	return config.GetMaxBatchLimit("SYS_ATTR_GROUP")
}

func NewSysAttrGroupsService(db *sqlx.DB) *SysAttrGroupsService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.system.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	svc := &SysAttrGroupsService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *SysAttrGroupsService) initTotalAllCounter() {
	var count int64
	if err := s.db.Get(&count, `SELECT COUNT(*) FROM "_ERPSysAttrGroups"`); err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPSysAttrGroups"`); err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *SysAttrGroupsService) GetTotalAll() int {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPSysAttrGroups"`); err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return int(c)
		}
	}
	return int(val)
}

func (s *SysAttrGroupsService) PublishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPSysAttrGroups",
		"payload":   payload,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	bytes, err := json.Marshal(eventData)
	if err != nil {
		return
	}

	go func() {
		_ = s.kafkaWriter.WriteMessages(context.Background(), kafka.Message{
			Key:   []byte(eventType),
			Value: bytes,
		})
	}()
}
