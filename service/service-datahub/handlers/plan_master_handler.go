package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services"
	"service-datahub/services/report/plan_detail"
	"service-datahub/services/report/plan_master"
	"service-datahub/services/report/prod_stats_detail"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type PlanMasterHandler struct {
	masterSvc *plan_master.PlanMasterService
	planSvc   *plan_detail.PlanDetailService
	statsSvc  *prod_stats_detail.ProdStatsDetailService
	db        *gorm.DB
	logger    *zap.Logger
}

func NewPlanMasterHandler(
	masterSvc *plan_master.PlanMasterService,
	planSvc *plan_detail.PlanDetailService,
	statsSvc *prod_stats_detail.ProdStatsDetailService,
	db *gorm.DB,
	logger *zap.Logger,
) *PlanMasterHandler {
	return &PlanMasterHandler{
		masterSvc: masterSvc,
		planSvc:   planSvc,
		statsSvc:  statsSvc,
		db:        db,
		logger:    logger,
	}
}

// PlanMasterQ - Truy vấn Master đăng ký báo cáo
func (h *PlanMasterHandler) PlanMasterQ(c *gin.Context) {
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

	masters, pageInfo, err := h.masterSvc.PlanMasterQ(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi truy vấn danh sách đăng ký báo cáo: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"data":     masters,
		"pageInfo": pageInfo,
	})
}

// PlanRegistrationSave - Lưu toàn bộ đợt đăng ký từ UI Modal (Master + Details KHSX hoặc TKSX)
func (h *PlanMasterHandler) PlanRegistrationSave(c *gin.Context) {
	var req models.PlanRegistrationSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu gửi lên không đúng định dạng: " + err.Error(),
		})
		return
	}

	// Lấy thông tin tài khoản người đăng ký từ claims token hoặc từ request body
	userId := c.GetString("user_id")
	if userId == "" {
		userId = c.GetString("UserId")
	}
	if userId == "" {
		userId = c.GetString("user_seq")
	}
	if userId == "" {
		userId = req.CreatedBy
	}
	if userId == "" {
		userId = req.UserSeq
	}
	if userId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error_code": "UNAUTHORIZED",
			"message": "Yêu cầu bị từ chối: Vui lòng đăng nhập tài khoản để thực hiện lưu đăng ký báo cáo.",
		})
		return
	}

	userName := c.GetString("login")
	if userName == "" {
		userName = req.CreatedByName
	}
	if userName == "" {
		userName = req.UserName
	}
	if userName == "" {
		userName = userId
	}

	reportType := strings.ToLower(strings.TrimSpace(req.ReportType))
	if reportType == "" {
		reportType = "plan"
	}
	if req.FactoryCode == "" {
		if strings.Contains(strings.ToUpper(req.FactoryName), "GS5") || strings.Contains(strings.ToLower(req.FactoryName), "quế võ") {
			req.FactoryCode = "GS5"
		} else {
			req.FactoryCode = "GS1"
		}
	}
	if req.FactoryName == "" {
		if req.FactoryCode == "GS5" {
			req.FactoryName = "GS5 Quế Võ 1B"
		} else {
			req.FactoryName = "GS1 Hà Nội"
		}
	}
	if req.ApplyDate == "" {
		req.ApplyDate = time.Now().Format("2006-01-02")
	}
	if req.Status == "" {
		if req.IsDraft {
			req.Status = "draft"
		} else {
			req.Status = "published"
		}
	}

	// Fallback nếu client gửi dữ liệu dưới dạng SheetData hoặc Data hoặc data/sheetData
	if len(req.StatsData) == 0 && (reportType == "statistics" || reportType == "tksx") {
		rawList := req.SheetData
		if len(rawList) == 0 {
			rawList = req.Data
		}
		if len(rawList) > 0 {
			if rawBytes, err := json.Marshal(rawList); err == nil {
				_ = json.Unmarshal(rawBytes, &req.StatsData)
			}
		}
	}

	if len(req.PlanData) == 0 && (reportType == "plan" || reportType == "khsx") {
		rawList := req.SheetData
		if len(rawList) == 0 {
			rawList = req.Data
		}
		if len(rawList) > 0 {
			if rawBytes, err := json.Marshal(rawList); err == nil {
				_ = json.Unmarshal(rawBytes, &req.PlanData)
			}
		}
	}

	totalRows := req.TotalRows
	if totalRows <= 0 {
		totalRows = len(req.PlanData)
		if reportType == "statistics" || reportType == "tksx" {
			totalRows = len(req.StatsData)
		}
	}

	regCode := strings.TrimSpace(req.RegCode)
	if regCode == "" {
		prefix := "KHSX"
		if reportType == "statistics" || reportType == "tksx" {
			prefix = "TKSX"
		}
		datePart := strings.ReplaceAll(req.ApplyDate, "-", "")
		regCode = fmt.Sprintf("%s_%s_%04d", prefix, datePart, time.Now().UnixNano()%10000)
	}

	var createdMaster models.ERPPlanMaster

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		// Kiểm tra tính duy nhất: 1 nhà máy + 1 loại báo cáo + 1 ngày áp dụng chỉ được tối đa 1 master
		var existingCount int64
		if reportType == "statistics" || reportType == "tksx" {
			tx.Model(&models.ERPPlanMaster{}).
				Where(`"FactoryCode" = ? AND ("ReportType" = 'statistics' OR "ReportType" = 'tksx') AND "ApplyDate" = ?`, req.FactoryCode, req.ApplyDate).
				Count(&existingCount)
		} else {
			tx.Model(&models.ERPPlanMaster{}).
				Where(`"FactoryCode" = ? AND ("ReportType" = 'plan' OR "ReportType" = 'khsx') AND "ApplyDate" = ?`, req.FactoryCode, req.ApplyDate).
				Count(&existingCount)
		}
		if existingCount > 0 {
			repTypeName := "Kế hoạch sản xuất"
			if reportType == "statistics" || reportType == "tksx" {
				repTypeName = "Thống kê sản xuất"
			}
			return fmt.Errorf("nhà máy %s đã có đợt đăng ký %s cho ngày %s (mỗi nhà máy chỉ được đăng ký tối đa 1 đợt cho mỗi loại báo cáo trong 1 ngày)", req.FactoryName, repTypeName, req.ApplyDate)
		}

		now := time.Now()
		masterIdSeq := services.GenerateUUIDv7()

		createdMaster = models.ERPPlanMaster{
			IdSeq:         masterIdSeq,
			RegCode:       regCode,
			ReportType:    reportType,
			FactoryCode:   &req.FactoryCode,
			FactoryName:   &req.FactoryName,
			ApplyDate:     &req.ApplyDate,
			Remark:        &req.Remark,
			Status:        &req.Status,
			TotalRows:     totalRows,
			RowVersion:    1,
			IsActive:      true,
			CreatedBy:     &userId,
			CreatedByName: &userName,
			CreatedAt:     &now,
			UpdatedBy:     &userId,
			UpdatedByName: &userName,
			UpdatedAt:     &now,
		}

		if err := tx.Create(&createdMaster).Error; err != nil {
			return fmt.Errorf("lỗi khi tạo bản ghi Master: %w", err)
		}

		if reportType == "statistics" || reportType == "tksx" {
			if len(req.StatsData) > 0 {
				details := make([]models.ERPProdStatsDetail, len(req.StatsData))
				for i, item := range req.StatsData {
					details[i] = item
					if details[i].IdSeq == "" {
						details[i].IdSeq = services.GenerateUUIDv7()
					}
					details[i].MasterSeq = masterIdSeq
					details[i].RegCode = regCode
					details[i].RowSeq = i + 1
					details[i].WorkingTag = "A"
					details[i].RowVersion = 1
					details[i].CreatedBy = &userId
					details[i].CreatedByName = &userName
					details[i].UpdatedBy = &userId
					details[i].UpdatedByName = &userName
					details[i].CreatedAt = &now
					details[i].UpdatedAt = &now
					details[i].IsActive = true

					// Làm sạch và tự động tính tổng hao phí nếu trống
					details[i].ProdQty = cleanNumberStrPtr(details[i].ProdQty)
					details[i].PassQty = cleanNumberStrPtr(details[i].PassQty)
					details[i].DefectQty = cleanNumberStrPtr(details[i].DefectQty)
					details[i].BreakdownMinutes = cleanNumberStrPtr(details[i].BreakdownMinutes)
					details[i].WaitingMaterialMinutes = cleanNumberStrPtr(details[i].WaitingMaterialMinutes)
					details[i].SetupMinutes = cleanNumberStrPtr(details[i].SetupMinutes)
					details[i].RepairMinutes = cleanNumberStrPtr(details[i].RepairMinutes)
					details[i].TotalWasteMinutes = cleanNumberStrPtr(details[i].TotalWasteMinutes)

					if details[i].TotalWasteMinutes == nil || strings.TrimSpace(*details[i].TotalWasteMinutes) == "" || *details[i].TotalWasteMinutes == "0" {
						bd := parseNumberHelper(details[i].BreakdownMinutes)
						wm := parseNumberHelper(details[i].WaitingMaterialMinutes)
						st := parseNumberHelper(details[i].SetupMinutes)
						rp := parseNumberHelper(details[i].RepairMinutes)
						sum := bd + wm + st + rp
						if sum > 0 {
							sumStr := fmt.Sprintf("%.1f", sum)
							sumStr = strings.TrimSuffix(sumStr, ".0")
							details[i].TotalWasteMinutes = &sumStr
						}
					}
				}
				if err := tx.CreateInBatches(details, 500).Error; err != nil {
					return fmt.Errorf("lỗi khi lưu %d dòng chi tiết TKSX: %w", len(details), err)
				}
			}
		} else {
			if len(req.PlanData) > 0 {
				details := make([]models.ERPPlanDetail, len(req.PlanData))
				for i, item := range req.PlanData {
					details[i] = item
					if details[i].IdSeq == "" {
						details[i].IdSeq = services.GenerateUUIDv7()
					}
					details[i].MasterSeq = masterIdSeq
					details[i].RegCode = regCode
					details[i].RowSeq = i + 1
					details[i].WorkingTag = "A"
					details[i].RowVersion = 1
					details[i].CreatedBy = &userId
					details[i].CreatedByName = &userName
					details[i].UpdatedBy = &userId
					details[i].UpdatedByName = &userName
					details[i].CreatedAt = &now
					details[i].UpdatedAt = &now
					details[i].IsActive = true
				}
				if err := tx.CreateInBatches(details, 500).Error; err != nil {
					return fmt.Errorf("lỗi khi lưu %d dòng chi tiết KHSX: %w", len(details), err)
				}
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lưu đăng ký báo cáo thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lưu thành công đăng ký báo cáo!",
		"data":    createdMaster,
	})
}

// PlanMasterD - Xóa đợt đăng ký Master (tự động xóa data ở cả 2 bảng detail bằng MasterSeq)
func (h *PlanMasterHandler) PlanMasterD(c *gin.Context) {
	var req struct {
		MasterSeqs []string `json:"masterSeqs"`
		IdSeq      string   `json:"idSeq"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	seqs := req.MasterSeqs
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
		userId = "SystemAdmin"
	}

	if err := h.masterSvc.PlanMasterD(c.Request.Context(), seqs, userId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Xóa đăng ký thất bại: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa thành công đợt đăng ký!",
	})
}

func cleanNumberStrPtr(ptr *string) *string {
	if ptr == nil {
		return nil
	}
	s := strings.TrimSpace(*ptr)
	if s == "" {
		return ptr
	}
	s = strings.ReplaceAll(s, " ", "")
	if strings.Contains(s, ".") && strings.Contains(s, ",") {
		lastDot := strings.LastIndex(s, ".")
		lastComma := strings.LastIndex(s, ",")
		if lastComma > lastDot {
			s = strings.ReplaceAll(s, ".", "")
			s = strings.ReplaceAll(s, ",", ".")
		} else {
			s = strings.ReplaceAll(s, ",", "")
		}
	} else if strings.Contains(s, ".") {
		parts := strings.Split(s, ".")
		if len(parts) > 2 {
			s = strings.Join(parts, "")
		} else if len(parts) == 2 && len(parts[1]) == 3 && len(parts[0]) >= 1 {
			s = parts[0] + parts[1]
		}
	} else if strings.Contains(s, ",") {
		parts := strings.Split(s, ",")
		if len(parts) > 2 {
			s = strings.Join(parts, "")
		} else if len(parts) == 2 {
			if len(parts[1]) == 3 && len(parts[0]) >= 1 {
				s = parts[0] + parts[1]
			} else {
				s = parts[0] + "." + parts[1]
			}
		}
	}
	return &s
}

func parseNumberHelper(ptr *string) float64 {
	if ptr == nil || strings.TrimSpace(*ptr) == "" {
		return 0
	}
	s := strings.TrimSpace(*ptr)
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, ",", ".")
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return val
}
