package worker

import (
	"context"
	"time"

	"go.uber.org/zap"
)

// DemoJob là một Job giả lập tác vụ xử lý Big Data (ví dụ: gửi email, import Excel, xử lý ảnh)
type DemoJob struct {
	JobID int
	Log   *zap.Logger
}

// Execute là hàm bắt buộc phải có để thỏa mãn interface Job
func (j *DemoJob) Execute(ctx context.Context) error {
	// Giả lập thời gian CPU phải xử lý tác vụ nặng (100 milliseconds)
	time.Sleep(50 * time.Millisecond)
	
	// In ra log để chứng minh Job đã được một Worker nào đó hoàn thành
	j.Log.Info("Đã xử lý xong tác vụ nặng", zap.Int("job_id", j.JobID))
	return nil
}

// RunStressTest giả lập việc nhồi 1000 tác vụ vào hệ thống cùng lúc
func RunStressTest(pool *Pool, log *zap.Logger) {
	log.Info("BẮT ĐẦU BÀI TEST CHỊU TẢI: Bơm 1000 Jobs vào hàng đợi Worker Pool...")
	
	// Bơm 1000 jobs vào Queue (Rất nhanh, không block luồng chính)
	for i := 1; i <= 10000; i++ {
		job := &DemoJob{
			JobID: i,
			Log:   log,
		}
		pool.Submit(job)
	}

	log.Info("Đã ném xong 1000 Jobs vào hàng đợi! Các Worker đang chạy ngầm để xử lý...")
}
