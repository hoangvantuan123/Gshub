package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"service-datahub/config"
	"service-datahub/database"
	"service-datahub/handlers"
	"service-datahub/routes"
	"service-datahub/services"

	"go.uber.org/zap"
)

func main() {
	// 1. Initialize Structured Logger
	var logger *zap.Logger
	var err error
	if os.Getenv("APP_ENV") == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("Starting SysCore DataHub Service...")

	// 2. Load Configurations
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// 3. Initialize PostgreSQL DATAHUB Database
	db, err := database.InitDB(cfg, logger)
	if err != nil {
		logger.Fatal("Database initialization failed", zap.Error(err))
	}

	// 4. Initialize Services
	configService := services.NewConfigService(cfg, db, logger)
	loginService := services.NewLoginService(db, configService, logger)

	// 5. Initialize Handlers
	loginHandler := handlers.NewLoginHandler(loginService, logger)
	configHandler := handlers.NewConfigHandler(configService, logger)
	healthHandler := handlers.NewHealthHandler(db)

	// 6. Setup Router
	router := routes.SetupRouter(loginHandler, configHandler, healthHandler, logger)

	// 7. Setup HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Server.Port)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 8. Run Server in Background Goroutine
	go func() {
		logger.Info(fmt.Sprintf("DataHub Server listening on http://localhost%s", serverAddr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server listen failed", zap.Error(err))
		}
	}()

	// 9. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down DataHub Server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("DataHub Server exited cleanly")
}
