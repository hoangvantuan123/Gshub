package routes

import (
	"service-datahub/handlers"
	"service-datahub/middleware"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func SetupRouter(
	loginHandler *handlers.LoginHandler,
	configHandler *handlers.ConfigHandler,
	workProcessHandler *handlers.WorkProcessHandler,
	orderSettlementHandler *handlers.OrderSettlementHandler,
	factoryHandler *handlers.FactoryHandler,
	healthHandler *handlers.HealthHandler,
	logger *zap.Logger,
) *gin.Engine {
	r := gin.New()

	// Global Middlewares
	r.Use(gin.Recovery())
	r.Use(middleware.CorsMiddleware())
	r.Use(middleware.LoggerMiddleware(logger))

	// Health check (Public)
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/", healthHandler.HealthCheck)

	api := r.Group("/api/v1")
	{
		// 1. Auth & Login Endpoints (FE -> DataHub -> ERP)
		auth := api.Group("/auth")
		{
			auth.POST("/login", loginHandler.Login)
			auth.POST("/session", loginHandler.GetSession)
			auth.GET("/session", loginHandler.GetSession)
		}

		// 2. Dynamic ERP Configurations Management (CRUD)
		configs := api.Group("/configs")
		{
			configs.GET("", configHandler.GetAllConfigs)
			configs.POST("", configHandler.SaveConfig)
			configs.POST("/all", configHandler.GetAllConfigs)
			configs.POST("/save", configHandler.SaveConfig)
			configs.POST("/get", configHandler.GetConfigByKey)
			configs.GET("/:key", configHandler.GetConfigByKey)
			configs.DELETE("/:key", configHandler.DeleteConfig)
			configs.POST("/delete", configHandler.DeleteConfig)
		}

		// 3. DataHub Proxy & Logs
		dataHub := api.Group("/datahub")
		{
			dataHub.POST("/proxy", loginHandler.ProxyForward)
			dataHub.GET("/logs", loginHandler.GetLogs)
			dataHub.POST("/logs", loginHandler.GetLogs)
		}

		// 4. Danh mục Nhà máy (Factories)
		factories := api.Group("/factories")
		{
			factories.POST("", factoryHandler.GetFactories)
			factories.GET("", factoryHandler.GetFactories)
		}

		// 5. Lệnh Công Đoạn (WorkProcess - Master + Detail Aggregated API)
		workProcess := api.Group("/work-process")
		{
			workProcess.POST("", workProcessHandler.GetWorkProcess)
			workProcess.POST("/query", workProcessHandler.GetWorkProcess)
			workProcess.POST("/factories", factoryHandler.GetFactories)
			workProcess.POST("/by-doc", workProcessHandler.GetWorkProcessByDocNo)
			workProcess.GET("", workProcessHandler.GetWorkProcessByQuery)
			workProcess.GET("/factories", factoryHandler.GetFactories)
			workProcess.GET("/:doc_no", workProcessHandler.GetWorkProcessByDocNo)
		}

		// 6. Quyết Toán Lệnh (Order Settlement - Aggregated Flat Items)
		orderSettlement := api.Group("/order-settlement")
		{
			orderSettlement.POST("", orderSettlementHandler.GetOrderSettlement)
			orderSettlement.POST("/query", orderSettlementHandler.GetOrderSettlement)
			orderSettlement.GET("", orderSettlementHandler.GetOrderSettlement)
		}

		// Vietnamese alias route
		lenhCongDoan := api.Group("/lenh-cong-doan")
		{
			lenhCongDoan.POST("", workProcessHandler.GetWorkProcess)
			lenhCongDoan.POST("/query", workProcessHandler.GetWorkProcess)
			lenhCongDoan.POST("/factories", factoryHandler.GetFactories)
			lenhCongDoan.POST("/by-doc", workProcessHandler.GetWorkProcessByDocNo)
			lenhCongDoan.GET("", workProcessHandler.GetWorkProcessByQuery)
			lenhCongDoan.GET("/factories", factoryHandler.GetFactories)
			lenhCongDoan.GET("/:doc_no", workProcessHandler.GetWorkProcessByDocNo)
		}

		quyetToanLenh := api.Group("/quyet-toan-lenh")
		{
			quyetToanLenh.POST("", orderSettlementHandler.GetOrderSettlement)
			quyetToanLenh.POST("/query", orderSettlementHandler.GetOrderSettlement)
			quyetToanLenh.GET("", orderSettlementHandler.GetOrderSettlement)
		}
	}

	return r
}
