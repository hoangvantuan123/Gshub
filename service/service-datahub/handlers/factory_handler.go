package handlers

import (
	"net/http"
	"strings"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type FactoryHandler struct {
	factoryService *services.FactoryService
	logger         *zap.Logger
}

func NewFactoryHandler(factoryService *services.FactoryService, logger *zap.Logger) *FactoryHandler {
	return &FactoryHandler{
		factoryService: factoryService,
		logger:         logger,
	}
}

// GetFactories handles GET & POST requests to retrieve the dynamic list of factories
// @Summary Query Factory List from Bravo ERP
// @Tags Factories
// @Produce json
// @Success 200 {object} models.ApiResponse
// @Router /api/v1/factories [get]
func (h *FactoryHandler) GetFactories(c *gin.Context) {
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")
	branchCode := c.DefaultQuery("branch_code", "")
	fiscalYear := c.Query("fiscal_year")
	endpoint := c.Query("endpoint")

	var req models.FactoryRequest
	if c.Request.Method == http.MethodPost {
		_ = c.ShouldBindJSON(&req)
	}

	if req.ConfigKey == "" {
		req.ConfigKey = configKey
	}
	if req.Username == "" {
		req.Username = username
	}
	if req.BranchCode == "" {
		req.BranchCode = branchCode
	}
	if req.FiscalYear == "" {
		req.FiscalYear = fiscalYear
	}
	if req.Endpoint == "" {
		req.Endpoint = endpoint
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

	factories, err := h.factoryService.GetFactories(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		&req,
	)

	if err != nil {
		h.logger.Error("Failed to fetch factory list", zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to query factories from Bravo ERP",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Query factories completed successfully",
		Data:    factories,
	})
}
