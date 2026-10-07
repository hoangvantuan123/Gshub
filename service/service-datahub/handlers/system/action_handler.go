package system

import (
	"net/http"
	"strings"

	"service-datahub/services/system/action"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ActionHandler struct {
	service *action.ActionService
	logger  *zap.Logger
}

func NewActionHandler(service *action.ActionService, logger *zap.Logger) *ActionHandler {
	return &ActionHandler{
		service: service,
		logger:  logger,
	}
}

func (h *ActionHandler) ActionQ(c *gin.Context) {
	var body struct {
		Keyword  string `json:"keyword"`
		Query    string `json:"query"`
		Page     int    `json:"page"`
		PageSize int    `json:"pageSize"`
	}
	_ = c.ShouldBindJSON(&body)

	kw := body.Keyword
	if kw == "" {
		kw = body.Query
	}
	if kw == "" {
		kw = c.Query("keyword")
	}

	page := body.Page
	if page <= 0 {
		page = 1
	}
	pageSize := body.PageSize
	if pageSize <= 0 {
		pageSize = 1000
	}

	result, err := h.service.QueryActions(c.Request.Context(), kw, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "2000",
		"data":         result.List,
		"page":         result.Page,
		"pageSize":     result.PageSize,
		"totalRows":    result.TotalRows,
		"total":        result.Total,
		"totalPages":   result.TotalPages,
		"totalAll":     result.TotalAll,
		"loadedCount":  result.LoadedCount,
		"totalColumns": result.TotalColumns,
	})
}

func (h *ActionHandler) ActionA(c *gin.Context) {
	var req struct {
		Data action.ActionItem `json:"data"`
		Item action.ActionItem `json:"item"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		var single action.ActionItem
		if err2 := c.ShouldBindJSON(&single); err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Dữ liệu yêu cầu không hợp lệ"})
			return
		}
		req.Data = single
	}

	target := req.Data
	if target.ActionKey == "" && target.Key == "" && req.Item.ActionKey != "" {
		target = req.Item
	}

	user := c.GetString("UserId")
	if user == "" {
		user = "SYSTEM"
	}

	created, err := h.service.CreateAction(c.Request.Context(), target, user)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tạo mới hành động thành công",
		"data":    created,
	})
}

func (h *ActionHandler) ActionU(c *gin.Context) {
	var req struct {
		Data action.ActionItem `json:"data"`
		Item action.ActionItem `json:"item"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		var single action.ActionItem
		if err2 := c.ShouldBindJSON(&single); err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Dữ liệu yêu cầu không hợp lệ"})
			return
		}
		req.Data = single
	}

	target := req.Data
	if target.Id == "" && req.Item.Id != "" {
		target = req.Item
	}

	user := c.GetString("UserId")
	if user == "" {
		user = "SYSTEM"
	}

	err := h.service.UpdateAction(c.Request.Context(), target, user)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật hành động thành công",
	})
}

func (h *ActionHandler) ActionD(c *gin.Context) {
	var req struct {
		Id string `json:"id"`
		ID string `json:"Id"`
	}
	_ = c.ShouldBindJSON(&req)

	id := req.Id
	if id == "" {
		id = req.ID
	}
	if id == "" {
		id = c.Query("id")
	}

	if strings.TrimSpace(id) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Thiếu tham số ID hành động"})
		return
	}

	err := h.service.DeleteAction(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa hành động thành công",
	})
}
