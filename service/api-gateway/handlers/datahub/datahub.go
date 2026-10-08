package datahub

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// 1. Report Plan Master & Details
func PlanMasterQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryPlanMaster")
}

func PlanMasterD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/DeletePlanMaster")
}

func PlanRegistrationSave(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/SavePlanRegistration")
}

func PlanDetailQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryPlanDetail")
}

func PlanDetailA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/AddPlanDetail")
}

func PlanDetailU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/UpdatePlanDetail")
}

func PlanDetailD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/DeletePlanDetail")
}

// 2. Production Stats Detail
func ProdStatsDetailQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryProdStatsDetail")
}

func ProdStatsDetailA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/AddProdStatsDetail")
}

func ProdStatsDetailU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/UpdateProdStatsDetail")
}

func ProdStatsDetailD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/DeleteProdStatsDetail")
}

// 3. Factory Specific Reports & Summary
func GetHanoiGs1PlanReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionPlanReport", map[string]interface{}{
		"factoryCode":  "GS1",
		"factory_code": "GS1",
	})
}

func GetHanoiGs1StatReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionStatisticsReport", map[string]interface{}{
		"factoryCode":  "GS1",
		"factory_code": "GS1",
	})
}

func GetQuevoGs5PlanReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionPlanReport", map[string]interface{}{
		"factoryCode":  "GS5",
		"factory_code": "GS5",
	})
}

func GetQuevoGs5StatReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionStatisticsReport", map[string]interface{}{
		"factoryCode":  "GS5",
		"factory_code": "GS5",
	})
}

func GetSummaryPlanReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionPlanReport", map[string]interface{}{
		"withoutItems":  "true",
		"without_items": "true",
	})
}

func GetSummaryStatReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.HandleWithDefaults(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionStatisticsReport", map[string]interface{}{
		"withoutItems":  "true",
		"without_items": "true",
	})
}

func GetProductionPlanReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionPlanReport")
}

func GetProductionStatisticsReport(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetProductionStatisticsReport")
}

// 4. Work Process & Order Settlement
func GetWorkProcess(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryWorkProcess")
}

func GetWorkProcessByDocNo(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryWorkProcess")
}

func GetOrderSettlement(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryWorkProcess")
}

func GetFactories(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetFactories")
}

// 5. Configs
func GetAllConfigs(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetAllConfigs")
}

func SaveConfig(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/SaveConfig")
}

func DeleteConfig(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/DeleteConfig")
}

// 6. DataHub Auth & Proxy
func Login(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/Login")
}

func GetSession(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetSession")
}

func ProxyForward(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/ProxyForward")
}

func GetLogs(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/GetAuditLogs")
}
