package handlers

import (
	"net/http"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ConfigHandler struct {
	configService *services.ConfigService
	logger        *zap.Logger
}

func NewConfigHandler(configService *services.ConfigService, logger *zap.Logger) *ConfigHandler {
	return &ConfigHandler{
		configService: configService,
		logger:        logger,
	}
}

// GetAllConfigs godoc
// @Summary List all ERP configurations
// @Tags Configurations
// @Produce json
// @Router /api/v1/configs [get]
func (h *ConfigHandler) GetAllConfigs(c *gin.Context) {
	list, err := h.configService.GetAllConfigs(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to retrieve configurations",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data:    list,
	})
}

// GetConfigByKey godoc
// @Summary Get a specific ERP configuration
// @Tags Configurations
// @Produce json
// @Param key path string true "Config Key"
// @Router /api/v1/configs/:key [get]
func (h *ConfigHandler) GetConfigByKey(c *gin.Context) {
	key := c.Param("key")
	cfg, err := h.configService.GetConfigByKey(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ApiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data:    cfg,
	})
}

// SaveConfig godoc
// @Summary Create or update an ERP configuration
// @Tags Configurations
// @Accept json
// @Produce json
// @Param request body models.ErpConfig true "ERP Config Body"
// @Router /api/v1/configs [post]
func (h *ConfigHandler) SaveConfig(c *gin.Context) {
	var body models.ErpConfig
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Invalid configuration payload",
			Error:   err.Error(),
		})
		return
	}

	if err := h.configService.SaveConfig(c.Request.Context(), &body); err != nil {
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to save configuration",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Configuration saved successfully",
		Data:    body,
	})
}

// DeleteConfig godoc
// @Summary Delete an ERP configuration
// @Tags Configurations
// @Produce json
// @Param key path string true "Config Key"
// @Router /api/v1/configs/:key [delete]
func (h *ConfigHandler) DeleteConfig(c *gin.Context) {
	key := c.Param("key")
	if err := h.configService.DeleteConfig(c.Request.Context(), key); err != nil {
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to delete configuration",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Configuration deleted successfully",
	})
}
