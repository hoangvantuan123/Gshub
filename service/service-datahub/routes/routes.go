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
	actionHandler *system.ActionHandler,
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
		g.POST("/RootMenuH", helpHandler.RootMenuH)
		g.POST("/SubMenuH", helpHandler.SubMenuH)
		g.POST("/PermActionsH", helpHandler.CodeHelpQ)
		g.POST("/ActionsH", helpHandler.CodeHelpQ)
	}

	// ====================================================================
	// API V2 Routes - Electron Desktop & Web Client with AppSecurity + JWT
	// ====================================================================
	v2 := r.Group("/api/v2")
	v2.Use(middleware.AppSecurityMiddleware(logger))
	v2.Use(middleware.OptionalJwtAuthMiddleware(cfg))
	{
		// 1. Auth & Accounts (/api/v2/acc, /api/v2/system/acc, /api/v2/system-users)
		regAcc := func(g *gin.RouterGroup) {
			g.POST("/p2/login", authHandler.Login)
			g.POST("/p2/loginApp", authHandler.Login)
			g.POST("/p2/change-password", authHandler.ChangePass)
			g.POST("/p2/logout", authHandler.Logout)

			g.POST("/UsersAuthA", userAuthHandler.UsersAuthA)
			g.POST("/UsersAuthU", userAuthHandler.UsersAuthU)
			g.POST("/UsersAuthD", userAuthHandler.UsersAuthD)
			g.POST("/UsersAuthQ", userAuthHandler.UsersAuthQ)
			g.POST("/UsersAuthUStatusAcc", authHandler.UsersAuthUStatusAcc)
			g.POST("/UPass2", authHandler.UpdatePasswords)
		}
		regAcc(v2.Group("/acc"))
		regAcc(v2.Group("/system/acc"))
		regAcc(v2.Group("/system/user"))
		regAcc(v2.Group("/system/users"))
		regAcc(v2.Group("/system-users"))
		regAcc(v2.Group("/mssql/system-users"))

		// 2. Roles & Permissions (/api/v2/role, /api/v2/system/role, /api/v2/system/roles)
		regRoles := func(g *gin.RouterGroup) {
			g.POST("/RoleGroupQ", roleGroupHandler.RoleGroupQ)
			g.POST("/RoleGroupA", roleGroupHandler.RoleGroupA)
			g.POST("/RoleGroupU", roleGroupHandler.RoleGroupU)
			g.POST("/RoleGroupD", roleGroupHandler.RoleGroupD)

			g.POST("/RoleQ", roleGroupHandler.RoleGroupQ)
			g.POST("/RoleA", roleGroupHandler.RoleGroupA)
			g.POST("/RoleU", roleGroupHandler.RoleGroupU)
			g.POST("/RoleD", roleGroupHandler.RoleGroupD)

			g.POST("/UserRoleQ", rolePermHandler.UserRoleQ)
			g.POST("/UserRoleA", rolePermHandler.UserRoleA)
			g.POST("/UserRoleU", rolePermHandler.MenuRoleU)
			g.POST("/UserRoleD", rolePermHandler.UserRoleD)

			g.POST("/MenuRoleQ", rolePermHandler.MenuRoleQ)
			g.POST("/MenuRoleU", rolePermHandler.MenuRoleU)
			g.POST("/RootMenuRoleQ", rolePermHandler.RootMenuRoleQ)
			g.POST("/RootMenuRoleU", rolePermHandler.RootMenuRoleU)

			// Action Perms theo Menu & Role Group
			g.POST("/ActionRoleQ", rolePermHandler.ActionRoleQ)
			g.POST("/ActionRoleU", rolePermHandler.ActionRoleU)
			g.POST("/MenuActionRoleQ", rolePermHandler.ActionRoleQ)
			g.POST("/MenuActionRoleU", rolePermHandler.ActionRoleU)

			// Table Group & Technique Perm Aliases
			g.POST("/TblGrpQ", roleGroupHandler.RoleGroupQ)
			g.POST("/TblGrpA", roleGroupHandler.RoleGroupA)
			g.POST("/TblGrpU", roleGroupHandler.RoleGroupU)
			g.POST("/TblGrpD", roleGroupHandler.RoleGroupD)

			g.POST("/TblGrpItemQ", rolePermHandler.MenuRoleQ)
			g.POST("/TblGrpItemA", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpItemU", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpItemD", rolePermHandler.MenuRoleU)

			g.POST("/TblGrpPermQ", rolePermHandler.MenuRoleQ)
			g.POST("/TblGrpPermA", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpPermU", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpPermD", rolePermHandler.MenuRoleU)

			g.POST("/TblGrpPermRoleQ", rolePermHandler.MenuRoleQ)
			g.POST("/TblGrpPermRoleA", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpPermRoleU", rolePermHandler.MenuRoleU)
			g.POST("/TblGrpPermRoleD", rolePermHandler.MenuRoleU)
		}
		regRoles(v2.Group("/role"))
		regRoles(v2.Group("/roles"))
		regRoles(v2.Group("/system/role"))
		regRoles(v2.Group("/system/roles"))

		// 3. Menus & Actions (/api/v2/menu, /api/v2/action & /api/v2/system/*)
		regMenus := func(g *gin.RouterGroup) {
			// Menu CRUD
			g.POST("/MenuQ", menuHandler.MenuQ)
			g.POST("/MenuA", menuHandler.MenuA)
			g.POST("/MenuU", menuHandler.MenuU)
			g.POST("/MenuD", menuHandler.MenuD)

			// RootMenu CRUD
			g.POST("/RootMenuQ", rootMenuHandler.RootMenuQ)
			g.POST("/RootMenuA", rootMenuHandler.RootMenuA)
			g.POST("/RootMenuU", rootMenuHandler.RootMenuU)
			g.POST("/RootMenuD", rootMenuHandler.RootMenuD)
			g.POST("/root-menu-Q", rootMenuHandler.RootMenuQ)

			// Action Registry CRUD
			g.POST("/ActionQ", actionHandler.ActionQ)
			g.POST("/ActionA", actionHandler.ActionA)
			g.POST("/ActionU", actionHandler.ActionU)
			g.POST("/ActionD", actionHandler.ActionD)

			// Metasys Legacy Endpoints
			g.POST("/metasys-menu", menuHandler.MenuA)
			g.POST("/metasys-roles-menus", rolePermHandler.MenuRoleU)
			g.GET("/menus-not-in-role", menuHandler.MenuQ)
			g.POST("/search-menus", menuHandler.MenuQ)

			g.POST("/metasys-root-menu", rootMenuHandler.RootMenuA)
			g.POST("/metasys-roles-root-menus", rolePermHandler.MenuRoleU)
			g.GET("/metasys-root-menu-all", rootMenuHandler.RootMenuQ)
			g.GET("/root-menus-not-in-role", rootMenuHandler.RootMenuQ)
			g.POST("/search-root-menus", rootMenuHandler.RootMenuQ)
		}
		regMenus(v2.Group("/menu"))
		regMenus(v2.Group("/menus"))
		regMenus(v2.Group("/action"))
		regMenus(v2.Group("/actions"))
		regMenus(v2.Group("/system/menu"))
		regMenus(v2.Group("/system/menus"))
		regMenus(v2.Group("/system/action"))
		regMenus(v2.Group("/system/actions"))

		// Tổng hợp trực tiếp trên /api/v2/system
		sysGroup := v2.Group("/system")
		regAcc(sysGroup)
		regRoles(sysGroup)
		regMenus(sysGroup)

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
