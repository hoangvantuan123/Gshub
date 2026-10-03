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
	"service-datahub/grpcserver"
	"service-datahub/handlers"
	"service-datahub/routes"
	"service-datahub/services"
	"service-datahub/services/report/plan_detail"
	"service-datahub/services/report/plan_master"
	"service-datahub/services/report/plan_report"
	"service-datahub/services/report/prod_stats_detail"

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

	logger.Info("Starting SysCore DataHub High-Performance Service (REST + Protobuf/gRPC)...")

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
	authService := services.NewAuthService(db, cfg, logger)
	configService := services.NewConfigService(cfg, db, logger)
	loginService := services.NewLoginService(db, configService, logger)
	workProcessService := services.NewWorkProcessService(cfg, db, configService, loginService, logger)
	orderSettlementService := services.NewOrderSettlementService(cfg, configService, loginService, workProcessService, logger)
	factoryService := services.NewFactoryService(cfg, db, configService, loginService, logger)

	// Báo cáo Master & Detail Services (KHSX & TKSX tách biệt từng thư mục A/U/D/Q)
	planMasterService := plan_master.NewPlanMasterService(db, logger)
	planDetailService := plan_detail.NewPlanDetailService(db, logger)
	planReportService := plan_report.NewPlanReportService(db, logger)
	prodStatsDetailService := prod_stats_detail.NewProdStatsDetailService(db, logger)

	// 5. Initialize Handlers for REST
	authHandler := handlers.NewAuthHandler(authService, logger)
	loginHandler := handlers.NewLoginHandler(loginService, logger)
	configHandler := handlers.NewConfigHandler(configService, logger)
	workProcessHandler := handlers.NewWorkProcessHandler(workProcessService, logger)
	orderSettlementHandler := handlers.NewOrderSettlementHandler(orderSettlementService, logger)
	factoryHandler := handlers.NewFactoryHandler(factoryService, logger)

	planMasterHandler := handlers.NewPlanMasterHandler(planMasterService, planDetailService, prodStatsDetailService, db, logger)
	planDetailHandler := handlers.NewPlanDetailHandler(planDetailService, logger)
	planReportHandler := handlers.NewPlanReportHandler(planReportService, logger)
	prodStatsDetailHandler := handlers.NewProdStatsDetailHandler(prodStatsDetailService, logger)
	healthHandler := handlers.NewHealthHandler(db)

	// 6. Setup HTTP REST Router
	router := routes.SetupRouter(
		cfg,
		authHandler,
		loginHandler,
		configHandler,
		workProcessHandler,
		orderSettlementHandler,
		factoryHandler,
		planMasterHandler,
		planDetailHandler,
		prodStatsDetailHandler,
		planReportHandler,
		healthHandler,
		logger,
	)

	// 7. Setup HTTP REST Server
	httpAddr := fmt.Sprintf(":%s", cfg.Server.Port)
	httpSrv := &http.Server{
		Addr:         httpAddr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 8. Launch HTTP Server in Goroutine
	go func() {
		logger.Info(fmt.Sprintf("🚀 [REST Engine] DataHub HTTP listening on http://localhost%s", httpAddr))
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server listen failed", zap.Error(err))
		}
	}()

	// 9. Launch High-Speed Protobuf gRPC Server in Goroutine
	grpcServer, grpcLis, err := grpcserver.RunGRPCServer(
		cfg.Server.GRPCPort,
		db,
		loginService,
		configService,
		workProcessService,
		factoryService,
		logger,
	)
	if err != nil {
		logger.Fatal("Failed to bind gRPC server listener", zap.Error(err))
	}

	go func() {
		logger.Info(fmt.Sprintf("⚡ [Protobuf Engine] DataHub gRPC Server listening on port :%s (Multiplexed Binary Wire)", cfg.Server.GRPCPort))
		if err := grpcServer.Serve(grpcLis); err != nil {
			logger.Error("gRPC server stopped unexpectedly", zap.Error(err))
		}
	}()

	// 10. Graceful Shutdown Handler
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down DataHub Servers gracefully...")

	// Graceful stop gRPC
	grpcServer.GracefulStop()
	logger.Info("gRPC Server stopped successfully")

	// Graceful stop HTTP
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpSrv.Shutdown(ctx); err != nil {
		logger.Fatal("HTTP Server forced to shutdown", zap.Error(err))
	}

	logger.Info("DataHub Service exited cleanly")
}

