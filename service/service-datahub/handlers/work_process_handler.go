package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type WorkProcessHandler struct {
	workProcessService *services.WorkProcessService
	logger             *zap.Logger
}

func NewWorkProcessHandler(workProcessService *services.WorkProcessService, logger *zap.Logger) *WorkProcessHandler {
	return &WorkProcessHandler{
		workProcessService: workProcessService,
		logger:             logger,
	}
}

// GetWorkProcess handles POST request with JSON body
// @Summary Query Lệnh Công Đoạn (Master + Detail + TT Steps) from Bravo ERP
// @Tags Lệnh Công Đoạn (WorkProcess)
// @Accept json
// @Produce json
// @Param request body models.WorkProcessRequest true "Query criteria"
// @Success 200 {object} models.ApiResponse
// @Router /api/v1/work-process [post]
func (h *WorkProcessHandler) GetWorkProcess(c *gin.Context) {
	var req models.WorkProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Invalid request payload.",
			Error:   err.Error(),
		})
		return
	}

	h.handleQuery(c, &req)
}

// GetWorkProcessByQuery handles GET request with Query Parameters
// @Summary Query Lệnh Công Đoạn via query params
// @Tags Lệnh Công Đoạn (WorkProcess)
// @Produce json
// @Param doc_no query string false "Mã lệnh công đoạn (e.g. CD05-0926-0009)"
// @Param item_code query string false "Mã mặt hàng (e.g. FIN-PFB-)"
// @Param item_name query string false "Tên vật tư, hàng hóa"
// @Param unit query string false "Đơn vị tính"
// @Param customer_name query string false "Tên khách hàng"
// @Param branch_code query string false "Mã đơn vị / chi nhánh (default A01)"
// @Param fiscal_year query string false "Năm tài chính (default 2026)"
// @Param config_key query string false "ERP Config Key (default BravoDefault)"
// @Param username query string false "User executing query"
// @Param fetch_steps query bool false "Fetch TT Steps (default true)"
// @Param include_raw query bool false "Include raw ERP response (default false)"
// @Success 200 {object} models.ApiResponse
// @Router /api/v1/work-process [get]
func (h *WorkProcessHandler) GetWorkProcessByQuery(c *gin.Context) {
	docNo := strings.TrimSpace(c.Query("doc_no"))
	itemCode := strings.TrimSpace(c.Query("item_code"))
	itemName := strings.TrimSpace(c.Query("item_name"))
	unit := strings.TrimSpace(c.Query("unit"))
	customerName := strings.TrimSpace(c.Query("customer_name"))
	description := strings.TrimSpace(c.Query("description"))

	if docNo == "" && itemCode == "" && itemName == "" && unit == "" && customerName == "" && description == "" {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Vui lòng cung cấp ít nhất 1 tham số tìm kiếm (doc_no, item_code, item_name, unit, customer_name, description)",
		})
		return
	}

	branchCode := c.DefaultQuery("branch_code", "A01")
	fiscalYear := c.Query("fiscal_year")
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")
	includeRaw, _ := strconv.ParseBool(c.DefaultQuery("include_raw", "false"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", c.DefaultQuery("pnb", "0")))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "30"))

	req := &models.WorkProcessRequest{
		DocNo:        docNo,
		ItemCode:     itemCode,
		ItemName:     itemName,
		Unit:         unit,
		CustomerName: customerName,
		Description:  description,
		BranchCode:   branchCode,
		FiscalYear:   fiscalYear,
		ConfigKey:    configKey,
		Username:     username,
		IncludeRaw:   includeRaw,
		Page:         page,
		PageSize:     pageSize,
	}

	h.handleQuery(c, req)
}

// GetWorkProcessByDocNo handles GET request with URL Path parameter /:doc_no
// @Summary Query Lệnh Công Đoạn via path param
// @Tags Lệnh Công Đoạn (WorkProcess)
// @Produce json
// @Param doc_no path string true "Mã lệnh công đoạn"
// @Router /api/v1/work-process/{doc_no} [get]
func (h *WorkProcessHandler) GetWorkProcessByDocNo(c *gin.Context) {
	docNo := strings.TrimSpace(c.Param("doc_no"))
	if docNo == "" {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "DocNo parameter in URL path is required",
		})
		return
	}

	branchCode := c.DefaultQuery("branch_code", "")
	fiscalYear := c.Query("fiscal_year")
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")
	includeRaw, _ := strconv.ParseBool(c.DefaultQuery("include_raw", "false"))

	req := &models.WorkProcessRequest{
		DocNo:      docNo,
		BranchCode: branchCode,
		FiscalYear: fiscalYear,
		ConfigKey:  configKey,
		Username:   username,
		IncludeRaw: includeRaw,
	}

	h.handleQuery(c, req)
}

func (h *WorkProcessHandler) handleQuery(c *gin.Context, req *models.WorkProcessRequest) {
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

	result, err := h.workProcessService.GetWorkProcess(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		req,
	)

	if err != nil {
		h.logger.Error("Failed to fetch work process data", zap.Error(err), zap.String("doc_no", req.DocNo))
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to query work process from Bravo ERP",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Query WorkProcess completed successfully",
		Data:    result,
	})
}

