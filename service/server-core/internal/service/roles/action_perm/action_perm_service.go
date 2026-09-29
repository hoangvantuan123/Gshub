package action_perm

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type ActionLevelPermsService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger
}

func NewActionLevelPermsService(db *sqlx.DB) *ActionLevelPermsService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.auth.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	return &ActionLevelPermsService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}
}

type ActionGroupPermsQueryOptions struct {
	Ids        []int    `json:"ids"`
	Name       string   `json:"name"`
	ScreenName string   `json:"screen_name"`
	Select     []string `json:"select"`
	OrderBy    string   `json:"order_by"`
	Limit      int      `json:"limit"`
	Offset     int      `json:"offset"`
}

func (s *ActionLevelPermsService) publishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPGroupActionPerms",
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
