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
			auth.GET("/session", loginHandler.GetSession)
		}

		// 2. Dynamic ERP Configurations Management (CRUD)
		configs := api.Group("/configs")
		{
			configs.GET("", configHandler.GetAllConfigs)
			configs.POST("", configHandler.SaveConfig)
			configs.GET("/:key", configHandler.GetConfigByKey)
			configs.DELETE("/:key", configHandler.DeleteConfig)
		}

		// 3. DataHub Proxy & Logs
		dataHub := api.Group("/datahub")
		{
			dataHub.POST("/proxy", loginHandler.ProxyForward)
			dataHub.GET("/logs", loginHandler.GetLogs)
		}
	}

	return r
}
