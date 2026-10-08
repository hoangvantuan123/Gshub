package role_user

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type RoleUsersService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger
}

func NewRoleUsersService(db *sqlx.DB) *RoleUsersService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.roles.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	return &RoleUsersService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}
}

type RoleUsersQueryOptions struct {
	Type    string
	GroupId int
	UserId  int
	Select  []string
}

func (s *RoleUsersService) publishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPRolesUsers",
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
