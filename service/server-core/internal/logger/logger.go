package logger

import (
	"fmt"
	"server-core/internal/config"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// dailyWriter handles daily log rotation
type dailyWriter struct {
	mu       sync.Mutex
	baseDir  string
	env      string
	service  string
	fileName string
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

		// Create log dir: baseDir / env / service / year / month / day
		logDir := filepath.Join(w.baseDir, w.env, w.service, now.Format("2006"), now.Format("01"), now.Format("02"))
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return 0, fmt.Errorf("failed to create log dir: %v", err)
		}

		logPath := filepath.Join(logDir, w.fileName)
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
	// 1. Setup encoder (JSON for file, Console for stdout)
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

	// 2. Setup output cores
	// Console core (for development)
	consoleEncoder := zapcore.NewConsoleEncoder(encoderConfig)
	consoleCore := zapcore.NewCore(consoleEncoder, zapcore.AddSync(os.Stdout), zap.InfoLevel)

	// File core (Daily rotation)
	fileWriter := &dailyWriter{
		baseDir:  config.Cfg.LogStorage,
		env:      config.Cfg.Env,
		service:  config.Cfg.ServiceName,
		fileName: "server.log",
	}
	fileEncoder := zapcore.NewJSONEncoder(encoderConfig)
	fileCore := zapcore.NewCore(fileEncoder, zapcore.AddSync(fileWriter), zap.InfoLevel)

	// 3. Combine cores
	core := zapcore.NewTee(consoleCore, fileCore)

	// 4. Create logger with caller and stacktrace
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	return logger, nil
}


