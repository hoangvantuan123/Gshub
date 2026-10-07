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
	"service-datahub/handlers/system"
	"service-datahub/routes"
	"service-datahub/services"
	"service-datahub/services/help"
	"service-datahub/services/report/plan_detail"
	"service-datahub/services/report/plan_master"
	"service-datahub/services/report/plan_report"
	"service-datahub/services/report/prod_stats_detail"
	"service-datahub/services/report/summary_plan_report"
	"service-datahub/services/report/summary_stat_report"
	"service-datahub/services/system/menu"
	"service-datahub/services/system/role_group"
	"service-datahub/services/system/role_perm"
	"service-datahub/services/system/root_menu"
	"service-datahub/services/system/user_auth"

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
	sqlDB, err := db.DB()
	if err != nil {
		logger.Fatal("Failed to get underlying SQL DB", zap.Error(err))
	}

	// 4. Initialize Services (Tách biệt từng thư mục nhóm nghiệp vụ A/U/D/Q)
	authService := services.NewAuthService(db, cfg, logger)
	configService := services.NewConfigService(cfg, db, logger)
	loginService := services.NewLoginService(db, configService, logger)
	workProcessService := services.NewWorkProcessService(cfg, db, configService, loginService, logger)
	orderSettlementService := services.NewOrderSettlementService(cfg, configService, loginService, workProcessService, logger)
	factoryService := services.NewFactoryService(cfg, db, configService, loginService, logger)
	helpService := help.NewCodeHelpService(db, logger)

	// Phân hệ Quản Trị Hệ Thống (Services tách biệt)
	userAuthService := user_auth.NewUserAuthService(sqlDB, logger)
	roleGroupService := role_group.NewRoleGroupService(sqlDB, logger)
	rolePermService := role_perm.NewRolePermService(sqlDB, logger)
	rootMenuService := root_menu.NewRootMenuService(sqlDB, logger)
	menuService := menu.NewMenuService(sqlDB, logger)

	// Báo cáo Master & Detail Services (KHSX & TKSX tách biệt từng thư mục A/U/D/Q)
	planMasterService := plan_master.NewPlanMasterService(db, logger)
	planDetailService := plan_detail.NewPlanDetailService(db, logger)
	planReportService := plan_report.NewPlanReportService(db, logger)
	prodStatsDetailService := prod_stats_detail.NewProdStatsDetailService(db, logger)
	summaryPlanReportService := summary_plan_report.NewSummaryPlanReportService(db, logger)
	summaryStatReportService := summary_stat_report.NewSummaryStatReportService(db, logger)

	// 5. Initialize Handlers for REST (Tách biệt từng Handler nhóm)
	authHandler := handlers.NewAuthHandler(authService, logger)
	userAuthHandler := system.NewUserAuthHandler(userAuthService, logger)
	roleGroupHandler := system.NewRoleGroupHandler(roleGroupService, logger)
	rolePermHandler := system.NewRolePermHandler(rolePermService, logger)
	rootMenuHandler := system.NewRootMenuHandler(rootMenuService, logger)
	menuHandler := system.NewMenuHandler(menuService, logger)

	loginHandler := handlers.NewLoginHandler(loginService, logger)
	configHandler := handlers.NewConfigHandler(configService, logger)
	workProcessHandler := handlers.NewWorkProcessHandler(workProcessService, logger)
	orderSettlementHandler := handlers.NewOrderSettlementHandler(orderSettlementService, logger)
	factoryHandler := handlers.NewFactoryHandler(factoryService, logger)
	helpHandler := handlers.NewHelpHandler(helpService, logger)

	planMasterHandler := handlers.NewPlanMasterHandler(planMasterService, planDetailService, prodStatsDetailService, db, logger)
	planDetailHandler := handlers.NewPlanDetailHandler(planDetailService, logger)
	planReportHandler := handlers.NewPlanReportHandler(planReportService, logger)
	prodStatsDetailHandler := handlers.NewProdStatsDetailHandler(prodStatsDetailService, logger)
	summaryPlanReportHandler := handlers.NewSummaryPlanReportHandler(summaryPlanReportService, logger)
	summaryStatReportHandler := handlers.NewSummaryStatReportHandler(summaryStatReportService, logger)
	healthHandler := handlers.NewHealthHandler(db)

	// 6. Setup HTTP REST Router
	router := routes.SetupRouter(
		cfg,
		authHandler,
		userAuthHandler,
		roleGroupHandler,
		rolePermHandler,
		rootMenuHandler,
		menuHandler,
		loginHandler,
		configHandler,
		workProcessHandler,
		orderSettlementHandler,
		factoryHandler,
		planMasterHandler,
		planDetailHandler,
		prodStatsDetailHandler,
		planReportHandler,
		summaryPlanReportHandler,
		summaryStatReportHandler,
		helpHandler,
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

	logger.Info("Shutting down DataHub Service gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpSrv.Shutdown(ctx); err != nil {
		logger.Error("HTTP Server Shutdown Error", zap.Error(err))
	}
	grpcServer.GracefulStop()

	logger.Info("SysCore DataHub Service stopped successfully.")
}
