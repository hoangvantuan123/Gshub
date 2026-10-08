package user

import (
	"context"
	"encoding/json"
	"sync/atomic"
	"time"

	sysDomain "server-core/internal/models/system"
	"server-core/internal/service/system"

	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type UserAuthService struct {
	db          *sqlx.DB
	kafkaWriter *kafka.Writer
	log         *zap.Logger
	auditSvc    *system.AuditLogService

	// High-Concurrency Lock-Free Atomic Counter cho TotalAll (0% DB Load)
	totalAllCount atomic.Int64
}

func NewUserAuthService(db *sqlx.DB) *UserAuthService {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "erp.auth.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	logger, _ := zap.NewDevelopment()

	svc := &UserAuthService{
		db:          db,
		kafkaWriter: writer,
		log:         logger,
	}

	go svc.initTotalAllCounter()

	return svc
}

func (s *UserAuthService) initTotalAllCounter() {
	var count int64
	if err := s.db.Get(&count, `SELECT COUNT(*) FROM "_ERPUsers"`); err == nil {
		s.totalAllCount.Store(count)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			var c int64
			if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPUsers"`); err == nil {
				s.totalAllCount.Store(c)
			}
		}
	}()
}

func (s *UserAuthService) GetTotalAll() int {
	val := s.totalAllCount.Load()
	if val <= 0 {
		var c int64
		if err := s.db.Get(&c, `SELECT COUNT(*) FROM "_ERPUsers"`); err == nil && c > 0 {
			s.totalAllCount.Store(c)
			return int(c)
		}
	}
	return int(val)
}

func (s *UserAuthService) SetAuditLogService(auditSvc *system.AuditLogService) {
	s.auditSvc = auditSvc
}

func (s *UserAuthService) logBatchDataChange(ctx context.Context, apiMethod, tableName string, rows []sysDomain.RowChangeItem, totalRecords, successCount, failedCount int, status string) {
	if s.auditSvc == nil {
		return
	}

	userSeq, _ := ctx.Value("user_seq").(string)
	userLogin, _ := ctx.Value("user_id").(string)
	clientIp, _ := ctx.Value("client_ip").(string)
	devWeb, _ := ctx.Value("device_info_web").(string)
	devSoft, _ := ctx.Value("device_info_soft").(string)
	devApp, _ := ctx.Value("device_info_app").(string)
	platform, _ := ctx.Value("platform_status").(string)

	job := sysDomain.DataChangeBatchJob{
		Master: sysDomain.SysDataChangeLog{
			ApiMethod:      apiMethod,
			TableName:      tableName,
			TotalRecords:   totalRecords,
			SuccessCount:   successCount,
			FailedCount:    failedCount,
			OverallStatus:  status,
			UserSeq:        userSeq,
			UserLogin:      userLogin,
			ClientIp:       clientIp,
			DeviceInfoWeb:  devWeb,
			DeviceInfoSoft: devSoft,
			DeviceInfoApp:  devApp,
			PlatformStatus: platform,
			CreatedAt:      time.Now(),
		},
		Rows: rows,
	}

	s.auditSvc.WriteDataChangeLog(job)
}

func (s *UserAuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

func (s *UserAuthService) publishKafkaEvent(eventType string, payload interface{}) {
	if s.kafkaWriter == nil {
		return
	}

	eventData := map[string]interface{}{
		"event":     eventType,
		"table":     "_ERPUsers",
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
