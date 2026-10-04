package handlers

import (
	"net/http"
	"strconv"

	"service-datahub/services/report/summary_stat_report"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type SummaryStatReportHandler struct {
	svc    *summary_stat_report.SummaryStatReportService
	logger *zap.Logger
}

func NewSummaryStatReportHandler(svc *summary_stat_report.SummaryStatReportService, logger *zap.Logger) *SummaryStatReportHandler {
	return &SummaryStatReportHandler{
		svc:    svc,
		logger: logger,
	}
}

// GetSummaryStatReport - API Endpoint riêng biệt cho Báo Cáo TKSX Tổng Hợp Toàn Công Ty
func (h *SummaryStatReportHandler) GetSummaryStatReport(c *gin.Context) {
	filters := h.extractFilters(c)
	reportData, err := h.svc.GenerateSummaryStatReport(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không thể tạo báo cáo thống kê sản xuất tổng hợp: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    reportData,
	})
}

func (h *SummaryStatReportHandler) extractFilters(c *gin.Context) map[string]string {
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
