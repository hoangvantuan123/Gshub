package handlers

import (
	"net/http"
	"strconv"

	models "service-datahub/models/report"
	"service-datahub/services/report/plan_detail"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PlanDetailHandler struct {
	svc    *plan_detail.PlanDetailService
	logger *zap.Logger
}

func NewPlanDetailHandler(svc *plan_detail.PlanDetailService, logger *zap.Logger) *PlanDetailHandler {
	return &PlanDetailHandler{
		svc:    svc,
		logger: logger,
	}
}

// PlanDetailQ - Truy vấn 24 cột dữ liệu KHSX của Điều Phối (_ERPPlanDetail)
func (h *PlanDetailHandler) PlanDetailQ(c *gin.Context) {
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

	details, pageInfo, err := h.svc.PlanDetailQ(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi truy vấn chi tiết KHSX: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"data":     details,
		"pageInfo": pageInfo,
	})
}

// PlanDetailA - Thêm mới các dòng chi tiết KHSX
func (h *PlanDetailHandler) PlanDetailA(c *gin.Context) {
	var items []models.ERPPlanDetail
	if err := c.ShouldBindJSON(&items); err != nil {
		var wrapper struct {
			Items []models.ERPPlanDetail `json:"items"`
			Data  []models.ERPPlanDetail `json:"data"`
		}
		if errWrap := c.ShouldBindJSON(&wrapper); errWrap == nil && (len(wrapper.Items) > 0 || len(wrapper.Data) > 0) {
			if len(wrapper.Items) > 0 {
				items = wrapper.Items
			} else {
				items = wrapper.Data
			}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Dữ liệu dòng chi tiết KHSX không hợp lệ: " + err.Error(),
			})
			return
		}
	}

	userId := c.GetString("user_id")
	if userId == "" {
		userId = c.GetString("UserId")
	}
	if userId == "" {
		userId = c.GetString("user_seq")
	}
	if userId == "" {
		userId = c.GetHeader("X-User-Id")
	}
	if userId == "" {
		userId = "SystemUser"
	}

	created, err := h.svc.PlanDetailA(c.Request.Context(), items, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Thêm mới dòng KHSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    created,
	})
}

// PlanDetailU - Cập nhật các dòng chi tiết KHSX
func (h *PlanDetailHandler) PlanDetailU(c *gin.Context) {
	var items []models.ERPPlanDetail
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu dòng chi tiết KHSX không hợp lệ: " + err.Error(),
		})
		return
	}

	userId := c.GetString("user_id")
	if userId == "" {
		userId = c.GetString("UserId")
	}
	if userId == "" {
		userId = c.GetString("user_seq")
	}
	if userId == "" {
		userId = c.GetHeader("X-User-Id")
	}
	if userId == "" {
		userId = "SystemUser"
	}

	updated, err := h.svc.PlanDetailU(c.Request.Context(), items, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Cập nhật dòng KHSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updated,
	})
}

// PlanDetailD - Xóa danh sách dòng chi tiết KHSX
func (h *PlanDetailHandler) PlanDetailD(c *gin.Context) {
	var req struct {
		DetailSeqs []string `json:"detailSeqs"`
		IdSeq      string   `json:"idSeq"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu xóa không hợp lệ: " + err.Error(),
		})
		return
	}

	seqs := req.DetailSeqs
	if len(seqs) == 0 && req.IdSeq != "" {
		seqs = []string{req.IdSeq}
	}

	userId := c.GetString("user_id")
	if userId == "" {
		userId = c.GetString("UserId")
	}
	if userId == "" {
		userId = c.GetString("user_seq")
	}
	if userId == "" {
		userId = c.GetHeader("X-User-Id")
	}
	if userId == "" {
		userId = "SystemUser"
	}

	if err := h.svc.PlanDetailD(c.Request.Context(), seqs, userId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Xóa chi tiết KHSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa chi tiết KHSX thành công!",
	})
}
