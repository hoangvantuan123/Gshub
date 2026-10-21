package handlers

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"io"
	"net/http"
	"service-datahub/auth"
	"service-datahub/services/report/prod_stats_remark_type"
)

type ProdStatsRemarkTypeHandler struct {
	svc    *prod_stats_remark_type.ProdStatsRemarkTypeService
	logger *zap.Logger
}

func NewProdStatsRemarkTypeHandler(svc *prod_stats_remark_type.ProdStatsRemarkTypeService, logger *zap.Logger) *ProdStatsRemarkTypeHandler {
	return &ProdStatsRemarkTypeHandler{svc: svc, logger: logger}
}
func (h *ProdStatsRemarkTypeHandler) ProdStatsRemarkTypeA(c *gin.Context) { h.execute(c, "A") }
func (h *ProdStatsRemarkTypeHandler) ProdStatsRemarkTypeU(c *gin.Context) { h.execute(c, "U") }
func (h *ProdStatsRemarkTypeHandler) ProdStatsRemarkTypeD(c *gin.Context) { h.execute(c, "D") }
func (h *ProdStatsRemarkTypeHandler) ProdStatsRemarkTypeQ(c *gin.Context) { h.execute(c, "Q") }

func (h *ProdStatsRemarkTypeHandler) execute(c *gin.Context, operation string) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Không thể đọc dữ liệu"})
		return
	}
	if c.Request.Method == http.MethodGet {
		filters := map[string]string{}
		for k, values := range c.Request.URL.Query() {
			if len(values) > 0 {
				filters[k] = values[0]
			}
		}
		body, _ = json.Marshal(filters)
	}
	userSeq := ""
	if user := auth.AuthenticatedUserFromContext(c.Request.Context()); user != nil {
		userSeq = user.UserSeq
	}
	result, err := h.svc.Execute(c.Request.Context(), operation, body, userSeq)
	if err != nil {
		var apiErr *prod_stats_remark_type.APIError
		if errors.As(err, &apiErr) {
			c.JSON(apiErr.Status, gin.H{"success": false, "message": apiErr.Message})
			return
		}
		h.logger.Error("ProdStatsRemarkType failed", zap.String("operation", operation), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi xử lý dữ liệu phân loại"})
		return
	}
	c.JSON(http.StatusOK, result)
}
