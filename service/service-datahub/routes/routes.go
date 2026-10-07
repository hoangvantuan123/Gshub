package routes

import (
	"service-datahub/config"
	"service-datahub/handlers"
	"service-datahub/handlers/system"
	"service-datahub/middleware"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func SetupRouter(
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	userAuthHandler *system.UserAuthHandler,
	roleGroupHandler *system.RoleGroupHandler,
	rolePermHandler *system.RolePermHandler,
	rootMenuHandler *system.RootMenuHandler,
	menuHandler *system.MenuHandler,
	loginHandler *handlers.LoginHandler,
	configHandler *handlers.ConfigHandler,
	workProcessHandler *handlers.WorkProcessHandler,
	orderSettlementHandler *handlers.OrderSettlementHandler,
	factoryHandler *handlers.FactoryHandler,
	planMasterHandler *handlers.PlanMasterHandler,
	planDetailHandler *handlers.PlanDetailHandler,
	prodStatsDetailHandler *handlers.ProdStatsDetailHandler,
	planReportHandler *handlers.PlanReportHandler,
	summaryPlanReportHandler *handlers.SummaryPlanReportHandler,
	summaryStatReportHandler *handlers.SummaryStatReportHandler,
	helpHandler *handlers.HelpHandler,
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

	// Health check (Public - no signature or token needed)
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/", healthHandler.HealthCheck)
	r.GET("/ping", healthHandler.HealthCheck)

	// Helper đăng ký các route CodeHelp & Danh mục dùng chung
	regHelp := func(g *gin.RouterGroup) {
		g.POST("/CodeHelpQ", helpHandler.CodeHelpQ)
		g.GET("/CodeHelpQ", helpHandler.CodeHelpQ)
		g.POST("/CodeHelpCmnQ", helpHandler.CodeHelpQ)
		g.GET("/CodeHelpCmnQ", helpHandler.CodeHelpQ)
		g.POST("/LangH", helpHandler.LangH)
		g.GET("/LangH", helpHandler.LangH)
		g.POST("/UsersH", helpHandler.UsersH)
		g.POST("/MenuH", helpHandler.MenuH)
		// g.POST("/RootMenuH", helpHandler.RootMenuH)
		g.POST("/SubMenuH", helpHandler.SubMenuH)
	}

	// ====================================================================
	// API V2 Routes - Electron Desktop & Web Client with AppSecurity + JWT
	// ====================================================================
	v2 := r.Group("/api/v2")
	v2.Use(middleware.AppSecurityMiddleware(logger))
	v2.Use(middleware.OptionalJwtAuthMiddleware(cfg))
	{
		// 1. Auth & Accounts (/api/v2/acc)
		acc := v2.Group("/acc")
		{
			acc.POST("/p2/login", authHandler.Login)
			acc.POST("/p2/loginApp", authHandler.Login)
			acc.POST("/p2/change-password", authHandler.ChangePass)
			acc.POST("/p2/logout", authHandler.Logout)

			// Tách riêng User Auth A/U/D/Q Handler
			acc.POST("/UsersAuthA", userAuthHandler.UsersAuthA)
			acc.POST("/UsersAuthU", userAuthHandler.UsersAuthU)
			acc.POST("/UsersAuthD", userAuthHandler.UsersAuthD)
			acc.POST("/UsersAuthQ", userAuthHandler.UsersAuthQ)
			acc.POST("/UsersAuthUStatusAcc", authHandler.UsersAuthUStatusAcc)
			acc.POST("/UPass2", authHandler.UpdatePasswords)
		}

		// 2. Roles & Permissions (/api/v2/role)
		role := v2.Group("/role")
		{
			// Tách riêng Role Group A/U/D/Q Handler
			role.POST("/RoleGroupQ", roleGroupHandler.RoleGroupQ)
			role.POST("/RoleGroupA", roleGroupHandler.RoleGroupA)
			role.POST("/RoleGroupU", roleGroupHandler.RoleGroupU)
			role.POST("/RoleGroupD", roleGroupHandler.RoleGroupD)

			// Tách riêng Role Perm & Assignment Handler
			role.POST("/RoleQ", roleGroupHandler.RoleGroupQ)
			role.POST("/RoleA", roleGroupHandler.RoleGroupA)
			role.POST("/RoleU", roleGroupHandler.RoleGroupU)
			role.POST("/RoleD", roleGroupHandler.RoleGroupD)

			role.POST("/UserRoleQ", rolePermHandler.UserRoleQ)
			role.POST("/UserRoleA", rolePermHandler.UserRoleA)
			role.POST("/UserRoleU", rolePermHandler.MenuRoleU)
			role.POST("/UserRoleD", rolePermHandler.UserRoleD)

			role.POST("/MenuRoleQ", rolePermHandler.MenuRoleQ)
			// role.POST("/RootMenuRoleQ", rolePermHandler.RootMenuRoleQ)
		}

		// 3. Menus (/api/v2/menu & /api/v2/system-users & /api/v2/mssql/system-users)
		regMenus := func(g *gin.RouterGroup) {
			// Tách riêng Menu A/U/D/Q Handler
			g.POST("/MenuQ", menuHandler.MenuQ)
			g.POST("/MenuA", menuHandler.MenuA)
			g.POST("/MenuU", menuHandler.MenuU)
			g.POST("/MenuD", menuHandler.MenuD)

			// Tạm ẩn API RootMenu / Module
			// g.POST("/RootMenuQ", rootMenuHandler.RootMenuQ)
			// g.POST("/RootMenuA", rootMenuHandler.RootMenuA)
			// g.POST("/RootMenuU", rootMenuHandler.RootMenuU)
			// g.POST("/RootMenuD", rootMenuHandler.RootMenuD)
			// g.POST("/root-menu-Q", rootMenuHandler.RootMenuQ)
		}
		regMenus(v2.Group("/menu"))
		regMenus(v2.Group("/system-users"))
		regMenus(v2.Group("/mssql/system-users"))

		// 4. CodeHelp & Common Help Engine (/api/v2/help)
		regHelp(v2.Group("/help"))
		regHelp(v2.Group("/mssql/help-query"))

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
			planV2.GET("/ProdStatsDetailQ", prodStatsDetailHandler.ProdStatsDetailQ)
			planV2.POST("/ProdStatsDetailA", prodStatsDetailHandler.ProdStatsDetailA)
			planV2.POST("/ProdStatsDetailU", prodStatsDetailHandler.ProdStatsDetailU)
			planV2.POST("/ProdStatsDetailD", prodStatsDetailHandler.ProdStatsDetailD)
		}

		statV2 := v2.Group("/report/stat")
		{
			statV2.POST("/ProdStatsDetailQ", prodStatsDetailHandler.ProdStatsDetailQ)
			statV2.GET("/ProdStatsDetailQ", prodStatsDetailHandler.ProdStatsDetailQ)
			statV2.POST("/ProdStatsDetailA", prodStatsDetailHandler.ProdStatsDetailA)
			statV2.POST("/ProdStatsDetailU", prodStatsDetailHandler.ProdStatsDetailU)
			statV2.POST("/ProdStatsDetailD", prodStatsDetailHandler.ProdStatsDetailD)
		}

		// Production Reports (V2) - Tách biệt rõ ràng từng đầu API cho từng nhà máy & báo cáo tổng
		prodReportsV2 := v2.Group("/report/production")
		{
			// 1. GS1 Hà Nội riêng biệt
			hanoiV2 := prodReportsV2.Group("/hanoi-gs1")
			{
				hanoiV2.POST("/plan", planReportHandler.GetHanoiGs1PlanReport)
				hanoiV2.GET("/plan", planReportHandler.GetHanoiGs1PlanReport)
				hanoiV2.POST("/statistics", prodStatsDetailHandler.GetHanoiGs1StatReport)
				hanoiV2.GET("/statistics", prodStatsDetailHandler.GetHanoiGs1StatReport)
			}

			// 2. GS5 Quế Võ riêng biệt
			quevoV2 := prodReportsV2.Group("/quevo-gs5")
			{
				quevoV2.POST("/plan", planReportHandler.GetQuevoGs5PlanReport)
				quevoV2.GET("/plan", planReportHandler.GetQuevoGs5PlanReport)
				quevoV2.POST("/statistics", prodStatsDetailHandler.GetQuevoGs5StatReport)
				quevoV2.GET("/statistics", prodStatsDetailHandler.GetQuevoGs5StatReport)
			}

			// 3. Báo Cáo Tổng Hợp Toàn Công Ty (Summary) - Dùng Handler riêng biệt, KHÔNG trả mảng items
			summaryV2 := prodReportsV2.Group("/summary")
			{
				summaryV2.POST("/plan", summaryPlanReportHandler.GetSummaryPlanReport)
				summaryV2.GET("/plan", summaryPlanReportHandler.GetSummaryPlanReport)
				summaryV2.POST("/statistics", summaryStatReportHandler.GetSummaryStatReport)
				summaryV2.GET("/statistics", summaryStatReportHandler.GetSummaryStatReport)
			}

			// Fallback alias chung
			prodReportsV2.GET("/statistics", prodStatsDetailHandler.GetProductionStatisticsReport)
			prodReportsV2.POST("/statistics", prodStatsDetailHandler.GetProductionStatisticsReport)
			prodReportsV2.GET("/plan", planReportHandler.GetProductionPlanReport)
			prodReportsV2.POST("/plan", planReportHandler.GetProductionPlanReport)
		}
	}

	// ====================================================================
	// API V1 Routes - High-Performance DataHub APIs with Security & Auth
	// ====================================================================
	v1 := r.Group("/api/v1")
	v1.Use(middleware.AppSecurityMiddleware(logger))
	v1.Use(middleware.OptionalJwtAuthMiddleware(cfg))
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

		// 8. Báo cáo Thống kê & Kế hoạch Sản xuất Tổng hợp (Aggregated Production Reports)
		prodReportsV1 := v1.Group("/report/production")
		{
			prodReportsV1.GET("/statistics", prodStatsDetailHandler.GetProductionStatisticsReport)
			prodReportsV1.POST("/statistics", prodStatsDetailHandler.GetProductionStatisticsReport)
			prodReportsV1.GET("/plan", planReportHandler.GetProductionPlanReport)
			prodReportsV1.POST("/plan", planReportHandler.GetProductionPlanReport)
		}

		// 9. Help V1
		regHelp(v1.Group("/help"))
	}

	// API V6 (HOST_API_SERVER_9 compatibility)
	v6 := r.Group("/api/v6")
	v6.Use(middleware.AppSecurityMiddleware(logger))
	{
		regHelp(v6.Group("/help"))
	}

	// Root Help alias
	rootHelp := r.Group("/help")
	{
		regHelp(rootHelp)
	}

	return r
}
