package datahub

import (
	"api-gateway/handlers/datahub"
	"api-gateway/internal/grpcclient"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine, pool *grpcclient.Pool) {
	// ====================================================================
	// API V2 Report Routes
	// ====================================================================
	v2 := r.Group("/api/v2")
	{
		// 1. Report Plan
		planV2 := v2.Group("/report/plan")
		{
			planV2.POST("/PlanMasterQ", datahub.PlanMasterQ(pool))
			planV2.POST("/PlanMasterD", datahub.PlanMasterD(pool))
			planV2.POST("/PlanRegistrationA", datahub.PlanRegistrationSave(pool))

			planV2.POST("/PlanDetailQ", datahub.PlanDetailQ(pool))
			planV2.POST("/PlanDetailA", datahub.PlanDetailA(pool))
			planV2.POST("/PlanDetailU", datahub.PlanDetailU(pool))
			planV2.POST("/PlanDetailD", datahub.PlanDetailD(pool))

			planV2.POST("/ProdStatsDetailQ", datahub.ProdStatsDetailQ(pool))
			planV2.GET("/ProdStatsDetailQ", datahub.ProdStatsDetailQ(pool))
			planV2.POST("/ProdStatsDetailA", datahub.ProdStatsDetailA(pool))
			planV2.POST("/ProdStatsDetailU", datahub.ProdStatsDetailU(pool))
			planV2.POST("/ProdStatsDetailD", datahub.ProdStatsDetailD(pool))
		}

		// 2. Report Stat
		statV2 := v2.Group("/report/stat")
		{
			statV2.POST("/ProdStatsDetailQ", datahub.ProdStatsDetailQ(pool))
			statV2.GET("/ProdStatsDetailQ", datahub.ProdStatsDetailQ(pool))
			statV2.POST("/ProdStatsDetailA", datahub.ProdStatsDetailA(pool))
			statV2.POST("/ProdStatsDetailU", datahub.ProdStatsDetailU(pool))
			statV2.POST("/ProdStatsDetailD", datahub.ProdStatsDetailD(pool))
		}

		// 3. Production Reports (V2)
		prodReportsV2 := v2.Group("/report/production")
		{
			hanoiV2 := prodReportsV2.Group("/hanoi-gs1")
			{
				hanoiV2.POST("/plan", datahub.GetHanoiGs1PlanReport(pool))
				hanoiV2.GET("/plan", datahub.GetHanoiGs1PlanReport(pool))
				hanoiV2.POST("/statistics", datahub.GetHanoiGs1StatReport(pool))
				hanoiV2.GET("/statistics", datahub.GetHanoiGs1StatReport(pool))
			}

			quevoV2 := prodReportsV2.Group("/quevo-gs5")
			{
				quevoV2.POST("/plan", datahub.GetQuevoGs5PlanReport(pool))
				quevoV2.GET("/plan", datahub.GetQuevoGs5PlanReport(pool))
				quevoV2.POST("/statistics", datahub.GetQuevoGs5StatReport(pool))
				quevoV2.GET("/statistics", datahub.GetQuevoGs5StatReport(pool))
			}

			summaryV2 := prodReportsV2.Group("/summary")
			{
				summaryV2.POST("/plan", datahub.GetSummaryPlanReport(pool))
				summaryV2.GET("/plan", datahub.GetSummaryPlanReport(pool))
				summaryV2.POST("/statistics", datahub.GetSummaryStatReport(pool))
				summaryV2.GET("/statistics", datahub.GetSummaryStatReport(pool))
			}

			prodReportsV2.GET("/statistics", datahub.GetProductionStatisticsReport(pool))
			prodReportsV2.POST("/statistics", datahub.GetProductionStatisticsReport(pool))
			prodReportsV2.GET("/plan", datahub.GetProductionPlanReport(pool))
			prodReportsV2.POST("/plan", datahub.GetProductionPlanReport(pool))
		}
	}

	// ====================================================================
	// API V1 Routes - WorkProcess, Settlement, Factories, Configs
	// ====================================================================
	v1 := r.Group("/api/v1")
	{
		authV1 := v1.Group("/auth")
		{
			authV1.POST("/login", datahub.Login(pool))
			authV1.GET("/session", datahub.GetSession(pool))
			authV1.POST("/session", datahub.GetSession(pool))
		}

		datahubV1 := v1.Group("/datahub")
		{
			datahubV1.POST("/proxy", datahub.ProxyForward(pool))
			datahubV1.GET("/logs", datahub.GetLogs(pool))
			datahubV1.POST("/logs", datahub.GetLogs(pool))
		}

		configs := v1.Group("/configs")
		{
			configs.GET("", datahub.GetAllConfigs(pool))
			configs.POST("", datahub.SaveConfig(pool))
			configs.POST("/all", datahub.GetAllConfigs(pool))
			configs.POST("/save", datahub.SaveConfig(pool))
			configs.POST("/delete", datahub.DeleteConfig(pool))
			configs.DELETE("/:key", datahub.DeleteConfig(pool))
		}

		factories := v1.Group("/factories")
		{
			factories.POST("", datahub.GetFactories(pool))
			factories.GET("", datahub.GetFactories(pool))
		}

		workProcess := v1.Group("/work-process")
		{
			workProcess.POST("", datahub.GetWorkProcess(pool))
			workProcess.POST("/query", datahub.GetWorkProcess(pool))
			workProcess.POST("/factories", datahub.GetFactories(pool))
			workProcess.POST("/by-doc", datahub.GetWorkProcessByDocNo(pool))
			workProcess.GET("", datahub.GetWorkProcess(pool))
			workProcess.GET("/factories", datahub.GetFactories(pool))
			workProcess.GET("/:doc_no", datahub.GetWorkProcessByDocNo(pool))
		}

		lenhCongDoan := v1.Group("/lenh-cong-doan")
		{
			lenhCongDoan.POST("", datahub.GetWorkProcess(pool))
			lenhCongDoan.POST("/query", datahub.GetWorkProcess(pool))
			lenhCongDoan.POST("/factories", datahub.GetFactories(pool))
			lenhCongDoan.POST("/by-doc", datahub.GetWorkProcessByDocNo(pool))
			lenhCongDoan.GET("", datahub.GetWorkProcess(pool))
			lenhCongDoan.GET("/factories", datahub.GetFactories(pool))
			lenhCongDoan.GET("/:doc_no", datahub.GetWorkProcessByDocNo(pool))
		}

		orderSettlement := v1.Group("/order-settlement")
		{
			orderSettlement.POST("", datahub.GetOrderSettlement(pool))
			orderSettlement.POST("/query", datahub.GetOrderSettlement(pool))
			orderSettlement.GET("", datahub.GetOrderSettlement(pool))
		}

		quyetToanLenh := v1.Group("/quyet-toan-lenh")
		{
			quyetToanLenh.POST("", datahub.GetOrderSettlement(pool))
			quyetToanLenh.POST("/query", datahub.GetOrderSettlement(pool))
			quyetToanLenh.GET("", datahub.GetOrderSettlement(pool))
		}

		planV1 := v1.Group("/report/plan")
		{
			planV1.POST("/query-master", datahub.PlanMasterQ(pool))
			planV1.POST("/query-detail", datahub.PlanDetailQ(pool))
			planV1.POST("/query-stats-detail", datahub.ProdStatsDetailQ(pool))
			planV1.POST("/save", datahub.PlanRegistrationSave(pool))
			planV1.POST("/delete-master", datahub.PlanMasterD(pool))
		}

		prodReportsV1 := v1.Group("/report/production")
		{
			prodReportsV1.GET("/statistics", datahub.GetProductionStatisticsReport(pool))
			prodReportsV1.POST("/statistics", datahub.GetProductionStatisticsReport(pool))
			prodReportsV1.GET("/plan", datahub.GetProductionPlanReport(pool))
			prodReportsV1.POST("/plan", datahub.GetProductionPlanReport(pool))
		}
	}
}
