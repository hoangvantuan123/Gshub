package menu

import (
	"context"
	"encoding/json"
	"strings"
	"sync/atomic"
	"time"

	"server-core/internal/config"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type MenusService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger

	totalAllCount atomic.Int64
}

func (s *MenusService) GetDefaultQueryLimit() int {
	return config.GetDefaultQueryLimit("MENU")
}

func (s *MenusService) GetMaxQueryLimit() int {
	return config.GetMaxQueryLimit("MENU")
}

func (s *MenusService) GetMaxBatchSaveLimit() int {
	return config.GetMaxBatchLimit("MENU")
}

func NewMenusService(db *sqlx.DB) *MenusService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.roles.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	svc := &MenusService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *MenusService) initTotalAllCounter() {
	var count int64
	if err := s.db.Get(&count, `SELECT COUNT(*) FROM "_ERPMenus"`); err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPMenus"`); err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *MenusService) GetTotalAll() int {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPMenus"`); err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return int(c)
		}
	}
	return int(val)
}

func (s *MenusService) PublishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPMenus",
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

func parseTimeSafe(val interface{}) (time.Time, bool) {
	if val == nil {
		return time.Time{}, false
	}
	switch v := val.(type) {
	case time.Time:
		return v, true
	case *time.Time:
		if v != nil {
			return *v, true
		}
		return time.Time{}, false
	case *string:
		if v == nil {
			return time.Time{}, false
		}
		return parseTimeSafe(*v)
	case string:
		str := strings.TrimSpace(v)
		if str == "" {
			return time.Time{}, false
		}
		layouts := []string{
			time.RFC3339Nano,
			time.RFC3339,
			"2006-01-02T15:04:05.999999999-07:00",
			"2006-01-02T15:04:05.999999-07:00",
			"2006-01-02T15:04:05.999-07:00",
			"2006-01-02T15:04:05.000Z07:00",
			"2006-01-02 15:04:05.999999-07",
			"2006-01-02 15:04:05.999999",
			"2006-01-02 15:04:05-07",
			"2006-01-02 15:04:05",
			"2006-01-02T15:04:05",
			"2006-01-02",
		}
		for _, layout := range layouts {
			if t, err := time.Parse(layout, str); err == nil {
				return t, true
			}
		}
	case float64:
		if v > 1000000000000 {
			return time.UnixMilli(int64(v)), true
		} else if v > 1000000000 {
			return time.Unix(int64(v), 0), true
		}
	case int64:
		if v > 1000000000000 {
			return time.UnixMilli(v), true
		} else if v > 1000000000 {
			return time.Unix(v, 0), true
		}
	case int:
		if v > 1000000000 {
			return time.Unix(int64(v), 0), true
		}
	}
	return time.Time{}, false
}
