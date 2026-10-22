package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"service-datahub/auth"
	"service-datahub/services/report/prod_machine_registration"
)

type ProdMachineRegistrationHandler struct {
	svc    *prod_machine_registration.Service
	logger *zap.Logger
}

func NewProdMachineRegistrationHandler(svc *prod_machine_registration.Service, logger *zap.Logger) *ProdMachineRegistrationHandler {
	return &ProdMachineRegistrationHandler{svc: svc, logger: logger}
}

func (h *ProdMachineRegistrationHandler) execute(c *gin.Context, operation string) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Không thể đọc dữ liệu"})
		return
	}
	if c.Request.Method == http.MethodGet {
		filters := map[string]string{}
		for key, values := range c.Request.URL.Query() {
			if len(values) > 0 {
				filters[key] = values[0]
			}
		}
		body, _ = json.Marshal(filters)
	}
	userID := c.GetString("user_id")
	if userID == "" {
		if user := auth.AuthenticatedUserFromContext(c.Request.Context()); user != nil {
			userID = user.UserId
			if userID == "" {
				userID = user.UserSeq
			}
		}
	}
	result, err := h.svc.Execute(c.Request.Context(), operation, body, userID)
	if err != nil {
		var apiErr *prod_machine_registration.APIError
		if errors.As(err, &apiErr) {
			c.JSON(apiErr.Status, gin.H{"success": false, "message": apiErr.Message})
			return
		}
		h.logger.Error("ProdMachineRegistration failed", zap.String("operation", operation), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi xử lý đăng ký báo cáo máy"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ProdMachineRegistrationHandler) ProdMachineRegistrationA(c *gin.Context) { h.execute(c, "A") }
func (h *ProdMachineRegistrationHandler) ProdMachineRegistrationD(c *gin.Context) { h.execute(c, "D") }
func (h *ProdMachineRegistrationHandler) ProdMachineRegistrationQ(c *gin.Context) { h.execute(c, "Q") }
