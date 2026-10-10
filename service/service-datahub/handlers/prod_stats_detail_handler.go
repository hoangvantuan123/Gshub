package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	models "service-datahub/models/report"
	"service-datahub/services/report/prod_stats_detail"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ProdStatsDetailHandler struct {
	svc    *prod_stats_detail.ProdStatsDetailService
	logger *zap.Logger
}

func NewProdStatsDetailHandler(svc *prod_stats_detail.ProdStatsDetailService, logger *zap.Logger) *ProdStatsDetailHandler {
	return &ProdStatsDetailHandler{
		svc:    svc,
		logger: logger,
	}
}

// ProdStatsDetailQ - Truy vấn dữ liệu chi tiết Thống Kê Sản Xuất (_ERPProdStatsDetail)
func (h *ProdStatsDetailHandler) ProdStatsDetailQ(c *gin.Context) {
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

	details, pageInfo, err := h.svc.ProdStatsDetailQ(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi truy vấn chi tiết TKSX: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"data":     details,
		"pageInfo": pageInfo,
	})
}

// ProdStatsDetailA - Thêm mới các dòng chi tiết TKSX
func (h *ProdStatsDetailHandler) ProdStatsDetailA(c *gin.Context) {
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Không thể đọc dữ liệu: " + err.Error(),
		})
		return
	}

	var items []models.ERPProdStatsDetail
	_ = json.Unmarshal(bodyBytes, &items)

	var rawMaps []map[string]interface{}
	if errRaw := json.Unmarshal(bodyBytes, &rawMaps); errRaw != nil {
		var wrapper struct {
			Items []map[string]interface{} `json:"items"`
			Data  []map[string]interface{} `json:"data"`
		}
		if errWrap := json.Unmarshal(bodyBytes, &wrapper); errWrap == nil {
			if len(wrapper.Items) > 0 {
				rawMaps = wrapper.Items
			} else {
				rawMaps = wrapper.Data
			}
		}
	}

	if len(items) == 0 && len(rawMaps) > 0 {
		items = make([]models.ERPProdStatsDetail, len(rawMaps))
	}

	if len(items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu dòng chi tiết TKSX rỗng hoặc không hợp lệ",
		})
		return
	}

	for i := range items {
		if i < len(rawMaps) && rawMaps[i] != nil {
			fillProdStatsDetailFromRawMap(&items[i], rawMaps[i])
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

	created, err := h.svc.ProdStatsDetailA(c.Request.Context(), items, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Thêm mới dòng TKSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    created,
	})
}

// ProdStatsDetailU - Cập nhật các dòng chi tiết TKSX
func (h *ProdStatsDetailHandler) ProdStatsDetailU(c *gin.Context) {
	var items []models.ERPProdStatsDetail
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu dòng chi tiết TKSX không hợp lệ: " + err.Error(),
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

	updated, err := h.svc.ProdStatsDetailU(c.Request.Context(), items, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Cập nhật dòng TKSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updated,
	})
}

// ProdStatsDetailD - Xóa danh sách dòng chi tiết TKSX
func (h *ProdStatsDetailHandler) ProdStatsDetailD(c *gin.Context) {
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

	if err := h.svc.ProdStatsDetailD(c.Request.Context(), seqs, userId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Xóa chi tiết TKSX thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa chi tiết TKSX thành công!",
	})
}

// GetHanoiGs1StatReport - API Endpoint riêng biệt cho Báo Cáo TKSX GS1 Hà Nội
func (h *ProdStatsDetailHandler) GetHanoiGs1StatReport(c *gin.Context) {
	filters := h.extractFilters(c)
	filters["factoryCode"] = "GS1"
	h.executeReport(c, filters)
}

// GetQuevoGs5StatReport - API Endpoint riêng biệt cho Báo Cáo TKSX GS5 Quế Võ
func (h *ProdStatsDetailHandler) GetQuevoGs5StatReport(c *gin.Context) {
	filters := h.extractFilters(c)
	filters["factoryCode"] = "GS5"
	h.executeReport(c, filters)
}

// GetProductionStatisticsReport - API Endpoint cung cấp dữ liệu báo cáo Thống Kê Sản Xuất hoàn chỉnh cho FE (tương thích ngược)
func (h *ProdStatsDetailHandler) GetProductionStatisticsReport(c *gin.Context) {
	filters := h.extractFilters(c)
	h.executeReport(c, filters)
}

func (h *ProdStatsDetailHandler) extractFilters(c *gin.Context) map[string]string {
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

func (h *ProdStatsDetailHandler) executeReport(c *gin.Context, filters map[string]string) {
	reportData, err := h.svc.GenerateProductionStatisticsReport(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không thể tạo báo cáo thống kê sản xuất: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    reportData,
	})
}

