package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api-gateway/config"
	"api-gateway/internal/caller"
	"api-gateway/internal/grpcclient"
	app_logger "api-gateway/internal/logger"
	"api-gateway/internal/middleware"
	"api-gateway/internal/worker"
	"api-gateway/routes"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	config.Load()

	logger, err := app_logger.Init()
	if err != nil {
		os.Exit(1)
	}
	defer logger.Sync()

	caller.SetLogger(logger)

	// ── Worker Pool (Regulator) ─────────────────────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wp := worker.NewPool(100, 10000, logger)
	wp.Start(ctx)
	defer wp.Stop()

	// ── gRPC Connection Pool ─────────────────────────────────────────────────
	pool := grpcclient.New(logger, wp)

	// Pre-connect to backend gRPC hosts at startup (warm-up)
	pool.WarmUp([]string{
		config.Cfg.HostGRPCUser,
		config.Cfg.HostGRPCDatahub,
	})

	// ── Gin Engine ───────────────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// Trust Nginx/Proxy on localhost to get correct ClientIP
	r.SetTrustedProxies([]string{"127.0.0.1"})

	// ── Security middleware (order matters!) ───────────────────────────────
	r.Use(middleware.Recovery(logger)) // 1. catch panics first
	r.Use(middleware.RequestID())    // 2. trace ID per request
	r.Use(middleware.SecurityHeaders()) // 3. security HTTP headers
	r.Use(middleware.CORS(config.Cfg.AllowedOrigins)) // 4. CORS preflight
	r.Use(middleware.AppSecurityMiddleware(logger))  // 5. Xác thực chữ ký HMAC chống Postman/cURL trái phép
	r.Use(middleware.AntiSpamMiddleware(logger))   // 6. Chống spam dồn dập & ngắt tải tự động
	r.Use(middleware.BotFilter(logger))        // 7. block scanners & bad bots
	r.Use(middleware.Logger(logger))         // 8. request logger

	// ── Routes ───────────────────────────────────────────────────────────────
	routes.Register(r, pool)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// ── Start server ─────────────────────────────────────────────────────────
	addr := fmt.Sprintf(":%d", config.Cfg.Port)
	logger.Info(" API Gateway (Go) starting",
		zap.String("addr", addr),
		zap.String("prefix", "/"+config.Cfg.Prefix),
	)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := r.Run(addr); err != nil {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("Shutting down API Gateway...")
	pool.Close()
	logger.Info(" API Gateway stopped cleanly.")
}
