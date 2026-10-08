package perm_scope

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

type PermScopesService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger

	totalAllCount atomic.Int64
}

func (s *PermScopesService) GetDefaultQueryLimit() int {
	return config.GetDefaultQueryLimit("PERM_SCOPE")
}

func (s *PermScopesService) GetMaxQueryLimit() int {
	return config.GetMaxQueryLimit("PERM_SCOPE")
}

func (s *PermScopesService) GetMaxBatchSaveLimit() int {
	return config.GetMaxBatchLimit("PERM_SCOPE")
}

func NewPermScopesService(db *sqlx.DB) *PermScopesService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.auth.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	svc := &PermScopesService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *PermScopesService) initTotalAllCounter() {
	var count int64
	if err := s.db.Get(&count, `SELECT COUNT(*) FROM "_ERPPermScopes"`); err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPPermScopes"`); err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *PermScopesService) GetTotalAll() int {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPPermScopes"`); err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return int(c)
		}
	}
	return int(val)
}

func (s *PermScopesService) PublishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPPermScopes",
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
