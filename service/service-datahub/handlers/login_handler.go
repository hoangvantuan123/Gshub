package handlers

import (
	"net/http"
	"strconv"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type LoginHandler struct {
	loginService *services.LoginService
	logger       *zap.Logger
}

func NewLoginHandler(loginService *services.LoginService, logger *zap.Logger) *LoginHandler {
	return &LoginHandler{
		loginService: loginService,
		logger:       logger,
	}
}

// Login godoc
// @Summary Login directly to ERP system configured in DATAHUB DB
// @Tags Auth & Login
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Login credentials & ConfigKey"
// @Success 200 {object} models.LoginResponse
// @Router /api/v1/auth/login [post]
func (h *LoginHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Invalid login payload. Username and Password are required.",
			Error:   err.Error(),
		})
		return
	}

	resp, err := h.loginService.Login(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		&req,
	)

	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ApiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Authentication successful",
		Data:    resp,
	})
}

// GetSession godoc
// @Summary Check / retrieve active token session
// @Tags Auth & Login
// @Produce json
// @Param config_key query string false "Config Key (default BravoDefault)"
// @Param username query string true "Username"
// @Router /api/v1/auth/session [get]
func (h *LoginHandler) GetSession(c *gin.Context) {
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")

	if c.Request.Method == http.MethodPost {
		var req struct {
			ConfigKey string `json:"config_key"`
			Username  string `json:"username"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			if req.ConfigKey != "" {
				configKey = req.ConfigKey
			}
			if req.Username != "" {
				username = req.Username
			}
		}
	}

	if username == "" {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Username parameter is required",
		})
		return
	}

	session, err := h.loginService.GetTokenSession(c.Request.Context(), configKey, username)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ApiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data:    session,
	})
}

// ProxyForward godoc
// @Summary Forward API requests to ERP using active token session
// @Tags Proxy
// @Accept json
// @Produce json
// @Router /api/v1/datahub/proxy [post]
func (h *LoginHandler) ProxyForward(c *gin.Context) {
	var req models.ProxyForwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Invalid proxy payload",
			Error:   err.Error(),
		})
		return
	}

	resp, err := h.loginService.ForwardToErp(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		&req,
	)

	if err != nil {
		c.JSON(http.StatusBadGateway, models.ApiResponse{
			Success: false,
			Message: "Failed to communicate with external ERP system",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetLogs godoc
// @Summary Retrieve audit logs
// @Tags Audit
// @Produce json
// @Router /api/v1/datahub/logs [get]
func (h *LoginHandler) GetLogs(c *gin.Context) {
	configKey := c.Query("config_key")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	logs, total, err := h.loginService.GetAuditLogs(c.Request.Context(), configKey, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to query audit logs",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data:    logs,
		Meta: gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}
