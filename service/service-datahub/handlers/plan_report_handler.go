package handlers

import (
	"net/http"
	"strconv"

	"service-datahub/services/report/plan_report"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PlanReportHandler struct {
	svc    *plan_report.PlanReportService
	logger *zap.Logger
}

func NewPlanReportHandler(svc *plan_report.PlanReportService, logger *zap.Logger) *PlanReportHandler {
	return &PlanReportHandler{
		svc:    svc,
		logger: logger,
	}
}

// GetHanoiGs1PlanReport - API Endpoint riêng biệt cho Báo Cáo KHSX GS1 Hà Nội
func (h *PlanReportHandler) GetHanoiGs1PlanReport(c *gin.Context) {
	filters := h.extractFilters(c)
	filters["factoryCode"] = "GS1"
	h.executeReport(c, filters)
}

// GetQuevoGs5PlanReport - API Endpoint riêng biệt cho Báo Cáo KHSX GS5 Quế Võ
func (h *PlanReportHandler) GetQuevoGs5PlanReport(c *gin.Context) {
	filters := h.extractFilters(c)
	filters["factoryCode"] = "GS5"
	h.executeReport(c, filters)
}

// GetProductionPlanReport - API Endpoint chung (tương thích ngược)
func (h *PlanReportHandler) GetProductionPlanReport(c *gin.Context) {
	filters := h.extractFilters(c)
	h.executeReport(c, filters)
}

func (h *PlanReportHandler) extractFilters(c *gin.Context) map[string]string {
	filters := make(map[string]string)
	for k, v := range c.Request.URL.Query() {
		if len(v) > 0 {
			filters[k] = v[0]
		}
	}

	var bodyFilters map[string]interface{}
	if err := c.ShouldBindJSON(&bodyFilters); err == nil {
		for k, v := range bodyFilters {
			if strVal, ok := v.(string); ok {
				filters[k] = strVal
			} else if floatVal, ok := v.(float64); ok {
				filters[k] = strconv.FormatFloat(floatVal, 'f', -1, 64)
			}
		}
	}
	return filters
}

func (h *PlanReportHandler) executeReport(c *gin.Context, filters map[string]string) {
	reportData, err := h.svc.GenerateProductionPlanReport(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không thể tạo báo cáo kế hoạch sản xuất: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    reportData,
	})
}
