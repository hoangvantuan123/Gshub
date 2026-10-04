package handlers

import (
	"net/http"
	"strconv"

	"service-datahub/services/report/summary_plan_report"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type SummaryPlanReportHandler struct {
	svc    *summary_plan_report.SummaryPlanReportService
	logger *zap.Logger
}

func NewSummaryPlanReportHandler(svc *summary_plan_report.SummaryPlanReportService, logger *zap.Logger) *SummaryPlanReportHandler {
	return &SummaryPlanReportHandler{
		svc:    svc,
		logger: logger,
	}
}

// GetSummaryPlanReport - API Endpoint riêng biệt cho Báo Cáo KHSX Tổng Hợp Toàn Công Ty
func (h *SummaryPlanReportHandler) GetSummaryPlanReport(c *gin.Context) {
	filters := h.extractFilters(c)
	reportData, err := h.svc.GenerateSummaryPlanReport(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không thể tạo báo cáo kế hoạch sản xuất tổng hợp: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    reportData,
	})
}

func (h *SummaryPlanReportHandler) extractFilters(c *gin.Context) map[string]string {
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
