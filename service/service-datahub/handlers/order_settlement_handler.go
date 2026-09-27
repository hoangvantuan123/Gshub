package handlers

import (
	"net/http"
	"strings"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type OrderSettlementHandler struct {
	settlementService *services.OrderSettlementService
	logger            *zap.Logger
}

func NewOrderSettlementHandler(
	settlementService *services.OrderSettlementService,
	logger *zap.Logger,
) *OrderSettlementHandler {
	return &OrderSettlementHandler{
		settlementService: settlementService,
		logger:            logger,
	}
}

// GetOrderSettlement handles GET & POST requests to retrieve the flattened order settlement items
// @Summary Query Order Settlement (Quyết toán lệnh)
// @Tags OrderSettlement
// @Accept json
// @Produce json
// @Router /api/v1/order-settlement [post]
func (h *OrderSettlementHandler) GetOrderSettlement(c *gin.Context) {
	req := &models.OrderSettlementRequest{}

	if c.Request.Method == http.MethodPost {
		if err := c.ShouldBindJSON(req); err != nil && err.Error() != "EOF" {
			h.logger.Warn("Failed to bind JSON for OrderSettlement request", zap.Error(err))
		}
	} else {
		req.StageOrderNo = c.Query("stage_order_no")
		req.ItemCode = c.Query("item_code")
		req.ItemName = c.Query("item_name")
		req.OperationCode = c.Query("operation_code")
		req.Status = c.Query("status")
		req.BranchCode = c.Query("branch_code")
		req.FiscalYear = c.Query("fiscal_year")
		req.ConfigKey = c.Query("config_key")
		req.Username = c.Query("username")
	}

	if req.ConfigKey == "" {
		req.ConfigKey = c.GetHeader("X-Config-Key")
	}
	if req.Username == "" {
		req.Username = c.GetHeader("X-Username")
	}
	if req.Token == "" {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			if strings.HasPrefix(authHeader, "Bearer ") {
				req.Token = strings.TrimPrefix(authHeader, "Bearer ")
			} else {
				req.Token = authHeader
			}
		} else {
			req.Token = c.GetHeader("X-Access-Token")
		}
	}

	resp, err := h.settlementService.GetOrderSettlement(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		req,
	)
	if err != nil {
		h.logger.Error("GetOrderSettlement handler failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to query order settlement from Bravo ERP",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Query order settlement completed successfully",
		Data:    resp,
	})
}
