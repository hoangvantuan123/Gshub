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
		// Tìm các master cũ có cùng RegCode hoặc cùng (FactoryCode + ReportType + ApplyDate) để cập nhật / ghi đè dữ liệu mới nhất
		var existingMasters []models.ERPPlanMaster
		if reportType == "statistics" || reportType == "tksx" {
			tx.Where(`"RegCode" = ? OR ("FactoryCode" = ? AND ("ReportType" = 'statistics' OR "ReportType" = 'tksx') AND "ApplyDate" = ?)`, regCode, req.FactoryCode, req.ApplyDate).Find(&existingMasters)
		} else {
			tx.Where(`"RegCode" = ? OR ("FactoryCode" = ? AND ("ReportType" = 'plan' OR "ReportType" = 'khsx') AND "ApplyDate" = ?)`, regCode, req.FactoryCode, req.ApplyDate).Find(&existingMasters)
		}
		for _, em := range existingMasters {
			// Xóa các detail cũ tương ứng
			tx.Where(`"MasterSeq" = ? OR "RegCode" = ?`, em.IdSeq, em.RegCode).Delete(&models.ERPProdStatsDetail{})
			tx.Where(`"MasterSeq" = ? OR "RegCode" = ?`, em.IdSeq, em.RegCode).Delete(&models.ERPPlanDetail{})
			tx.Where(`"IdSeq" = ?`, em.IdSeq).Delete(&models.ERPPlanMaster{})
		}

		now := time.Now()
		masterIdSeq := services.GenerateUUIDv7()

		rowVer := int64(1)
		vStr := strings.TrimSpace(req.Version)
		if vStr == "" {
			vStr = strings.TrimSpace(req.CalcVersion)
		}
		if vStr != "" {
			vClean := strings.TrimPrefix(strings.TrimPrefix(vStr, "v"), "V")
			if vFloat, err := strconv.ParseFloat(vClean, 64); err == nil && vFloat > 0 {
				rowVer = int64(vFloat * 10)
			}
		}

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
			RowVersion:    rowVer,
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

					// Tự động kiểm tra và ánh xạ bù toàn bộ các trường nếu gửi qua SheetData hoặc Data
					if len(req.SheetData) > i && req.SheetData[i] != nil {
						fillProdStatsDetailFromRawMap(&details[i], req.SheetData[i])
					} else if len(req.Data) > i && req.Data[i] != nil {
						fillProdStatsDetailFromRawMap(&details[i], req.Data[i])
					}

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

					// Tự động kiểm tra và ánh xạ bù toàn bộ các trường nếu gửi qua SheetData hoặc Data
					if len(req.SheetData) > i && req.SheetData[i] != nil {
						fillPlanDetailFromRawMap(&details[i], req.SheetData[i])
					} else if len(req.Data) > i && req.Data[i] != nil {
						fillPlanDetailFromRawMap(&details[i], req.Data[i])
					}

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

func normalizeGoKey(s string) string {
	s = RemoveVietnameseAccents(s)
	s = strings.ToLower(s)
	var sb strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

func getFieldFromMap(m map[string]interface{}, aliases []string) *string {
	if len(m) == 0 {
		return nil
	}
	for _, a := range aliases {
		if val, ok := m[a]; ok && val != nil {
			str := strings.TrimSpace(fmt.Sprintf("%v", val))
			if str != "" && str != "<nil>" {
				return &str
			}
		}
	}
	normMap := make(map[string]string, len(m))
	for k, v := range m {
		if v != nil {
			str := strings.TrimSpace(fmt.Sprintf("%v", v))
			if str != "" && str != "<nil>" {
				normMap[normalizeGoKey(k)] = str
			}
		}
	}
	for _, a := range aliases {
		normA := normalizeGoKey(a)
		if str, ok := normMap[normA]; ok {
			return &str
		}
	}
	return nil
}

func fillProdStatsDetailFromRawMap(d *models.ERPProdStatsDetail, m map[string]interface{}) {
	if len(m) == 0 {
		return
	}
	setIfEmpty := func(field **string, aliases []string) {
		if *field == nil || strings.TrimSpace(**field) == "" {
			if val := getFieldFromMap(m, aliases); val != nil {
				*field = val
			}
		}
	}

	setIfEmpty(&d.ItemCode, []string{"ItemCode", "itemCode", "MaterialCode", "materialCode", "ProductCode", "productCode", "Mã vật tư", "Mã SP", "Mã hàng", "item_code"})
	setIfEmpty(&d.ItemName, []string{"ItemName", "itemName", "MaterialName", "materialName", "ProductName", "productName", "Tên vật tư", "Tên sản phẩm", "Tên hàng", "item_name"})
	setIfEmpty(&d.Version, []string{"Version", "version", "Phiên bản", "Ver", "ver"})
	setIfEmpty(&d.Model, []string{"Model", "model", "Kiểu dáng", "kieu dang"})
	setIfEmpty(&d.DefectMarginWeight, []string{"DefectMarginWeight", "defectMarginWeight", "ProductNgWeight", "productNgWeight", "Trọng lượng Sp/lề NG", "Trọng lượng SP NG", "Trọng lượng lề NG", "TL SP NG", "TL NG", "Trọng lượng Sp lề NG"})
	setIfEmpty(&d.TechMarginWeight, []string{"TechMarginWeight", "techMarginWeight", "TechnicalMarginWeight", "technicalMarginWeight", "Trọng lượng lề kỹ thuật", "TL lề KT", "Trọng lượng lề KT", "TL KT"})
	setIfEmpty(&d.OperationNo, []string{"OperationNo", "operationNo", "OperationOrderNo", "operationOrderNo", "Số lệnh thao tác", "Số lệnh TT", "Mã lệnh thao tác", "Lệnh thao tác", "Số LTT"})
	setIfEmpty(&d.MainWorker, []string{"MainWorker", "mainWorker", "LeadTechnicianName", "leadTechnicianName", "Thợ chính", "Họ tên thợ chính", "Thợ chính - Họ tên", "Họ tên", "Họ và tên"})
	setIfEmpty(&d.SubWorker1, []string{"SubWorker1", "subWorker1", "AssistantWorker1Name", "assistantWorker1Name", "Thợ phụ 1", "Họ tên thợ phụ 1", "Thợ phụ 1 - Họ tên", "Họ tên_1", "Họ tên 1"})
	setIfEmpty(&d.SubWorker2, []string{"SubWorker2", "subWorker2", "AssistantWorker2Name", "assistantWorker2Name", "Thợ phụ 2", "Họ tên thợ phụ 2", "Thợ phụ 2 - Họ tên", "Họ tên_2", "Họ tên 2"})
	setIfEmpty(&d.BreakdownReason, []string{"BreakdownReason", "breakdownReason", "MachineBreakdownReason", "machineBreakdownReason", "Nguyên nhân hỏng máy", "Lý do hỏng máy", "Nguyên nhân sự cố"})
	setIfEmpty(&d.MachineCode, []string{"MachineCode", "machineCode", "Mã máy sản xuất", "Mã máy", "MachineID", "machine_code"})
	setIfEmpty(&d.MachineName, []string{"MachineName", "machineName", "Tên máy sản xuất", "Tên máy", "Máy sản xuất", "machine_name"})
	setIfEmpty(&d.OpTypeCode, []string{"OpTypeCode", "opTypeCode", "OperationTypeCode", "operationTypeCode", "Mã phân loại thao tác", "Mã loại thao tác", "op_type_code"})
	setIfEmpty(&d.OpTypeName, []string{"OpTypeName", "opTypeName", "OperationTypeName", "operationTypeName", "Phân loại thao tác", "Tên phân loại thao tác", "op_type_name"})
	setIfEmpty(&d.UvPlate, []string{"UvPlate", "uvPlate", "Kẽm UV", "Bản UV", "Bản kẽm UV"})
	setIfEmpty(&d.MoldSetQty1, []string{"MoldSetQty1", "moldSetQty1", "MoldSetupQty1", "moldSetupQty1", "SL lên khuôn 1", "Số lượng lên khuôn 1", "Lên khuôn 1"})
	setIfEmpty(&d.MoldSetQty2, []string{"MoldSetQty2", "moldSetQty2", "MoldSetupQty2", "moldSetupQty2", "SL lên khuôn 2", "Số lượng lên khuôn 2", "Lên khuôn 2"})
	setIfEmpty(&d.MoldSetQty3, []string{"MoldSetQty3", "moldSetQty3", "MoldSetupQty3", "moldSetupQty3", "SL lên khuôn 3", "Số lượng lên khuôn 3", "Lên khuôn 3"})
	setIfEmpty(&d.ProdQty, []string{"ProdQty", "prodQty", "ProducedQty", "producedQty", "Số lượng sản xuất", "SL sản xuất", "SL SX", "SanLuongSX", "Số lượng thực hiện"})
	setIfEmpty(&d.PassQty, []string{"PassQty", "passQty", "QualifiedQty", "qualifiedQty", "Số lượng đạt", "SL đạt", "SanLuongDat", "SL thành phẩm"})
	setIfEmpty(&d.ActualMeters, []string{"ActualMeters", "actualMeters", "ActualPassMeters", "actualPassMeters", "Số mét thực tế", "Số mét TT", "Mét thực tế"})
	setIfEmpty(&d.StandardMeters, []string{"StandardMeters", "standardMeters", "StandardPlanMeters", "standardPlanMeters", "Số mét định mức", "Số mét ĐM", "Mét định mức"})
	setIfEmpty(&d.TeamName, []string{"TeamName", "teamName", "ProductionTeam", "productionTeam", "Tổ sản xuất", "Tổ SX", "TenTo"})
	setIfEmpty(&d.Shift, []string{"Shift", "shift", "ProductionShift", "productionShift", "Ca sản xuất", "Ca SX", "Ca", "Ca làm việc"})
	setIfEmpty(&d.StartTime, []string{"StartTime", "startTime", "StartProductionTime", "startProductionTime", "Bắt đầu", "Giờ bắt đầu", "Thời gian bắt đầu", "GioBD"})
	setIfEmpty(&d.EndTime, []string{"EndTime", "endTime", "EndProductionTime", "endProductionTime", "Kết thúc", "Giờ kết thúc", "Thời gian kết thúc", "GioKT"})
	setIfEmpty(&d.StartDate, []string{"StartDate", "startDate", "StartProductionDate", "startProductionDate", "Ngày bắt đầu", "NgayBD"})
	setIfEmpty(&d.EndDate, []string{"EndDate", "endDate", "EndProductionDate", "endProductionDate", "Ngày kết thúc", "NgayKT"})
	setIfEmpty(&d.StatDate, []string{"StatDate", "statDate", "StatisticsDate", "statisticsDate", "Ngày thống kê", "NgayTK"})
	setIfEmpty(&d.StatTicketNo, []string{"StatTicketNo", "statTicketNo", "StatSlipNo", "statSlipNo", "BravoStatTicketNo", "bravoStatTicketNo", "BravoStatCode", "bravoStatCode", "Số phiếu thống kê", "Mã lệnh thống kê Bravo", "Số phiếu TK", "Phiếu TK", "Phiếu thống kê"})
	setIfEmpty(&d.StatStaff, []string{"StatStaff", "statStaff", "StatEmployee", "statEmployee", "Nhân viên thống kê", "NV thống kê", "Người thống kê"})
	setIfEmpty(&d.Customer, []string{"Customer", "customer", "CustomerName", "customerName", "Khách hàng", "Tên khách hàng", "KH"})
	setIfEmpty(&d.SalesStaff, []string{"SalesStaff", "salesStaff", "SalesPerson", "salesPerson", "Nhân viên kinh doanh", "NV kinh doanh", "NVKD", "Sales"})
	setIfEmpty(&d.OrderNo, []string{"OrderNo", "orderNo", "OrderDocNo", "orderDocNo", "SoNo", "soNo", "Số đơn hàng", "Đơn hàng", "Mã đơn hàng", "Số SO"})
	setIfEmpty(&d.ProcessName, []string{"ProcessName", "processName", "StageCode", "stageCode", "WorkProcessName", "workProcessName", "Công đoạn", "Tên công đoạn", "Mã công đoạn"})
	setIfEmpty(&d.Unit, []string{"Unit", "unit", "UnitOfMeasure", "unitOfMeasure", "Đvt", "Đơn vị tính", "ĐVT", "Đơn vị"})
	setIfEmpty(&d.ConvUnit, []string{"ConvUnit", "convUnit", "ConvertUnit", "convertUnit", "ConversionUnit", "conversionUnit", "Đơn vị quy đổi", "ĐV quy đổi"})
	setIfEmpty(&d.ProcessSpec, []string{"ProcessSpec", "processSpec", "ProcessFlow", "processFlow", "ProcessSpecDescription", "processSpecDescription", "QTCN", "Quy trình công nghệ"})
	setIfEmpty(&d.PartNo, []string{"PartNo", "partNo", "PartCount", "partCount", "Số part", "Part"})
	setIfEmpty(&d.CorrugatedPartNo, []string{"CorrugatedPartNo", "corrugatedPartNo", "CorrugatorPartCount", "corrugatorPartCount", "CorrugatedPartCount", "corrugatedPartCount", "Số part sóng", "Part sóng"})
	setIfEmpty(&d.TrimPartNo, []string{"TrimPartNo", "trimPartNo", "CutPartCount", "cutPartCount", "TrimPartCount", "trimPartCount", "Số part xén", "Part xén"})
	setIfEmpty(&d.ColorQty, []string{"ColorQty", "colorQty", "PrintColorCount", "printColorCount", "Số lượng màu in", "Số màu in", "SL màu in"})
	setIfEmpty(&d.OutPlateType, []string{"OutPlateType", "outPlateType", "PlateOutType", "plateOutType", "Loại Out bản", "Loại out bản", "Out bản"})
	setIfEmpty(&d.FrontColors, []string{"FrontColors", "frontColors", "FrontColorCount", "frontColorCount", "FrontPrintColorCount", "frontPrintColorCount", "Số lượng màu in mặt 1", "Màu mặt 1", "In mặt 1"})
	setIfEmpty(&d.BackColors, []string{"BackColors", "backColors", "BackColorCount", "backColorCount", "BackPrintColorCount", "backPrintColorCount", "Số lượng màu in mặt 2", "Màu mặt 2", "In mặt 2"})
	setIfEmpty(&d.JobNumber, []string{"JobNumber", "jobNumber", "JobNo", "jobNo", "Số Job", "Job"})
	setIfEmpty(&d.Width, []string{"Width", "width", "RollWidth", "rollWidth", "ProductWidth", "productWidth", "Rộng/ khổ cuộn", "Khổ rộng", "Rộng", "Chiều rộng"})
	setIfEmpty(&d.Length, []string{"Length", "length", "CutLength", "cutLength", "ProductLength", "productLength", "Dài/ chiều chặt", "Chiều dài", "Dài"})
	setIfEmpty(&d.Height, []string{"Height", "height", "ProductHeight", "productHeight", "Cao", "Chiều cao"})
	setIfEmpty(&d.ProductLine, []string{"ProductLine", "productLine", "Dòng hàng", "Dòng SP", "Ngành hàng"})
	setIfEmpty(&d.RawWidth, []string{"RawWidth", "rawWidth", "RawMaterialWidth", "rawMaterialWidth", "Rộng/ khổ cuộn NVL", "Khổ rộng NVL", "Rộng NVL"})
	setIfEmpty(&d.RawLength, []string{"RawLength", "rawLength", "RawMaterialLength", "rawMaterialLength", "Dài/ chiều chặt NVL", "Chiều dài NVL", "Dài NVL"})
	setIfEmpty(&d.RawLineCode, []string{"RawLineCode", "rawLineCode", "RawMaterialLineCode", "rawMaterialLineCode", "Mã dòng hàng NVL", "Mã dòng NVL", "Mã NVL"})
	setIfEmpty(&d.RawLineName, []string{"RawLineName", "rawLineName", "RawMaterialLineName", "rawMaterialLineName", "Dòng hàng NVL", "Dòng NVL", "Tên NVL"})
	setIfEmpty(&d.FlipType, []string{"FlipType", "flipType", "TurnType", "turnType", "Kiểu trở", "Kiểu lật", "Trở đầu đuôi"})
	setIfEmpty(&d.BomPlates, []string{"BomPlates", "bomPlates", "BomPlateQty", "bomPlateQty", "ZincPlateCount", "zincPlateCount", "Số lượng kẽm theo BOM", "Số lượng kẽm", "SL kẽm", "Kẽm theo BOM"})
	setIfEmpty(&d.Coating, []string{"Coating", "coating", "CoatingType", "coatingType", "Phủ", "Phủ bóng/ mờ", "Phủ màng", "Phủ UV"})
	setIfEmpty(&d.SlitterBlades, []string{"SlitterBlades", "slitterBlades", "SlitterKnifeCount", "slitterKnifeCount", "BladeCount", "bladeCount", "Số dao chia", "Số lượng dao xén", "Số dao xén", "Dao xén", "Dao chia"})
	setIfEmpty(&d.CodePositions, []string{"CodePositions", "codePositions", "CodeGunPositionCount", "codeGunPositionCount", "BarcodePosition", "barcodePosition", "Số vị trí bắn code", "Vị trí ghi mã", "Vị trí mã", "Bắn code"})
	setIfEmpty(&d.PunchHoles, []string{"PunchHoles", "punchHoles", "PunchHoleCount", "punchHoleCount", "HolePunchCount", "holePunchCount", "Số lỗ đột", "Số lượng lỗ đột", "Lỗ đột"})
	setIfEmpty(&d.StructureCode, []string{"StructureCode", "structureCode", "StructureTypeCode", "structureTypeCode", "Mã loại kết cầu", "Mã loại kết cấu", "Mã kết cấu", "Mã KC"})
	setIfEmpty(&d.StructureName, []string{"StructureName", "structureName", "StructureTypeName", "structureTypeName", "Tên loại kết cầu", "Tên loại kết cấu", "Tên kết cấu", "Tên KC", "Kết cấu"})
	setIfEmpty(&d.RoutingDocNo, []string{"RoutingDocNo", "routingDocNo", "StageOrderNo", "stageOrderNo", "Số lệnh công đoạn", "Lệnh công đoạn", "Số lệnh CĐ", "Số LCD", "LCD"})
	setIfEmpty(&d.RoutingDate, []string{"RoutingDate", "routingDate", "StageOrderDate", "stageOrderDate", "StageOrderReleaseDate", "stageOrderReleaseDate", "RoutingDocDate", "routingDocDate", "Ngày lệnh công đoạn", "Ngày phát hành lệnh CĐ", "Ngày tạo lệnh công đoạn", "Ngày lệnh CĐ"})
	setIfEmpty(&d.ReleaseDate, []string{"ReleaseDate", "releaseDate", "OpOrderReleaseDate", "opOrderReleaseDate", "OperationReleaseDate", "operationReleaseDate", "Ngày phát hành lệnh TT", "Ngày phát hành lệnh thao tác", "Ngày phát hành lệnh", "Ngày PH lệnh TT", "Người phát hành lệnh thao tác"})
	setIfEmpty(&d.TargetPassQty, []string{"TargetPassQty", "targetPassQty", "StageTargetQty", "stageTargetQty", "OpTargetQty", "opTargetQty", "PlanQualifiedQty", "planQualifiedQty", "SL cần đạt (TT)", "SL cần đạt (CĐ)", "Số lượng cần đạt", "SL cần đạt", "Số lượng đạt Kế hoạch", "SL đạt KH"})
	setIfEmpty(&d.TargetProdQty, []string{"TargetProdQty", "targetProdQty", "StagePlannedQty", "stagePlannedQty", "OpPlannedQty", "opPlannedQty", "PlanProducedQty", "planProducedQty", "SL cần sản xuất (TT)", "SL cần sản xuất (CĐ)", "Số lượng cần sản xuất", "SL cần sản xuất", "Số lượng sản xuất Kế hoạch", "SL SX KH"})
	setIfEmpty(&d.RoutingUnit, []string{"RoutingUnit", "routingUnit", "OpUnit", "opUnit", "RoutingUom", "routingUom", "Đvt công đoạn", "Đơn vị tính công đoạn", "ĐVT công đoạn", "Đvt"})
	setIfEmpty(&d.BreakdownMinutes, []string{"BreakdownMinutes", "breakdownMinutes", "DowntimeBreakdownMinutes", "downtimeBreakdownMinutes", "BreakdownLossTime", "breakdownLossTime", "TG hỏng máy/mất điện (phút) (01)", "TG hỏng máy/mất điện (01)", "TG hỏng máy/mất điện", "TG hỏng máy", "Thời gian hỏng máy", "Hỏng máy mất điện"})
	setIfEmpty(&d.WaitingMaterialMinutes, []string{"WaitingMaterialMinutes", "waitingMaterialMinutes", "DowntimeWaitingMaterialMinutes", "downtimeWaitingMaterialMinutes", "WaitingMaterialLossTime", "waitingMaterialLossTime", "Tg chờ NVL (phút) (02)", "Tg chờ NVL (02)", "Tg chờ NVL", "TG chờ NVL", "Thời gian chờ NVL", "Chờ NVL"})
	setIfEmpty(&d.SetupMinutes, []string{"SetupMinutes", "setupMinutes", "DowntimeSetupMinutes", "downtimeSetupMinutes", "SetupLossTime", "setupLossTime", "Tg chuẩn bị (phút) (03)", "Tg chuẩn bị (03)", "Tg chuẩn bị", "TG chuẩn bị", "Thời gian lên khuôn", "TG lên khuôn", "Chuẩn bị"})
	setIfEmpty(&d.RepairMinutes, []string{"RepairMinutes", "repairMinutes", "DowntimeFixingMinutes", "downtimeFixingMinutes", "RepairLossTime", "repairLossTime", "TG sửa file/khuôn/bản (phút) (04)", "TG sửa file/khuôn/bản (04)", "TG sửa file/khuôn/bản", "TG sửa chữa", "Thời gian sửa chữa", "Sửa file/khuôn/bản"})
	setIfEmpty(&d.TotalWasteMinutes, []string{"TotalWasteMinutes", "totalWasteMinutes", "TotalDowntimeMinutes", "totalDowntimeMinutes", "TotalLossTime", "totalLossTime", "Tổng tg hao phí (5)=1+2+3+4", "Tổng tg hao phí (5)", "Tổng tg hao phí", "Tổng thời gian hao phí", "Tổng TG hao phí", "Tổng hao phí", "Tổng tg lãng phí"})
	setIfEmpty(&d.RigidBoxGlue, []string{"RigidBoxGlue", "rigidBoxGlue", "LaminationBoxSplit", "laminationBoxSplit", "RigidBoxGlueType", "rigidBoxGlueType", "Bồi chia hộp cứng", "Bồi hộp cứng", "Loại keo hộp cứng", "Keo hộp cứng"})
	setIfEmpty(&d.Outsourcing, []string{"Outsourcing", "outsourcing", "OutsourceProcess", "outsourceProcess", "Gia công", "Gia công ngoài", "GC ngoài"})
	setIfEmpty(&d.DefectQty, []string{"DefectQty", "defectQty", "DefectiveQty", "defectiveQty", "Số lượng lỗi", "SL lỗi", "SL NG", "Số lượng NG"})
	setIfEmpty(&d.DefectRate, []string{"DefectRate", "defectRate", "NgRate", "ngRate", "DefectiveRate", "defectiveRate", "Tỷ lệ NG", "Tỷ lệ lỗi", "Tỉ lệ lỗi", "Tỉ lệ NG"})
	setIfEmpty(&d.DefectUnit, []string{"DefectUnit", "defectUnit", "QualityUnit", "qualityUnit", "DefectUom", "defectUom", "Đvt chất lượng", "Đơn vị tính lỗi", "ĐVT lỗi", "ĐVT chất lượng", "Đvt"})
	setIfEmpty(&d.Status, []string{"Status", "status", "OperationStatus", "operationStatus", "Trạng thái", "Trạng thái thao tác", "Tình trạng"})
	setIfEmpty(&d.AutoExport, []string{"AutoExport", "autoExport", "IsAutoExport", "isAutoExport", "AutoWarehouseExport", "autoWarehouseExport", "Xuất tự động", "Tự động xuất", "Tự động xuất kho"})
	setIfEmpty(&d.AutoImport, []string{"AutoImport", "autoImport", "IsAutoImport", "isAutoImport", "AutoWarehouseImport", "autoWarehouseImport", "Nhập tự động", "Tự động nhập", "Tự động nhập kho"})
	setIfEmpty(&d.ExportDocNo, []string{"ExportDocNo", "exportDocNo", "ExportSlipNo", "exportSlipNo", "ExportWarehouseSlipNo", "exportWarehouseSlipNo", "Số phiếu xuất", "Phiếu xuất", "Phiếu xuất kho", "Số phiếu xuất kho"})
	setIfEmpty(&d.ImportDocNo, []string{"ImportDocNo", "importDocNo", "ImportSlipNo", "importSlipNo", "ImportWarehouseSlipNo", "importWarehouseSlipNo", "Số phiếu nhập", "Phiếu nhập", "Phiếu nhập kho", "Số phiếu nhập kho"})
	setIfEmpty(&d.WrongOpCode, []string{"WrongOpCode", "wrongOpCode", "IsWrongOpCode", "isWrongOpCode", "MisroutedOpCode", "misroutedOpCode", "Sai mã thao tác", "Sai công đoạn", "Lỗi sai CĐ"})
	setIfEmpty(&d.IsAdditionalStat, []string{"IsAdditionalStat", "isAdditionalStat", "IsSupplementaryStat", "isSupplementaryStat", "AdditionalStatNote", "additionalStatNote", "Thống kê bổ sung", "Thống kê bù", "TK bù", "TK bổ sung"})
	setIfEmpty(&d.TicketCreatedDate, []string{"TicketCreatedDate", "ticketCreatedDate", "SlipCreatedDate", "slipCreatedDate", "SlipCreationDate", "slipCreationDate", "Ngày tạo phiếu", "Ngày lập phiếu", "Giờ tạo phiếu"})
	setIfEmpty(&d.ActualRunTime, []string{"ActualRunTime", "actualRunTime", "ActualRunHours", "actualRunHours", "Thời gian chạy thực tế", "Thời gian chạy máy thực tế", "TG chạy máy TT", "Thời gian chạy máy", "TG chạy thực tế"})
	setIfEmpty(&d.ActualCapa, []string{"ActualCapa", "actualCapa", "ActualCapacity", "actualCapacity", "capa thực tế", "Capa thực tế", "Capa TT", "Công suất thực tế"})
	setIfEmpty(&d.CheckPlanStatus, []string{"CheckPlanStatus", "checkPlanStatus", "CheckKhsx", "checkKhsx", "PlanCheckStatus", "planCheckStatus", "CHECK KHSX", "Kiểm tra KHSX", "Kiểm tra KH", "KT KHSX", "Đánh giá KHSX"})
	setIfEmpty(&d.MesApprovalTime, []string{"MesApprovalTime", "mesApprovalTime", "MesApprovedTime", "mesApprovedTime", "Thời gian duyệt phiếu ở MES", "Thời gian duyệt MES", "TG duyệt MES", "Duyệt MES", "Thời gian duyệt ở MES", "Thời gian duyệt"})
	setIfEmpty(&d.SyncDelayMinutes, []string{"SyncDelayMinutes", "syncDelayMinutes", "SyncLatencySeconds", "syncLatencySeconds", "MesSyncDelayHours", "mesSyncDelayHours", "Độ trễ thời gian đồng bộ 2 hệ thống", "Độ trễ thời gian đồng bộ", "Thời gian chậm đồng bộ", "TG chậm đồng bộ", "Độ trễ đồng bộ", "sync_delay_minutes", "do tre thoi gian dong bo 2 he thong", "do tre thoi gian dong bo", "do tre dong bo", "thoi gian cham dong bo", "tg cham dong bo"})
	setIfEmpty(&d.IsDuplicateTicket, []string{"IsDuplicateTicket", "isDuplicateTicket", "IsDuplicateSlip", "isDuplicateSlip", "DuplicateSlipCheck", "duplicateSlipCheck", "Phiếu sinh trùng", "Trùng phiếu", "Kiểm tra trùng phiếu", "Sinh trùng"})
	setIfEmpty(&d.TicketCreationLocation, []string{"TicketCreationLocation", "ticketCreationLocation", "CreatedLocation", "createdLocation", "SlipOrigin", "slipOrigin", "Vị trí tạo phiếu tk", "Nơi lập phiếu", "Nơi tạo phiếu", "Vị trí tạo phiếu"})
	setIfEmpty(&d.AutoIoStatus, []string{"AutoIoStatus", "autoIoStatus", "AutoExportImportGenerated", "autoExportImportGenerated", "Sinh phiếu xuất/nhập tự động", "Trạng thái TĐ nhập xuất", "Trạng thái tự động nhập xuất", "Sinh phiếu xuất nhập tự động"})
	setIfEmpty(&d.UserMemo, []string{"UserMemo", "userMemo", "CalcVersion", "calcVersion", "Version tính toán", "Phiên bản tính toán", "Ghi chú", "Ghi chú người dùng", "Memo"})
}

func fillPlanDetailFromRawMap(d *models.ERPPlanDetail, m map[string]interface{}) {
	if len(m) == 0 {
		return
	}
	setIfEmpty := func(field **string, aliases []string) {
		if *field == nil || strings.TrimSpace(**field) == "" {
			if val := getFieldFromMap(m, aliases); val != nil {
				*field = val
			}
		}
	}

	setIfEmpty(&d.PicDp, []string{"PicDp", "picDp", "PIC_DP", "PIC ĐP", "Người điều phối", "Điều phối", "Người phát hành lệnh thao tác"})
	setIfEmpty(&d.OperationNo, []string{"OperationNo", "operationNo", "Số lệnh thao tác", "Số lệnh TT", "Mã lệnh thao tác"})
	setIfEmpty(&d.OpDate, []string{"OpDate", "opDate", "Ngày thực hiện thao tác", "Ngày thực hiện", "Ngày TT"})
	setIfEmpty(&d.RoutingDocNo, []string{"RoutingDocNo", "routingDocNo", "Số lệnh công đoạn", "Lệnh công đoạn"})
	setIfEmpty(&d.RoutingDocDate, []string{"RoutingDocDate", "routingDocDate", "Ngày tạo lệnh công đoạn", "Ngày lệnh CĐ"})
	setIfEmpty(&d.ItemCode, []string{"ItemCode", "itemCode", "MaterialCode", "materialCode", "Mã vật tư", "Mã hàng", "Mã SP"})
	setIfEmpty(&d.ItemName, []string{"ItemName", "itemName", "MaterialName", "materialName", "Tên vật tư", "Tên hàng", "Tên SP"})
	setIfEmpty(&d.OperationName, []string{"OperationName", "operationName", "Tên công đoạn", "Công đoạn"})
	setIfEmpty(&d.OpTypeName, []string{"OpTypeName", "opTypeName", "Phân loại thao tác"})
	setIfEmpty(&d.MachineName, []string{"MachineName", "machineName", "Tên máy", "Tên máy sản xuất", "Máy sản xuất"})
	setIfEmpty(&d.Unit, []string{"Unit", "unit", "Đvt", "Đơn vị tính", "ĐVT"})
	setIfEmpty(&d.TargetPassQty, []string{"TargetPassQty", "targetPassQty", "Số lượng đạt", "SL đạt", "Số lượng đạt KH"})
	setIfEmpty(&d.TargetProdQty, []string{"TargetProdQty", "targetProdQty", "Số lượng sản xuất", "SL sản xuất"})
	setIfEmpty(&d.StatPassQty, []string{"StatPassQty", "statPassQty", "Số lượng hoàn thành", "SL hoàn thành"})
	setIfEmpty(&d.StartTime, []string{"StartTime", "startTime", "Bắt đầu", "Giờ bắt đầu"})
	setIfEmpty(&d.EndTime, []string{"EndTime", "endTime", "Kết thúc", "Giờ kết thúc"})
	setIfEmpty(&d.StandardProdTime, []string{"StandardProdTime", "standardProdTime", "Thời gian sản xuất định mức", "TG SX định mức"})
	setIfEmpty(&d.ActualProdTime, []string{"ActualProdTime", "actualProdTime", "Thời gian sản xuất thực tế", "TG SX thực tế"})
	setIfEmpty(&d.StandardCapa, []string{"StandardCapa", "standardCapa", "Capa định mức", "Capa ĐM"})
	setIfEmpty(&d.ActualCapa, []string{"ActualCapa", "actualCapa", "Capa thực tế", "Capa TT"})
	setIfEmpty(&d.StatusDpSx, []string{"StatusDpSx", "statusDpSx", "Trạng thái điều phối sx", "Trạng thái ĐP SX"})
	setIfEmpty(&d.TimeStatus, []string{"TimeStatus", "timeStatus", "Đánh giá thời gian", "Thời gian (Đạt/Không đạt)"})
	setIfEmpty(&d.CapaStatus, []string{"CapaStatus", "capaStatus", "Đánh giá capa", "Capa (Đạt/Không đạt)"})
	setIfEmpty(&d.UserMemo, []string{"UserMemo", "userMemo", "Ghi chú"})
}

