package routes

import (
	"service-datahub/handlers"
	"service-datahub/middleware"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func SetupRouter(
	authHandler *handlers.AuthHandler,
	loginHandler *handlers.LoginHandler,
	configHandler *handlers.ConfigHandler,
	workProcessHandler *handlers.WorkProcessHandler,
	orderSettlementHandler *handlers.OrderSettlementHandler,
	factoryHandler *handlers.FactoryHandler,
	planMasterHandler *handlers.PlanMasterHandler,
	planDetailHandler *handlers.PlanDetailHandler,
	prodStatsDetailHandler *handlers.ProdStatsDetailHandler,
	healthHandler *handlers.HealthHandler,
	logger *zap.Logger,
) *gin.Engine {
	r := gin.New()

	// Global Middlewares
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.BodyLimit(100<<20, logger)) // 100MB Payload limit
	r.Use(middleware.CorsMiddleware())
	r.Use(middleware.LoggerMiddleware(logger))
	r.Use(middleware.BotFilter(logger))
	r.Use(middleware.AntiSpamMiddleware(logger))

	// Health check (Public - no signature needed)
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/", healthHandler.HealthCheck)

	// ====================================================================
	// API V2 Routes - Electron Desktop & Web Client with AppSecurityMiddleware (HMAC-SHA256)
	// ====================================================================
	v2 := r.Group("/api/v2")
	v2.Use(middleware.AppSecurityMiddleware(logger))
	{
		// 1. Auth & Accounts (/api/v2/acc)
		acc := v2.Group("/acc")
		{
			acc.POST("/p2/login", authHandler.Login)
			acc.POST("/p2/loginApp", authHandler.Login)
			acc.POST("/p2/change-password", authHandler.ChangePass)
			acc.POST("/p2/logout", authHandler.Logout)
			acc.POST("/UsersAuthA", authHandler.UsersAuthA)
			acc.POST("/UsersAuthU", authHandler.UsersAuthU)
			acc.POST("/UsersAuthD", authHandler.UsersAuthD)
			acc.POST("/UsersAuthQ", authHandler.UsersAuthQ)
			acc.POST("/UsersAuthUStatusAcc", authHandler.UsersAuthUStatusAcc)
			acc.POST("/UPass2", authHandler.UpdatePasswords)
		}

		// 2. Roles & Permissions (/api/v2/role)
		role := v2.Group("/role")
		{
			role.POST("/RoleQ", authHandler.RoleQ)
			role.POST("/UserRoleQ", authHandler.UserRoleQ)
			role.POST("/UserRoleA", authHandler.UserRoleA)
			role.POST("/UserRoleU", authHandler.UserRoleU)
			role.POST("/UserRoleD", authHandler.UserRoleD)
		}

		// 3. Menus (/api/v2/menu & /api/v2/system-users & /api/v2/mssql/system-users)
		regMenus := func(g *gin.RouterGroup) {
			g.POST("/MenuQ", authHandler.MenuQ)
			g.POST("/RootMenuQ", authHandler.RootMenuQ)
			g.POST("/root-menu-Q", authHandler.RootMenuQ)
		}
		regMenus(v2.Group("/menu"))
		regMenus(v2.Group("/system-users"))
		regMenus(v2.Group("/mssql/system-users"))

		// 4. Report Registration & Queries (Master, KHSX Detail, TKSX Detail)
		planV2 := v2.Group("/report/plan")
		{
			// Master (A/U/D/Q)
			planV2.POST("/PlanMasterQ", planMasterHandler.PlanMasterQ)
			planV2.POST("/PlanMasterD", planMasterHandler.PlanMasterD)
			planV2.POST("/PlanRegistrationA", planMasterHandler.PlanRegistrationSave)

			// KHSX Detail (A/U/D/Q)
			planV2.POST("/PlanDetailQ", planDetailHandler.PlanDetailQ)
			planV2.POST("/PlanDetailA", planDetailHandler.PlanDetailA)
			planV2.POST("/PlanDetailU", planDetailHandler.PlanDetailU)
			planV2.POST("/PlanDetailD", planDetailHandler.PlanDetailD)

			// TKSX Detail (A/U/D/Q)
			planV2.POST("/ProdStatsDetailQ", prodStatsDetailHandler.ProdStatsDetailQ)
			planV2.POST("/ProdStatsDetailA", prodStatsDetailHandler.ProdStatsDetailA)
			planV2.POST("/ProdStatsDetailU", prodStatsDetailHandler.ProdStatsDetailU)
			planV2.POST("/ProdStatsDetailD", prodStatsDetailHandler.ProdStatsDetailD)
		}
	}

	// ====================================================================
	// API V1 Routes - High-Performance DataHub APIs
	// ====================================================================
	v1 := r.Group("/api/v1")
	{
		// 1. Auth & Login Endpoints (Dual login support)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/session", loginHandler.GetSession)
			auth.GET("/session", loginHandler.GetSession)
		}

		// 2. Dynamic ERP Configurations Management (CRUD)
		configs := v1.Group("/configs")
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
		dataHub := v1.Group("/datahub")
		{
			dataHub.POST("/proxy", loginHandler.ProxyForward)
			dataHub.GET("/logs", loginHandler.GetLogs)
			dataHub.POST("/logs", loginHandler.GetLogs)
		}

		// 4. Danh mục Nhà máy (Factories)
		factories := v1.Group("/factories")
		{
			factories.POST("", factoryHandler.GetFactories)
			factories.GET("", factoryHandler.GetFactories)
		}

		// 5. Lệnh Công Đoạn (WorkProcess - Master + Detail Aggregated API)
		workProcess := v1.Group("/work-process")
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
		orderSettlement := v1.Group("/order-settlement")
		{
			orderSettlement.POST("", orderSettlementHandler.GetOrderSettlement)
			orderSettlement.POST("/query", orderSettlementHandler.GetOrderSettlement)
			orderSettlement.GET("", orderSettlementHandler.GetOrderSettlement)
		}

		// Vietnamese alias routes
		lenhCongDoan := v1.Group("/lenh-cong-doan")
		{
			lenhCongDoan.POST("", workProcessHandler.GetWorkProcess)
			lenhCongDoan.POST("/query", workProcessHandler.GetWorkProcess)
			lenhCongDoan.POST("/factories", factoryHandler.GetFactories)
			lenhCongDoan.POST("/by-doc", workProcessHandler.GetWorkProcessByDocNo)
			lenhCongDoan.GET("", workProcessHandler.GetWorkProcessByQuery)
			lenhCongDoan.GET("/factories", factoryHandler.GetFactories)
			lenhCongDoan.GET("/:doc_no", workProcessHandler.GetWorkProcessByDocNo)
		}

		quyetToanLenh := v1.Group("/quyet-toan-lenh")
		{
			quyetToanLenh.POST("", orderSettlementHandler.GetOrderSettlement)
			quyetToanLenh.POST("/query", orderSettlementHandler.GetOrderSettlement)
			quyetToanLenh.GET("", orderSettlementHandler.GetOrderSettlement)
		}

		// 7. Báo cáo Kế hoạch Sản xuất & Thống kê sản xuất (Plan & Stats Report)
		planV1 := v1.Group("/report/plan")
		{
			planV1.POST("/query-master", planMasterHandler.PlanMasterQ)
			planV1.POST("/query-detail", planDetailHandler.PlanDetailQ)
			planV1.POST("/query-stats-detail", prodStatsDetailHandler.ProdStatsDetailQ)
			planV1.POST("/save", planMasterHandler.PlanRegistrationSave)
			planV1.POST("/delete-master", planMasterHandler.PlanMasterD)
			planV1.DELETE("/master/:reg_code", planMasterHandler.PlanMasterD)
		}
	}

	return r
}
