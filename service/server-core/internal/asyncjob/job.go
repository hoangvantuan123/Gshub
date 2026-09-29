package asyncjob

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// JobStatus định nghĩa các trạng thái của tác vụ
type JobStatus string

const (
	StatusPending    JobStatus = "PENDING"
	StatusProcessing JobStatus = "PROCESSING"
	StatusSuccess    JobStatus = "SUCCESS"
	StatusFailed     JobStatus = "FAILED"
)

// SenderInfo thông tin máy khách gửi yêu cầu
type SenderInfo struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name,omitempty"`
	ClientIP string `json:"client_ip,omitempty"`
	DeviceID string `json:"device_id,omitempty"`
}

// ResultSummary tổng kết kết quả xử lý
type ResultSummary struct {
	TotalProcessed  int64         `json:"total_processed"`
	SuccessCount    int64         `json:"success_count"`
	FailedCount     int64         `json:"failed_count"`
	WarningCount    int64         `json:"warning_count"`
	ExecutionTimeMs int64         `json:"execution_time_ms"`
	ErrorLogs       []interface{} `json:"error_logs,omitempty"`
}

// Artifacts file đính kèm hoặc kết quả tải xuống nếu có
type Artifacts struct {
	DownloadURL   string `json:"download_url,omitempty"`
	FileName      string `json:"file_name,omitempty"`
	FileSizeBytes int64  `json:"file_size_bytes,omitempty"`
}

// UniversalJobPayload payload chi tiết theo quy chuẩn hệ thống
type UniversalJobPayload struct {
	JobID            string        `json:"job_id"`
	JobType          string        `json:"job_type"`
	JobName          string        `json:"job_name"`
	Module           string        `json:"module"`
	Status           JobStatus     `json:"status"`
	Progress         int           `json:"progress"` // 0 -> 100
	CurrentStep      string        `json:"current_step"`
	TotalSteps       int           `json:"total_steps"`
	CurrentStepIndex int           `json:"current_step_index"`
	ResultSummary    ResultSummary `json:"result_summary"`
	Artifacts        *Artifacts    `json:"artifacts,omitempty"`
	SenderInfo       SenderInfo    `json:"sender_info"`
	CreatedAt        time.Time     `json:"created_at"`
	CompletedAt      *time.Time    `json:"completed_at,omitempty"`
}

// UniversalJobEvent Event chuẩn bắn qua Kafka và gRPC Stream về Electron
type UniversalJobEvent struct {
	Topic   string              `json:"topic"`
	Channel string              `json:"channel"`
	UserID  string              `json:"user_id"`
	Payload UniversalJobPayload `json:"payload"`
}

// KafkaEventPublisher interface cho việc publish event vào Kafka
type KafkaEventPublisher interface {
	Publish(ctx context.Context, topic string, key string, value []byte) error
}

// JobContext quản lý vòng đời và cập nhật tiến độ của 1 Job
type JobContext struct {
	ctx       context.Context
	publisher KafkaEventPublisher
	logger    *zap.Logger
	channel   string
	startTime time.Time
	Payload   UniversalJobPayload
}

// NewJob khởi tạo 1 Job mới với ID duy nhất
func NewJob(
	ctx context.Context,
	publisher KafkaEventPublisher,
	logger *zap.Logger,
	jobType, jobName, module, channel, userID string,
	totalSteps int,
) *JobContext {
	jobID := fmt.Sprintf("JOB_%s_%s", jobType, uuid.New().String()[:8])
	now := time.Now().UTC()

	return &JobContext{
		ctx:       ctx,
		publisher: publisher,
		logger:    logger,
		channel:   channel,
		startTime: now,
		Payload: UniversalJobPayload{
			JobID:            jobID,
			JobType:          jobType,
			JobName:          jobName,
			Module:           module,
			Status:           StatusPending,
			Progress:         0,
			CurrentStep:      "Đã tiếp nhận vào hàng đợi",
			TotalSteps:       totalSteps,
			CurrentStepIndex: 0,
			SenderInfo: SenderInfo{
				UserID: userID,
			},
			CreatedAt: now,
		},
	}
}

// UpdateProgress cập nhật tiến độ và tự động bắn event qua Kafka
func (j *JobContext) UpdateProgress(stepIndex int, stepName string, percent int) {
	j.Payload.Status = StatusProcessing
	j.Payload.CurrentStepIndex = stepIndex
	j.Payload.CurrentStep = stepName
	j.Payload.Progress = percent
	j.emit("JOB_PROGRESS")
}

// Complete đánh dấu hoàn thành tác vụ
func (j *JobContext) Complete(summary ResultSummary, artifacts *Artifacts, successMsg string) {
	now := time.Now().UTC()
	j.Payload.Status = StatusSuccess
	j.Payload.Progress = 100
	j.Payload.CurrentStep = successMsg
	j.Payload.CompletedAt = &now
	summary.ExecutionTimeMs = time.Since(j.startTime).Milliseconds()
	j.Payload.ResultSummary = summary
	j.Payload.Artifacts = artifacts
	j.emit("JOB_COMPLETED")
}

// Fail đánh dấu thất bại
func (j *JobContext) Fail(errMsg string, errLogs []interface{}) {
	now := time.Now().UTC()
	j.Payload.Status = StatusFailed
	j.Payload.CurrentStep = "Thất bại: " + errMsg
	j.Payload.CompletedAt = &now
	j.Payload.ResultSummary.ExecutionTimeMs = time.Since(j.startTime).Milliseconds()
	j.Payload.ResultSummary.ErrorLogs = errLogs
	j.emit("JOB_FAILED")
}

func (j *JobContext) emit(topic string) {
	event := UniversalJobEvent{
		Topic:   topic,
		Channel: j.channel,
		UserID:  j.Payload.SenderInfo.UserID,
		Payload: j.Payload,
	}

	data, err := json.Marshal(event)
	if err != nil {
		if j.logger != nil {
			j.logger.Error("Failed to marshal UniversalJobEvent", zap.Error(err))
		}
		return
	}

	if j.publisher != nil {
		_ = j.publisher.Publish(j.ctx, "erp.realtime.events", j.Payload.JobID, data)
	}
}
