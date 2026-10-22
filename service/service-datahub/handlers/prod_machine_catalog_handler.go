package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"service-datahub/auth"
	"service-datahub/services/report/prod_machine_catalog"
)

type ProdMachineCatalogHandler struct {
	svc    *prod_machine_catalog.ProdMachineCatalogService
	logger *zap.Logger
}

func NewProdMachineCatalogHandler(svc *prod_machine_catalog.ProdMachineCatalogService, logger *zap.Logger) *ProdMachineCatalogHandler {
	return &ProdMachineCatalogHandler{svc: svc, logger: logger}
}

func (h *ProdMachineCatalogHandler) ProdMachineCatalogA(c *gin.Context) { h.execute(c, "A") }
func (h *ProdMachineCatalogHandler) ProdMachineCatalogU(c *gin.Context) { h.execute(c, "U") }
func (h *ProdMachineCatalogHandler) ProdMachineCatalogD(c *gin.Context) { h.execute(c, "D") }
func (h *ProdMachineCatalogHandler) ProdMachineCatalogQ(c *gin.Context) { h.execute(c, "Q") }

func (h *ProdMachineCatalogHandler) execute(c *gin.Context, operation string) {
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
	userId := c.GetString("user_id")
	if userId == "" {
		if user := auth.AuthenticatedUserFromContext(c.Request.Context()); user != nil {
			if user.UserId != "" {
				userId = user.UserId
			} else {
				userId = user.UserSeq
			}
		}
	}
	if userId == "" {
		userId = c.GetString("user_seq")
	}
	if userId == "" && operation == "D" {
		userId = "SYSTEM"
	}
	result, err := h.svc.Execute(c.Request.Context(), operation, body, userId)
	if err != nil {
		var apiErr *prod_machine_catalog.APIError
		if errors.As(err, &apiErr) {
			c.JSON(apiErr.Status, gin.H{"success": false, "message": apiErr.Message})
			return
		}
		h.logger.Error("ProdMachineCatalog failed", zap.String("operation", operation), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi xử lý dữ liệu danh mục máy móc"})
		return
	}
	c.JSON(http.StatusOK, result)
}
