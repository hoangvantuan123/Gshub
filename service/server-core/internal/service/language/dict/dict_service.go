package dict

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type DictService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger
}

func NewDictService(db *sqlx.DB) *DictService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.language.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	return &DictService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}
}

type DictQueryOptions struct {
	LanguageSeq int
	WordSeq     int
	Word        string
	KeyItem     string
	KeyItem1    string
	KeyItem2    string
	KeyItem3    string
	OrderBy     string
	Limit       int
	Offset      int
}

func (s *DictService) publishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPDictionary",
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
