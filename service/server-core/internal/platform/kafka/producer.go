package kafka

import (
	"context"
	"time"

	kafkago "github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Producer struct {
	writer *kafkago.Writer
	log    *zap.Logger
}

func NewProducer(brokers []string, log *zap.Logger) *Producer {
	writer := &kafkago.Writer{
		Addr:         kafkago.TCP(brokers...),
		Balancer:     &kafkago.LeastBytes{},
		RequiredAcks: kafkago.RequireOne,
		Async:        true,
	}
	return &Producer{
		writer: writer,
		log:    log,
	}
}

func (p *Producer) Publish(ctx context.Context, topic string, key string, value []byte) error {
	msg := kafkago.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: value,
		Time:  time.Now().UTC(),
	}

	err := p.writer.WriteMessages(ctx, msg)
	if err != nil {
		if p.log != nil {
			p.log.Error("Kafka publish message failed", zap.Error(err), zap.String("topic", topic), zap.String("key", key))
		}
		return err
	}

	if p.log != nil {
		p.log.Info("Successfully pushed task to Kafka", zap.String("topic", topic), zap.String("key", key))
	}
	return nil
}

func (p *Producer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}
