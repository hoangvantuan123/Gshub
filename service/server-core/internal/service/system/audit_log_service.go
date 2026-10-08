package system

import (
	"context"
	"encoding/json"
	"fmt"
	"server-core/internal/config"
	domain "server-core/internal/models/system"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/compress"
	"go.uber.org/zap"
)

var (
	// Global channel for API audit logs with high buffer
	logChannel = make(chan domain.ERPSysFullAuditLog, 50000)

	// Global channel for Data Change (Row/Field) batch logs with high buffer
	dataChangeChannel = make(chan domain.DataChangeBatchJob, 50000)

	spilloverFilePath = filepath.Join("tmp", "data_change_spillover.ndjson")
	spilloverMutex    sync.Mutex
)

type AuditLogService struct {
	dbLogs          *sqlx.DB
	log             *zap.Logger
	kafkaApiWriter  *kafka.Writer
	kafkaDataWriter *kafka.Writer
	kafkaLoginWriter *kafka.Writer
}

func NewAuditLogService(dbLogs *sqlx.DB, log *zap.Logger) *AuditLogService {
	brokers := strings.Split(config.Cfg.KafkaBrokers, ",")
	for i := range brokers {
		brokers[i] = strings.TrimSpace(brokers[i])
	}

	createWriter := func(topic string) *kafka.Writer {
		return &kafka.Writer{
			Addr:                   kafka.TCP(brokers...),
			Topic:                  topic,
			Balancer:               &kafka.LeastBytes{},
			RequiredAcks:           kafka.RequireOne,
			Async:                  true,
			Compression:            compress.Lz4,
			BatchSize:              500,
			BatchTimeout:           10 * time.Millisecond,
			AllowAutoTopicCreation: true,
		}
	}

	s := &AuditLogService{
		dbLogs:           dbLogs,
		log:              log,
		kafkaApiWriter:   createWriter(config.Cfg.KafkaTopicApi),
		kafkaDataWriter:  createWriter(config.Cfg.KafkaTopicData),
		kafkaLoginWriter: createWriter(config.Cfg.KafkaTopicLogin),
	}

	// Auto-migrate log tables on startup
	s.ensureTablesExist()

	// Start high-throughput micro-batching background workers
	go s.startApiLogBatchWorker(10, 200, 100*time.Millisecond)
	go s.startDataChangeBatchWorker(10)
	go s.startSpilloverDrainWorker()

	if s.log != nil {
		s.log.Info("[AUDIT LOG ENGINE] High-Concurrency Multi-Tier Kafka Engine active",
			zap.String("kafka_brokers", config.Cfg.KafkaBrokers),
			zap.String("topic_api", config.Cfg.KafkaTopicApi),
			zap.String("topic_data", config.Cfg.KafkaTopicData),
			zap.Int("api_channel_cap", 50000),
			zap.Int("data_channel_cap", 50000),
			zap.String("log_db_target", "ERPSYSLOG (PostgreSQL)"),
		)
	}

	return s
}

func (s *AuditLogService) ensureTablesExist() {
	if s.dbLogs == nil {
		return
	}

	schemaSQL := `
	CREATE TABLE IF NOT EXISTS "_SysDataChangeLog" (
		"IdSeq"            VARCHAR(36) PRIMARY KEY,
		"ApiMethod"        VARCHAR(100) NOT NULL,
		"TableName"        VARCHAR(100) NOT NULL,
		"TotalRecords"     INTEGER DEFAULT 0,
		"SuccessCount"     INTEGER DEFAULT 0,
		"FailedCount"      INTEGER DEFAULT 0,
		"OverallStatus"    VARCHAR(20),
		"UserSeq"          VARCHAR(36),
		"UserLogin"        VARCHAR(100),
		"ClientIp"         VARCHAR(50),
		"DeviceInfoWeb"    TEXT,
		"DeviceInfoSoft"   TEXT,
		"DeviceInfoApp"    TEXT,
		"PlatformStatus"   VARCHAR(50),
		"TraceId"          VARCHAR(36),
		"CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS "idx_datachange_createdat" ON "_SysDataChangeLog" ("CreatedAt" DESC);

	CREATE TABLE IF NOT EXISTS "_SysDataChangeRowLog" (
		"IdSeq"            VARCHAR(36) PRIMARY KEY,
		"ChangeLogSeq"     VARCHAR(36) NOT NULL,
		"TableName"        VARCHAR(100) NOT NULL,
		"RecordId"         VARCHAR(100) NOT NULL,
		"RowIdx"           INTEGER,
		"ActionType"       VARCHAR(10)  NOT NULL,
		"Status"           VARCHAR(20)  NOT NULL,
		"ErrorCode"        VARCHAR(50),
		"ErrorMsg"         TEXT,
		"SubmittedData"    TEXT,
		"CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS "idx_rowlog_table_record" ON "_SysDataChangeRowLog" ("TableName", "RecordId", "CreatedAt" DESC);
	CREATE INDEX IF NOT EXISTS "idx_rowlog_changelogseq" ON "_SysDataChangeRowLog" ("ChangeLogSeq");

	CREATE TABLE IF NOT EXISTS "_SysDataChangeDetail" (
		"IdSeq"        VARCHAR(36) PRIMARY KEY,
		"RowLogSeq"    VARCHAR(36) NOT NULL,
		"FieldName"    VARCHAR(100) NOT NULL,
		"OldValue"     TEXT,
		"NewValue"     TEXT,
		"CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS "idx_detail_rowlogseq" ON "_SysDataChangeDetail" ("RowLogSeq");
	`

	_, err := s.dbLogs.Exec(schemaSQL)
	if err != nil && s.log != nil {
		s.log.Warn("Could not auto-create DataChangeLog schema (table may already exist or read-only DB)", zap.Error(err))
	}
}

func (s *AuditLogService) Logger() *zap.Logger {
	return s.log
}

// WriteLog sends an API audit log entry to Kafka and async ring buffer (< 0.01ms non-blocking)
func (s *AuditLogService) WriteLog(entry domain.ERPSysFullAuditLog) {
	if entry.IdSeq == "" {
		entry.IdSeq = uuid.Must(uuid.NewV7()).String()
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}
	if entry.ModuleName == "" {
		entry.ModuleName = "server-core"
	}

	// 1. Publish Event sang Kafka Topic "erp.audit.api" (Async Non-blocking)
	if s.kafkaApiWriter != nil {
		if payloadBytes, err := json.Marshal(entry); err == nil {
			go func(key string, payload []byte) {
				_ = s.kafkaApiWriter.WriteMessages(context.Background(), kafka.Message{
					Key:   []byte(key),
					Value: payload,
				})
			}(entry.MethodName, payloadBytes)
		}
	}

	// 2. Push to local RAM RingBuffer for Batch DB insertion
	select {
	case logChannel <- entry:
	default:
		// Drop silently or alert to avoid blocking main business RPC thread
		if s.log != nil {
			s.log.Warn("Audit log channel is full (50,000 items), shedding load to prevent API latency")
		}
	}
}

// WriteDataChangeLog sends a batch data change job to Kafka and asynchronous worker pool (< 0.01ms non-blocking)
func (s *AuditLogService) WriteDataChangeLog(job domain.DataChangeBatchJob) {
	now := time.Now()
	if job.Master.IdSeq == "" {
		job.Master.IdSeq = uuid.Must(uuid.NewV7()).String()
	}
	if job.Master.CreatedAt.IsZero() {
		job.Master.CreatedAt = now
	}

	for i := range job.Rows {
		if job.Rows[i].RowLog.IdSeq == "" {
			job.Rows[i].RowLog.IdSeq = uuid.Must(uuid.NewV7()).String()
		}
		job.Rows[i].RowLog.ChangeLogSeq = job.Master.IdSeq
		if job.Rows[i].RowLog.TableName == "" {
			job.Rows[i].RowLog.TableName = job.Master.TableName
		}
		if job.Rows[i].RowLog.CreatedAt.IsZero() {
			job.Rows[i].RowLog.CreatedAt = now
		}

		for j := range job.Rows[i].Details {
			if job.Rows[i].Details[j].IdSeq == "" {
				job.Rows[i].Details[j].IdSeq = uuid.Must(uuid.NewV7()).String()
			}
			job.Rows[i].Details[j].RowLogSeq = job.Rows[i].RowLog.IdSeq
			if job.Rows[i].Details[j].CreatedAt.IsZero() {
				job.Rows[i].Details[j].CreatedAt = now
			}
		}
	}

	// 1. Publish Event sang Kafka Topic "erp.audit.datachange" (Async Non-blocking < 0.05ms)
	if s.kafkaDataWriter != nil {
		if payloadBytes, err := json.Marshal(job); err == nil {
			go func(key string, payload []byte) {
				_ = s.kafkaDataWriter.WriteMessages(context.Background(), kafka.Message{
					Key:   []byte(key),
					Value: payload,
				})
			}(job.Master.TableName, payloadBytes)
		}
	}

	// 2. Push non-blocking to RAM channel. If queue is full (>50,000 jobs), spillover to disk file
	select {
	case dataChangeChannel <- job:
	default:
		if s.log != nil {
			s.log.Warn("Data change log queue is full, spilling over to disk storage")
		}
		s.spilloverToDisk(job)
	}
}

func (s *AuditLogService) spilloverToDisk(job domain.DataChangeBatchJob) {
	spilloverMutex.Lock()
	defer spilloverMutex.Unlock()

	_ = os.MkdirAll("tmp", 0755)
	f, err := os.OpenFile(spilloverFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()

	data, err := json.Marshal(job)
	if err == nil {
		_, _ = f.Write(append(data, '\n'))
	}
}

// startApiLogBatchWorker gom nhóm logs (micro-batching) trước khi insert DB để giảm 90% DB load
func (s *AuditLogService) startApiLogBatchWorker(workerCount int, batchSize int, flushInterval time.Duration) {
	for i := 0; i < workerCount; i++ {
		go func(workerID int) {
			batch := make([]domain.ERPSysFullAuditLog, 0, batchSize)
			ticker := time.NewTicker(flushInterval)
			defer ticker.Stop()

			flush := func() {
				if len(batch) == 0 {
					return
				}
				s.insertLogBatch(batch)
				batch = make([]domain.ERPSysFullAuditLog, 0, batchSize)
			}

			for {
				select {
				case entry, ok := <-logChannel:
					if !ok {
						flush()
						return
					}
					batch = append(batch, entry)
					if len(batch) >= batchSize {
						flush()
					}
				case <-ticker.C:
					flush()
				}
			}
		}(i)
	}
}

func (s *AuditLogService) insertLogBatch(entries []domain.ERPSysFullAuditLog) {
	if s.dbLogs == nil || len(entries) == 0 {
		return
	}

	query := `INSERT INTO "_SysFullAuditLog" (
		"IdSeq", "ModuleName", "ServiceName", "MethodName", "ActionType",
		"UrlPath", "RequestData", "ResponseData", "StatusCode", "StatusMsg",
		"DurationMs", "UserSeq", "UserLogin", "ClientIp", "Token", "CreatedAt"
	) VALUES (
		:IdSeq, :ModuleName, :ServiceName, :MethodName, :ActionType,
		:UrlPath, :RequestData, :ResponseData, :StatusCode, :StatusMsg,
		:DurationMs, :UserSeq, :UserLogin, :ClientIp, :Token, :CreatedAt
	)`

	_, err := s.dbLogs.NamedExecContext(context.Background(), query, entries)
	if err != nil && s.log != nil {
		s.log.Error("Failed to bulk insert audit logs to DB", zap.Error(err), zap.Int("batch_size", len(entries)))
	}
}

func (s *AuditLogService) startDataChangeBatchWorker(workerCount int) {
	for i := 0; i < workerCount; i++ {
		go func(workerID int) {
			for job := range dataChangeChannel {
				s.insertDataChangeJob(job)
			}
		}(i)
	}
}

func (s *AuditLogService) insertDataChangeJob(job domain.DataChangeBatchJob) {
	if s.dbLogs == nil {
		return
	}

	ctx := context.Background()

	// 1. Insert Master Record
	masterQuery := `INSERT INTO "_SysDataChangeLog" (
		"IdSeq", "ApiMethod", "TableName", "TotalRecords", "SuccessCount", "FailedCount",
		"OverallStatus", "UserSeq", "UserLogin", "ClientIp", "DeviceInfoWeb", "DeviceInfoSoft",
		"DeviceInfoApp", "PlatformStatus", "TraceId", "CreatedAt"
	) VALUES (
		:IdSeq, :ApiMethod, :TableName, :TotalRecords, :SuccessCount, :FailedCount,
		:OverallStatus, :UserSeq, :UserLogin, :ClientIp, :DeviceInfoWeb, :DeviceInfoSoft,
		:DeviceInfoApp, :PlatformStatus, :TraceId, :CreatedAt
	)`

	_, err := s.dbLogs.NamedExecContext(ctx, masterQuery, job.Master)
	if err != nil {
		if s.log != nil {
			s.log.Error("Failed to insert _SysDataChangeLog master", zap.Error(err))
		}
		s.spilloverToDisk(job)
		return
	}

	if len(job.Rows) == 0 {
		return
	}

	// 2. Insert Row Logs
	rowQuery := `INSERT INTO "_SysDataChangeRowLog" (
		"IdSeq", "ChangeLogSeq", "TableName", "RecordId", "RowIdx", "ActionType",
		"Status", "ErrorCode", "ErrorMsg", "SubmittedData", "CreatedAt"
	) VALUES (
		:IdSeq, :ChangeLogSeq, :TableName, :RecordId, :RowIdx, :ActionType,
		:Status, :ErrorCode, :ErrorMsg, :SubmittedData, :CreatedAt
	)`

	rowLogs := make([]domain.SysDataChangeRowLog, 0, len(job.Rows))
	allDetails := make([]domain.SysDataChangeDetail, 0)

	for _, r := range job.Rows {
		rowLogs = append(rowLogs, r.RowLog)
		allDetails = append(allDetails, r.Details...)
	}

	_, err = s.dbLogs.NamedExecContext(ctx, rowQuery, rowLogs)
	if err != nil && s.log != nil {
		s.log.Error("Failed to insert _SysDataChangeRowLog batch", zap.Error(err))
	}

	// 3. Insert Field Diff Details
	if len(allDetails) > 0 {
		detailQuery := `INSERT INTO "_SysDataChangeDetail" (
			"IdSeq", "RowLogSeq", "FieldName", "OldValue", "NewValue", "CreatedAt"
		) VALUES (
			:IdSeq, :RowLogSeq, :FieldName, :OldValue, :NewValue, :CreatedAt
		)`
		_, err = s.dbLogs.NamedExecContext(ctx, detailQuery, allDetails)
		if err != nil && s.log != nil {
			s.log.Error("Failed to insert _SysDataChangeDetail batch", zap.Error(err))
		}
	}
}

// startSpilloverDrainWorker periodically drains temporary spillover disk logs into DB when healthy
func (s *AuditLogService) startSpilloverDrainWorker() {
	ticker := time.NewTicker(30 * time.Second)
	for range ticker.C {
		if _, err := os.Stat(spilloverFilePath); os.IsNotExist(err) {
			continue
		}

		spilloverMutex.Lock()
		content, err := os.ReadFile(spilloverFilePath)
		if err != nil || len(content) == 0 {
			_ = os.Remove(spilloverFilePath)
			spilloverMutex.Unlock()
			continue
		}

		_ = os.Remove(spilloverFilePath)
		spilloverMutex.Unlock()

		lines := splitLines(content)
		for _, line := range lines {
			if len(line) == 0 {
				continue
			}
			var job domain.DataChangeBatchJob
			if err := json.Unmarshal(line, &job); err == nil {
				s.insertDataChangeJob(job)
			}
		}
	}
}

func splitLines(data []byte) [][]byte {
	var lines [][]byte
	start := 0
	for i, b := range data {
		if b == '\n' {
			if i > start {
				lines = append(lines, data[start:i])
			}
			start = i + 1
		}
	}
	if start < len(data) {
		lines = append(lines, data[start:])
	}
	return lines
}

// GetDataChangeLogs queries historical audit log for a single specific record (RecordId) in a Table
func (s *AuditLogService) GetDataChangeLogs(ctx context.Context, tableName, recordId string) ([]domain.RowHistoryRecord, error) {
	if s.dbLogs == nil {
		return nil, fmt.Errorf("logs database is not connected")
	}

	query := `
	SELECT 
		r."IdSeq" AS "RowLogId",
		r."TableName",
		r."RecordId",
		r."ActionType",
		r."Status",
		COALESCE(r."ErrorCode", '') AS "ErrorCode",
		COALESCE(r."ErrorMsg", '') AS "ErrorMsg",
		COALESCE(r."SubmittedData", '') AS "SubmittedData",
		COALESCE(c."ApiMethod", '') AS "ApiMethod",
		COALESCE(c."UserLogin", '') AS "UserLogin",
		COALESCE(c."ClientIp", '') AS "ClientIp",
		COALESCE(c."DeviceInfoWeb", '') AS "DeviceInfoWeb",
		COALESCE(c."DeviceInfoSoft", '') AS "DeviceInfoSoft",
		COALESCE(c."DeviceInfoApp", '') AS "DeviceInfoApp",
		COALESCE(c."PlatformStatus", '') AS "PlatformStatus",
		r."CreatedAt"
	FROM "_SysDataChangeRowLog" r
	JOIN "_SysDataChangeLog" c ON r."ChangeLogSeq" = c."IdSeq"
	WHERE r."TableName" = $1 AND r."RecordId" = $2
	ORDER BY r."CreatedAt" DESC
	LIMIT 100
	`

	var history []domain.RowHistoryRecord
	err := s.dbLogs.SelectContext(ctx, &history, query, tableName, recordId)
	if err != nil {
		return nil, err
	}

	if len(history) == 0 {
		return history, nil
	}

	// Fetch field diffs for each row log item
	rowIds := make([]string, len(history))
	for i, h := range history {
		rowIds[i] = h.RowLogId
	}

	detailQuery, args, err := sqlx.In(`
		SELECT "IdSeq", "RowLogSeq", "FieldName", COALESCE("OldValue", '') AS "OldValue", COALESCE("NewValue", '') AS "NewValue", "CreatedAt"
		FROM "_SysDataChangeDetail"
		WHERE "RowLogSeq" IN (?)
		ORDER BY "CreatedAt" ASC
	`, rowIds)

	if err == nil {
		detailQuery = s.dbLogs.Rebind(detailQuery)
		var details []domain.SysDataChangeDetail
		if err := s.dbLogs.SelectContext(ctx, &details, detailQuery, args...); err == nil {
			detailMap := make(map[string][]domain.SysDataChangeDetail)
			for _, d := range details {
				detailMap[d.RowLogSeq] = append(detailMap[d.RowLogSeq], d)
			}
			for i := range history {
				if diffs, ok := detailMap[history[i].RowLogId]; ok {
					history[i].FieldDiffs = diffs
				}
			}
		}
	}

	return history, nil
}
