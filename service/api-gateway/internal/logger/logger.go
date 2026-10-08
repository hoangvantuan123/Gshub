package logger

import (
	"api-gateway/config"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type dailyWriter struct {
	mu       sync.Mutex
	baseDir  string
	env      string
	service  string
	fileName string // Thêm trường tên file (vd: server.log, security.log)
	file     *os.File
	lastDay  string
}

func (w *dailyWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	now := time.Now()
	day := now.Format("2006/01/02")

	if day != w.lastDay {
		if w.file != nil {
			w.file.Close()
		}

		// Tạo thư mục log: baseDir / env / service / year / month / day
		logDir := filepath.Join(w.baseDir, w.env, w.service, now.Format("2006"), now.Format("01"), now.Format("02"))
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return 0, fmt.Errorf("failed to create log dir: %v", err)
		}

		logPath := filepath.Join(logDir, w.fileName) // Sử dụng tên file cấu hình
		f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return 0, fmt.Errorf("failed to open log file: %v", err)
		}

		w.file = f
		w.lastDay = day
	}

	return w.file.Write(p)
}

func (w *dailyWriter) Sync() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file != nil {
		return w.file.Sync()
	}
	return nil
}

func Init() (*zap.Logger, error) {
	// Writer cho log hệ thống thông thường
	serverWriter := &dailyWriter{
		baseDir:  config.Cfg.LogStorage,
		env:      config.Cfg.NodeEnv,
		service:  "api-gateway",
		fileName: "server.log",
	}

	// Writer cho log cảnh báo bảo mật (chỉ ghi Warn trở lên)
	securityWriter := &dailyWriter{
		baseDir:  config.Cfg.LogStorage,
		env:      config.Cfg.NodeEnv,
		service:  "api-gateway",
		fileName: "security.log",
	}

	// ── Bộ mã hóa (Encoder) ─────────────────────────────────────────────────
	ec := zap.NewProductionEncoderConfig()
	ec.TimeKey = "time"
	ec.EncodeTime = zapcore.ISO8601TimeEncoder

	fileEncoder := zapcore.NewJSONEncoder(ec)

	// Màu sắc cho console
	cc := ec
	cc.EncodeLevel = zapcore.CapitalColorLevelEncoder
	consoleEncoder := zapcore.NewConsoleEncoder(cc)

	// ── Cấu hình Core ───────────────────────────────────────────────────────
	// Định nghĩa các mức lọc
	highPriority := zap.LevelEnablerFunc(func(lvl zapcore.Level) bool {
		return lvl >= zapcore.WarnLevel
	})
	lowPriority := zap.LevelEnablerFunc(func(lvl zapcore.Level) bool {
		return lvl >= zapcore.InfoLevel
	})

	core := zapcore.NewTee(
		// Ghi mọi thứ vào server.log (Info+)
		zapcore.NewCore(fileEncoder, zapcore.AddSync(serverWriter), lowPriority),
		// CHỈ ghi Warn trở lên vào security.log
		zapcore.NewCore(fileEncoder, zapcore.AddSync(securityWriter), highPriority),
		// Xuất ra console (Info+)
		zapcore.NewCore(consoleEncoder, zapcore.AddSync(os.Stdout), zap.InfoLevel),
	)

	return zap.New(core), nil
}
