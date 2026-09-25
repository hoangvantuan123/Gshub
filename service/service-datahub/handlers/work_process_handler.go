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

	// Kiểm tra xem có ít nhất 1 điều kiện tìm kiếm hay không
	if strings.TrimSpace(req.DocNo) == "" &&
		strings.TrimSpace(req.ItemCode) == "" &&
		len(req.ItemCodes) == 0 &&
		strings.TrimSpace(req.ItemName) == "" &&
		len(req.ItemNames) == 0 &&
		strings.TrimSpace(req.Unit) == "" &&
		strings.TrimSpace(req.CustomerName) == "" &&
		strings.TrimSpace(req.Description) == "" &&
		len(req.ColumnFilters) == 0 &&
		len(req.RawSSE) == 0 {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Vui lòng cung cấp ít nhất một điều kiện tìm kiếm (doc_no, item_code, item_name, unit, customer_name, column_filters, hoặc raw_sse)",
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

	var fetchSteps *bool
	if val := c.Query("fetch_steps"); val != "" {
		b, err := strconv.ParseBool(val)
		if err == nil {
			fetchSteps = &b
		}
	}

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
		FetchSteps:   fetchSteps,
		IncludeRaw:   includeRaw,
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

	branchCode := c.DefaultQuery("branch_code", "A01")
	fiscalYear := c.Query("fiscal_year")
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")
	includeRaw, _ := strconv.ParseBool(c.DefaultQuery("include_raw", "false"))

	var fetchSteps *bool
	if val := c.Query("fetch_steps"); val != "" {
		b, err := strconv.ParseBool(val)
		if err == nil {
			fetchSteps = &b
		}
	}

	req := &models.WorkProcessRequest{
		DocNo:      docNo,
		BranchCode: branchCode,
		FiscalYear: fiscalYear,
		ConfigKey:  configKey,
		Username:   username,
		FetchSteps: fetchSteps,
		IncludeRaw: includeRaw,
	}

	h.handleQuery(c, req)
}

func (h *WorkProcessHandler) handleQuery(c *gin.Context, req *models.WorkProcessRequest) {
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

// GetWorkProcessSteps handles on-demand query of TT steps for a single stage order row (POST)
// @Summary Query TT steps on demand for a detail stage order row
// @Tags Lệnh Công Đoạn (WorkProcess)
// @Accept json
// @Produce json
// @Param request body models.WorkProcessStepsRequest true "Step query criteria"
// @Router /api/v1/work-process/steps [post]
func (h *WorkProcessHandler) GetWorkProcessSteps(c *gin.Context) {
	var req models.WorkProcessStepsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Invalid request payload. 'row_id' is required.",
			Error:   err.Error(),
		})
		return
	}

	h.handleStepsQuery(c, &req)
}

// GetWorkProcessStepsByQuery handles on-demand query of TT steps via GET query params
// @Summary Query TT steps via GET
// @Tags Lệnh Công Đoạn (WorkProcess)
// @Produce json
// @Param row_id query string true "RowId of detail stage order"
// @Router /api/v1/work-process/steps [get]
func (h *WorkProcessHandler) GetWorkProcessStepsByQuery(c *gin.Context) {
	rowID := strings.TrimSpace(c.Query("row_id"))
	if rowID == "" {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success: false,
			Message: "Query parameter 'row_id' is required",
		})
		return
	}

	branchCode := c.DefaultQuery("branch_code", "A01")
	fiscalYear := c.Query("fiscal_year")
	configKey := c.DefaultQuery("config_key", "BravoDefault")
	username := c.Query("username")

	req := &models.WorkProcessStepsRequest{
		RowID:      rowID,
		BranchCode: branchCode,
		FiscalYear: fiscalYear,
		ConfigKey:  configKey,
		Username:   username,
	}

	h.handleStepsQuery(c, req)
}

func (h *WorkProcessHandler) handleStepsQuery(c *gin.Context, req *models.WorkProcessStepsRequest) {
	steps, err := h.workProcessService.GetWorkProcessSteps(
		c.Request.Context(),
		c.ClientIP(),
		c.Request.UserAgent(),
		req,
	)
	if err != nil {
		h.logger.Error("Failed to fetch work process steps", zap.Error(err), zap.String("row_id", req.RowID))
		c.JSON(http.StatusInternalServerError, models.ApiResponse{
			Success: false,
			Message: "Failed to query TT steps from Bravo ERP",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "Query TT Steps completed successfully",
		Data:    steps,
	})
}
