package prod_stats_detail

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	models "service-datahub/models/report"
)

type machineDateStat struct {
	runtimeHours float64
	actualQty    float64
	passQty      float64
	planQty      float64
	ticketCount  int
}

// Helper: Lấy giá trị filter không phân biệt chữ hoa/thường
func getFilterValue(filters map[string]string, keys ...string) string {
	for _, k := range keys {
		if v, ok := filters[k]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		if v, ok := filters[strings.ToLower(k)]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		if v, ok := filters[strings.ToUpper(k)]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// Helper: Parse chuỗi số thô sang float64
func parseNumber(val *string, defaultVal float64) float64 {
	if val == nil || strings.TrimSpace(*val) == "" {
		return defaultVal
	}
	s := strings.TrimSpace(*val)
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
	} else if strings.Contains(s, ",") {
		parts := strings.Split(s, ",")
		if len(parts) == 2 && len(parts[1]) == 3 {
			s = parts[0] + parts[1]
		} else {
			s = strings.ReplaceAll(s, ",", ".")
		}
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return defaultVal
	}
	return n
}

// Helper: Tính số phút chạy máy từ StartTime/EndTime hoặc chuỗi ActualRunTime
func calcDurationMinutes(actualRunTime, startTime, endTime *string) float64 {
	// 1. Nếu có cả StartTime và EndTime: ưu tiên tính toán trực tiếp
	if startTime != nil && endTime != nil && strings.TrimSpace(*startTime) != "" && strings.TrimSpace(*endTime) != "" {
		sStr := strings.TrimSpace(*startTime)
		eStr := strings.TrimSpace(*endTime)

		// Thử parse Date ISO
		sTime, errS := time.Parse(time.RFC3339, sStr)
		eTime, errE := time.Parse(time.RFC3339, eStr)
		if errS == nil && errE == nil && !eTime.Before(sTime) {
			diffMin := eTime.Sub(sTime).Minutes()
			if diffMin >= 0 && diffMin <= 1440 {
				return math.Round(diffMin*10) / 10
			}
		}

		// Parse format time HH:mm:ss
		if strings.Contains(sStr, ":") && strings.Contains(eStr, ":") {
			sParts := strings.Split(strings.TrimSpace(strings.Split(sStr, " ")[len(strings.Split(sStr, " "))-1]), ":")
			eParts := strings.Split(strings.TrimSpace(strings.Split(eStr, " ")[len(strings.Split(eStr, " "))-1]), ":")

			var sMin, eMin float64
			if len(sParts) >= 1 {
				h, _ := strconv.ParseFloat(sParts[0], 64)
				sMin += h * 60
			}
			if len(sParts) >= 2 {
				m, _ := strconv.ParseFloat(sParts[1], 64)
				sMin += m
			}
			if len(sParts) >= 3 {
				s, _ := strconv.ParseFloat(sParts[2], 64)
				sMin += s / 60
			}

			if len(eParts) >= 1 {
				h, _ := strconv.ParseFloat(eParts[0], 64)
				eMin += h * 60
			}
			if len(eParts) >= 2 {
				m, _ := strconv.ParseFloat(eParts[1], 64)
				eMin += m
			}
			if len(eParts) >= 3 {
				s, _ := strconv.ParseFloat(eParts[2], 64)
				eMin += s / 60
			}

			diff := eMin - sMin
			if diff < 0 {
				diff += 1440 // Chạy xuyên đêm qua ngày hôm sau
			}
			if diff >= 0 && diff <= 1440 {
				return math.Round(diff*10) / 10
			}
		}
	}

	// 2. Nếu có chuỗi ActualRunTime
	if actualRunTime != nil && strings.TrimSpace(*actualRunTime) != "" {
		s := strings.TrimSpace(strings.ReplaceAll(*actualRunTime, ",", "."))
		if strings.Contains(s, ":") {
			parts := strings.Split(s, ":")
			var hrs float64
			if len(parts) >= 1 {
				if h, err := strconv.ParseFloat(parts[0], 64); err == nil {
					hrs += h
				}
			}
			if len(parts) >= 2 {
				if m, err := strconv.ParseFloat(parts[1], 64); err == nil {
					hrs += m / 60.0
				}
			}
			return math.Round((hrs*60.0)*10) / 10
		}
		if v, err := strconv.ParseFloat(s, 64); err == nil && v >= 0 {
			return math.Round(v*10) / 10
		}
	}
	return 0
}

// Helper: Parse nhiều định dạng DateTime khác nhau
func parseAnyDateTime(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("empty time string")
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02 15:04:05.000",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05.000",
		"2006-01-02 15:04",
		"02/01/2006 15:04:05",
		"02/01/2006 15:04",
		"2006/01/02 15:04:05",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("cannot parse time: %s", s)
}

// Helper: Phân tích độ trễ đồng bộ sang giây
func parseSyncDelaySeconds(syncDelay, ticketCreatedDate, mesApprovalTime *string) (float64, bool) {
	if mesApprovalTime != nil && ticketCreatedDate != nil && strings.TrimSpace(*mesApprovalTime) != "" && strings.TrimSpace(*ticketCreatedDate) != "" {
		tMes, errM := parseAnyDateTime(*mesApprovalTime)
		tCre, errC := parseAnyDateTime(*ticketCreatedDate)
		if errM == nil && errC == nil && !tMes.Before(tCre) {
			sec := tMes.Sub(tCre).Seconds()
			if sec >= 0 && sec <= 86400 {
				return sec, true
			}
		}
	}

	if syncDelay != nil && strings.TrimSpace(*syncDelay) != "" {
		s := strings.TrimSpace(strings.ToLower(*syncDelay))
		if s == "null" || s == "undefined" || s == "-" {
			return 0, false
		}
		if strings.Contains(s, ":") {
			parts := strings.Split(s, ":")
			var totalSec float64
			if len(parts) == 3 {
				h, _ := strconv.ParseFloat(parts[0], 64)
				m, _ := strconv.ParseFloat(parts[1], 64)
				sec, _ := strconv.ParseFloat(parts[2], 64)
				totalSec = h*3600 + m*60 + sec
			} else if len(parts) == 2 {
				m, _ := strconv.ParseFloat(parts[0], 64)
				sec, _ := strconv.ParseFloat(parts[1], 64)
				totalSec = m*60 + sec
			}
			return totalSec, true
		}
		if strings.Contains(s, "phút") || strings.Contains(s, "min") || strings.HasSuffix(s, "p") || strings.HasSuffix(s, "m") {
			cleanStr := strings.TrimRight(strings.TrimSpace(s), "phútmin pm")
			if num, err := strconv.ParseFloat(cleanStr, 64); err == nil && num >= 0 {
				return num * 60, true
			}
		}
		if strings.Contains(s, "giây") || strings.Contains(s, "sec") || strings.HasSuffix(s, "s") || strings.HasSuffix(s, "g") {
			cleanStr := strings.TrimRight(strings.TrimSpace(s), "giâysec sg")
			if num, err := strconv.ParseFloat(cleanStr, 64); err == nil && num >= 0 {
				return num, true
			}
		}
		if num, err := strconv.ParseFloat(s, 64); err == nil && num >= 0 {
			return num, true
		}
	}
	return 0, false
}

// Helper: Format giây sang HH:mm:ss
func formatSecondsToTime(totalSec float64) string {
	if totalSec < 0 || math.IsNaN(totalSec) {
		return "00:00:00"
	}
	rounded := int64(math.Round(totalSec))
	h := rounded / 3600
	m := (rounded % 3600) / 60
	s := rounded % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

// Helper: Kiểm tra máy thủ công
func isManualMachine(name, code string) bool {
	combined := strings.ToLower(name + " " + code)
	return strings.Contains(combined, "thủ công") || strings.Contains(combined, "thu cong")
}

// Helper: Kiểm tra trạng thái chứng từ tự động
func isPassAutoIo(label string) bool {
	s := strings.ToLower(label)
	if isNoMaterialAutoIo(label) || isMissingAutoIo(label) {
		return false
	}
	return strings.Contains(s, "có xktđ") || strings.Contains(s, "co xktd") ||
		strings.Contains(s, "có nktđ") || strings.Contains(s, "co nktd") ||
		strings.Contains(s, "đã sinh") || strings.Contains(s, "da sinh")
}

func isMissingAutoIo(label string) bool {
	if isNoMaterialAutoIo(label) {
		return false
	}
	s := strings.ToLower(label)
	return strings.Contains(s, "không có xktđ") || strings.Contains(s, "khong co xktd") ||
		strings.Contains(s, "không có nktđ") || strings.Contains(s, "khong co nktd") ||
		strings.Contains(s, "thiếu xktđ") || strings.Contains(s, "thiếu nktđ") ||
		strings.Contains(s, "chưa có xktđ") || strings.Contains(s, "chưa có nktđ") ||
		strings.Contains(s, "không có") || strings.Contains(s, "chưa sinh")
}

func isNoMaterialAutoIo(label string) bool {
	s := strings.ToLower(label)
	return strings.Contains(s, "không sử dụng nvl") || strings.Contains(s, "khong su dung nvl") ||
		strings.Contains(s, "không dùng nvl") || strings.Contains(s, "không sd nvl") ||
		strings.Contains(s, "không sử dụng nguyên vật liệu")
}

// GenerateProductionStatisticsReport: API chính tính toán và tổng hợp báo cáo TKSX
func (s *ProdStatsDetailService) GenerateProductionStatisticsReport(ctx context.Context, filters map[string]string) (*models.ProdStatsReportResponse, error) {
	regCode := getFilterValue(filters, "regCode", "RegCode", "reg_code", "Reg_Code")
	masterSeq := getFilterValue(filters, "masterSeq", "MasterSeq", "master_seq")
	factoryCode := getFilterValue(filters, "factoryCode", "FactoryCode", "factory_code", "plantCode", "PlantCode")
	statDateFrom := getFilterValue(filters, "statDateFrom", "StatDateFrom", "stat_date_from", "fromDate", "FromDate", "dateFrom", "DateFrom", "from_date", "date_from")
	statDateTo := getFilterValue(filters, "statDateTo", "StatDateTo", "stat_date_to", "toDate", "ToDate", "dateTo", "DateTo", "to_date", "date_to")
	fromTime := getFilterValue(filters, "fromTime", "FromTime", "startTime", "StartTime", "from_time", "start_time")
	toTime := getFilterValue(filters, "toTime", "ToTime", "endTime", "EndTime", "to_time", "end_time")
	teamName := getFilterValue(filters, "teamName", "TeamName", "team_name", "team", "Team", "opTypeName", "OpTypeName")
	machineCode := getFilterValue(filters, "machineCode", "MachineCode", "machine_code", "machine", "Machine", "machineName", "MachineName")
	shift := getFilterValue(filters, "shift", "Shift", "shiftName", "ShiftName")
	itemCode := getFilterValue(filters, "itemCode", "ItemCode", "item_code")
	orderNo := getFilterValue(filters, "orderNo", "OrderNo", "order_no")
	status := getFilterValue(filters, "status", "Status", "statusDpSx", "StatusDpSx")

	query := s.db.WithContext(ctx).Model(&models.ERPProdStatsDetail{})

	// 1. Áp dụng điều kiện RegCode / MasterSeq (sử dụng OR để bao phủ cả trường hợp MasterSeq hoặc RegCode khớp)
	if regCode != "" && regCode != "ALL" && masterSeq != "" && masterSeq != "ALL" {
		query = query.Where(`"RegCode" = ? OR "MasterSeq" = ? OR "RegCode" ILIKE ?`, regCode, masterSeq, "%"+regCode+"%")
	} else if regCode != "" && regCode != "ALL" {
		query = query.Where(`"RegCode" = ? OR "RegCode" ILIKE ?`, regCode, "%"+regCode+"%")
	} else if masterSeq != "" && masterSeq != "ALL" {
		query = query.Where(`"MasterSeq" = ?`, masterSeq)
	}

	// 2. Lọc theo Nhà máy (liên kết qua _ERPPlanMaster hoặc mã RegCode)
	if factoryCode != "" && factoryCode != "ALL" && regCode == "" && masterSeq == "" {
		subMasterQuery := s.db.Model(&models.ERPPlanMaster{}).
			Select(`"RegCode"`).
			Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")

		query = query.Where(`"RegCode" IN (?) OR "RegCode" ILIKE ?`, subMasterQuery, "%"+factoryCode+"%")
	}

	// 3. Lọc ngày và thời gian linh hoạt (hỗ trợ cả StatDate, StartDate, RoutingDate, TicketCreatedDate và Master.ApplyDate)
	if statDateFrom != "" && statDateTo != "" {
		from10 := statDateFrom
		if len(from10) > 10 {
			from10 = from10[:10]
		}
		to10 := statDateTo
		if len(to10) > 10 {
			to10 = to10[:10]
		}
		toEnd := to10 + "T23:59:59.999Z"
		toEndSpace := to10 + " 23:59:59"

		subDateMaster := s.db.Model(&models.ERPPlanMaster{}).
			Select(`"RegCode"`).
			Where(`(LEFT("ApplyDate", 10) >= ? AND LEFT("ApplyDate", 10) <= ?) OR ("ApplyDate" >= ? AND "ApplyDate" <= ?) OR ("ApplyDate" >= ? AND "ApplyDate" <= ?)`,
				from10, to10, from10, toEnd, from10, toEndSpace)
		if factoryCode != "" && factoryCode != "ALL" {
			subDateMaster = subDateMaster.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}

		query = query.Where(`(LEFT("StatDate", 10) >= ? AND LEFT("StatDate", 10) <= ?) OR (LEFT("StartDate", 10) >= ? AND LEFT("StartDate", 10) <= ?) OR ("RegCode" IN (?))`,
			from10, to10, from10, to10, subDateMaster)
	} else if statDateFrom != "" {
		from10 := statDateFrom
		if len(from10) > 10 {
			from10 = from10[:10]
		}
		subDateMaster := s.db.Model(&models.ERPPlanMaster{}).
			Select(`"RegCode"`).
			Where(`LEFT("ApplyDate", 10) >= ? OR "ApplyDate" >= ?`, from10, from10)
		if factoryCode != "" && factoryCode != "ALL" {
			subDateMaster = subDateMaster.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}

		query = query.Where(`LEFT("StatDate", 10) >= ? OR LEFT("StartDate", 10) >= ? OR ("RegCode" IN (?))`,
			from10, from10, subDateMaster)
	} else if statDateTo != "" {
		to10 := statDateTo
		if len(to10) > 10 {
			to10 = to10[:10]
		}
		toEnd := to10 + "T23:59:59.999Z"
		toEndSpace := to10 + " 23:59:59"
		subDateMaster := s.db.Model(&models.ERPPlanMaster{}).
			Select(`"RegCode"`).
			Where(`LEFT("ApplyDate", 10) <= ? OR "ApplyDate" <= ? OR "ApplyDate" <= ?`, to10, toEnd, toEndSpace)
		if factoryCode != "" && factoryCode != "ALL" {
			subDateMaster = subDateMaster.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}

		query = query.Where(`LEFT("StatDate", 10) <= ? OR LEFT("StartDate", 10) <= ? OR ("RegCode" IN (?))`,
			to10, to10, subDateMaster)
	}
	if fromTime != "" {
		query = query.Where(`"StartTime" >= ?`, fromTime)
	}
	if toTime != "" {
		query = query.Where(`"EndTime" <= ?`, toTime)
	}
	if teamName != "" && teamName != "ALL" {
		query = query.Where(`"TeamName" ILIKE ? OR "OpTypeName" ILIKE ? OR "ProcessName" ILIKE ?`, "%"+teamName+"%", "%"+teamName+"%", "%"+teamName+"%")
	}
	if machineCode != "" && machineCode != "ALL" {
		query = query.Where(`"MachineCode" ILIKE ? OR "MachineName" ILIKE ? OR "RawLineCode" ILIKE ? OR "RawLineName" ILIKE ?`, "%"+machineCode+"%", "%"+machineCode+"%", "%"+machineCode+"%", "%"+machineCode+"%")
	}
	if shift != "" && shift != "ALL" {
		query = query.Where(`"Shift" ILIKE ?`, "%"+shift+"%")
	}
	if itemCode != "" {
		query = query.Where(`"ItemCode" ILIKE ? OR "ItemName" ILIKE ?`, "%"+itemCode+"%", "%"+itemCode+"%")
	}
	if orderNo != "" {
		query = query.Where(`"OrderNo" ILIKE ?`, "%"+orderNo+"%")
	}
	if status != "" && status != "ALL" {
		query = query.Where(`"Status" ILIKE ? OR "StatusDpSx" ILIKE ?`, "%"+status+"%", "%"+status+"%")
	}

	var rawList []models.ERPProdStatsDetail
	err := query.Order(`"RowSeq" ASC, "IdSeq" ASC`).Find(&rawList).Error
	if err != nil {
		return nil, err
	}

	// 4. Nếu bảng _ERPProdStatsDetail rỗng dòng, kiểm tra fallback sang bảng _ERPPlanDetail
	if len(rawList) == 0 {
		planQuery := s.db.WithContext(ctx).Model(&models.ERPPlanDetail{})
		if regCode != "" {
			planQuery = planQuery.Where(`"RegCode" = ? OR "RegCode" ILIKE ?`, regCode, "%"+regCode+"%")
		}
		if masterSeq != "" {
			planQuery = planQuery.Where(`"MasterSeq" = ?`, masterSeq)
		}
		if factoryCode != "" && regCode == "" && masterSeq == "" {
			subPlanMasterQuery := s.db.Model(&models.ERPPlanMaster{}).
				Select(`"RegCode"`).
				Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
			planQuery = planQuery.Where(`"RegCode" IN (?) OR "RegCode" ILIKE ?`, subPlanMasterQuery, "%"+factoryCode+"%")
		}
		if statDateFrom != "" {
			planQuery = planQuery.Where(`"OpDate" >= ? OR "RoutingDocDate" >= ?`, statDateFrom, statDateFrom)
		}
		if statDateTo != "" {
			planQuery = planQuery.Where(`"OpDate" <= ? OR "RoutingDocDate" <= ?`, statDateTo, statDateTo)
		}

		var planRows []models.ERPPlanDetail
		if errPlan := planQuery.Order(`"RowSeq" ASC, "IdSeq" ASC`).Find(&planRows).Error; errPlan == nil && len(planRows) > 0 {
			for _, pr := range planRows {
				rawList = append(rawList, models.ERPProdStatsDetail{
					IdSeq:         pr.IdSeq,
					MasterSeq:     pr.MasterSeq,
					RegCode:       pr.RegCode,
					RowSeq:        pr.RowSeq,
					ItemCode:      pr.ItemCode,
					ItemName:      pr.ItemName,
					OperationNo:   pr.OperationNo,
					RoutingDocNo:  pr.RoutingDocNo,
					MachineName:   pr.MachineName,
					OpTypeName:    pr.OpTypeName,
					TargetPassQty: pr.TargetPassQty,
					TargetProdQty: pr.TargetProdQty,
					PassQty:       pr.StatPassQty,
					ProdQty:       pr.StatPassQty,
					ActualRunTime: pr.ActualProdTime,
					StartTime:     pr.StartTime,
					EndTime:       pr.EndTime,
					StatDate:      pr.OpDate,
					StartDate:     pr.OpDate,
					EndDate:       pr.RoutingDocDate,
					TeamName:      pr.OpTypeName,
					Status:        pr.StatusDpSx,
					UserMemo:      pr.UserMemo,
					IsActive:      pr.IsActive,
				})
			}
		}
	}

	// Nếu vẫn rỗng và không có bộ lọc cụ thể, lấy theo đợt Master mới nhất
	if len(rawList) == 0 && regCode == "" && masterSeq == "" && statDateFrom == "" && statDateTo == "" {
		var latestMaster models.ERPPlanMaster
		masterQuery := s.db.Model(&models.ERPPlanMaster{})
		if factoryCode != "" {
			masterQuery = masterQuery.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}
		if errM := masterQuery.Order(`"CreatedAt" DESC`).First(&latestMaster).Error; errM == nil && latestMaster.RegCode != "" {
			_ = s.db.Where(`"RegCode" = ? OR "MasterSeq" = ?`, latestMaster.RegCode, latestMaster.IdSeq).Find(&rawList).Error
		}
	}

	// Tải danh sách Master TKSX (đợt thống kê) trước để ánh xạ ngày áp dụng chuẩn
	var masterList []models.ERPPlanMaster
	mQuery := s.db.WithContext(ctx).Model(&models.ERPPlanMaster{}).
		Where(`"ReportType" ILIKE '%stat%' OR "ReportType" ILIKE '%thống kê%' OR "ReportType" ILIKE '%thong_ke%' OR "ReportType" = 'Thống kê sản xuất'`)
	if factoryCode != "" && factoryCode != "ALL" {
		mQuery = mQuery.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
	}
	_ = mQuery.Order(`"ApplyDate" DESC, "CreatedAt" DESC`).Limit(300).Find(&masterList).Error

	masterMap := make(map[string]models.ERPPlanMaster)
	for _, m := range masterList {
		if m.RegCode != "" {
			masterMap[m.RegCode] = m
		}
		if m.IdSeq != "" {
			masterMap[m.IdSeq] = m
		}
	}

	// 5. Khởi tạo mảng kết quả
	items := make([]models.ProdStatsDetailReportItem, 0)
	chartByTeam := make([]models.TeamStatAggregate, 0)
	chartByMachine := make([]models.MachineStatAggregate, 0)
	chartByDay := make([]models.DailyStatAggregate, 0)

	var summary models.ProdStatsSummary
	teamMap := make(map[string]*models.TeamStatAggregate)
	machineMap := make(map[string]*models.MachineStatAggregate)
	dayMap := make(map[string]*models.DailyStatAggregate)
	machineDailyMap := make(map[string]map[string]*machineDateStat)
	teamDailyMap := make(map[string]map[string]*teamDateStat)
	teamSet := make(map[string]bool)
	machineSet := make(map[string]bool)
	shiftSet := make(map[string]bool)
	dateSet := make(map[string]bool)

	var totalSyncSec float64
	var syncCount int
	var syncUnder10, sync11to30, sync31to60, syncOver60, syncEmpty int
	autoExportTypeMap := make(map[string]int)

	for _, row := range rawList {
		planQty := parseNumber(row.TargetProdQty, parseNumber(row.TargetPassQty, parseNumber(row.StandardMeters, 0)))
		actualQty := parseNumber(row.ProdQty, parseNumber(row.ActualMeters, planQty))
		passQty := parseNumber(row.PassQty, actualQty)
		defectQty := parseNumber(row.DefectQty, math.Max(0, actualQty-passQty))

		passRate := 100.0
		if actualQty > 0 {
			passRate = math.Round((passQty/actualQty)*10000) / 100
		}

		durMin := calcDurationMinutes(row.ActualRunTime, row.StartTime, row.EndTime)
		rtHours := math.Round((durMin/60.0)*100) / 100

		auditCat := "5MIN_12H"
		if durMin < 5 && durMin >= 0 {
			auditCat = "UNDER_5MIN"
		} else if durMin > 720 {
			auditCat = "OVER_12H"
		}

		team := ""
		if row.TeamName != nil && strings.TrimSpace(*row.TeamName) != "" {
			team = strings.TrimSpace(*row.TeamName)
		} else if row.OpTypeName != nil && strings.TrimSpace(*row.OpTypeName) != "" {
			team = strings.TrimSpace(*row.OpTypeName)
		} else if row.ProcessName != nil && strings.TrimSpace(*row.ProcessName) != "" {
			team = strings.TrimSpace(*row.ProcessName)
		} else {
			team = "Tổ sản xuất chung"
		}
		teamCode := strings.ToUpper(strings.ReplaceAll(team, " ", "_"))

		machineCodeVal := ""
		if row.MachineCode != nil && strings.TrimSpace(*row.MachineCode) != "" {
			machineCodeVal = strings.TrimSpace(*row.MachineCode)
		} else if row.RawLineCode != nil && strings.TrimSpace(*row.RawLineCode) != "" {
			machineCodeVal = strings.TrimSpace(*row.RawLineCode)
		}
		machineNameVal := machineCodeVal
		if row.MachineName != nil && strings.TrimSpace(*row.MachineName) != "" {
			machineNameVal = strings.TrimSpace(*row.MachineName)
		} else if row.RawLineName != nil && strings.TrimSpace(*row.RawLineName) != "" {
			machineNameVal = strings.TrimSpace(*row.RawLineName)
		}
		if machineCodeVal == "" && machineNameVal != "" {
			machineCodeVal = machineNameVal
		} else if machineCodeVal == "" && machineNameVal == "" {
			machineCodeVal = "MAY_KHAC"
			machineNameVal = "Máy / Dây chuyền khác"
		}

		effectiveDate := ""
		if row.RegCode != "" {
			if m, ok := masterMap[row.RegCode]; ok && m.ApplyDate != nil && *m.ApplyDate != "" {
				effectiveDate = cleanDateString(m.ApplyDate)
			}
		}
		if effectiveDate == "" && row.MasterSeq != "" {
			if m, ok := masterMap[row.MasterSeq]; ok && m.ApplyDate != nil && *m.ApplyDate != "" {
				effectiveDate = cleanDateString(m.ApplyDate)
			}
		}
		if effectiveDate == "" && row.StatDate != nil && strings.TrimSpace(*row.StatDate) != "" {
			effectiveDate = cleanDateString(row.StatDate)
		}
		if effectiveDate == "" && row.StartDate != nil && strings.TrimSpace(*row.StartDate) != "" {
			effectiveDate = cleanDateString(row.StartDate)
		}
		prodDate := effectiveDate
		shiftVal := ""
		if row.Shift != nil {
			shiftVal = strings.TrimSpace(*row.Shift)
		}
		status := "Hoàn thành"
		if row.Status != nil && strings.TrimSpace(*row.Status) != "" {
			status = strings.TrimSpace(*row.Status)
		}

		// Nguồn gốc tạo phiếu (MES vs Bravo)
		origin := ""
		if row.TicketCreationLocation != nil {
			origin = strings.ToUpper(*row.TicketCreationLocation)
		} else if row.CreatedBy != nil {
			origin = strings.ToUpper(*row.CreatedBy)
		}
		isMes := strings.Contains(origin, "MES") || !strings.Contains(origin, "BRAVO")

		// Trạng thái chứng từ tự động
		autoIoStatus := ""
		if row.AutoIoStatus != nil {
			autoIoStatus = strings.TrimSpace(*row.AutoIoStatus)
		} else if row.AutoExport != nil && (*row.AutoExport == "true" || *row.AutoExport == "1") {
			autoIoStatus = "Có XKTĐ"
		} else {
			autoIoStatus = "Không áp dụng XNTĐ"
		}
		autoExportTypeMap[autoIoStatus]++

		isPassAuto := isPassAutoIo(autoIoStatus)
		isMissingAuto := isMissingAutoIo(autoIoStatus)
		isNoMatAuto := isNoMaterialAutoIo(autoIoStatus)

		// Độ trễ đồng bộ
		syncSec, hasSync := parseSyncDelaySeconds(row.SyncDelayMinutes, row.TicketCreatedDate, row.MesApprovalTime)
		if hasSync {
			totalSyncSec += syncSec
			syncCount++
			if syncSec <= 10 {
				syncUnder10++
			} else if syncSec <= 30 {
				sync11to30++
			} else if syncSec <= 60 {
				sync31to60++
			} else {
				syncOver60++
			}
		} else {
			syncEmpty++
		}

		isUnder5Min := durMin < 5 && durMin >= 0
		isOver12hCheck := durMin > 720 && actualQty < 50000

		ticketNo := row.IdSeq
		if row.StatTicketNo != nil && strings.TrimSpace(*row.StatTicketNo) != "" {
			ticketNo = strings.TrimSpace(*row.StatTicketNo)
		}
		docNo := ""
		if row.OperationNo != nil && strings.TrimSpace(*row.OperationNo) != "" {
			docNo = strings.TrimSpace(*row.OperationNo)
		} else if row.RoutingDocNo != nil && strings.TrimSpace(*row.RoutingDocNo) != "" {
			docNo = strings.TrimSpace(*row.RoutingDocNo)
		}
		orderNoVal := ""
		if row.OrderNo != nil {
			orderNoVal = strings.TrimSpace(*row.OrderNo)
		}
		supervisorVal := ""
		if row.MainWorker != nil && strings.TrimSpace(*row.MainWorker) != "" {
			supervisorVal = strings.TrimSpace(*row.MainWorker)
		} else if row.StatStaff != nil && strings.TrimSpace(*row.StatStaff) != "" {
			supervisorVal = strings.TrimSpace(*row.StatStaff)
		} else {
			supervisorVal = "Quản lý sản xuất"
		}

		sTimeVal := ""
		if row.StartTime != nil {
			sTimeVal = strings.TrimSpace(*row.StartTime)
		}
		eTimeVal := ""
		if row.EndTime != nil {
			eTimeVal = strings.TrimSpace(*row.EndTime)
		}

		itemReport := models.ProdStatsDetailReportItem{
			ERPProdStatsDetail: row,
			Id:                 &row.IdSeq,
			TicketNo:           &ticketNo,
			DocNo:              &docNo,
			OrderNoVal:         &orderNoVal,
			Team:               &team,
			TeamNameVal:        &team,
			MachineNameVal:     &machineNameVal,
			MachineCodeVal:     &machineCodeVal,
			PlanQtyVal:         &planQty,
			ActualQtyVal:       &actualQty,
			PassQtyVal:         &passQty,
			DefectQtyVal:       &defectQty,
			DurationMinutes:    &durMin,
			DurationMinVal:     &durMin,
			RuntimeHours:       &rtHours,
			RuntimeHoursVal:    &rtHours,
			AuditCategory:      &auditCat,
			PassRate:           &passRate,
			PassRateVal:        &passRate,
			ProdDateVal:        &prodDate,
			StartTimeVal:       &sTimeVal,
			EndTimeVal:         &eTimeVal,
			CreatedSource:      &origin,
			Supervisor:         &supervisorVal,
			StatusVal:          &status,
		}
		items = append(items, itemReport)

		// 6. Tính toán KPI Summary chuẩn Sổ tay công thức
		summary.TotalTickets++
		summary.TotalPlanQty += planQty
		summary.TotalActualQty += actualQty
		summary.TotalPassQty += passQty
		summary.TotalDefectQty += defectQty
		summary.TotalRuntimeHours += rtHours
		if status == "Hoàn thành" {
			summary.CountCompleted++
		} else {
			summary.CountRunning++
		}

		if isMes {
			summary.MesCreatedCount++
		} else {
			summary.BravoCreatedCount++
		}

		if isPassAuto {
			summary.AutoExportCount++
		} else if isMissingAuto {
			summary.NoAutoExportCount++
		} else if isNoMatAuto {
			summary.NoMaterialCount++
		}

		if isUnder5Min {
			summary.RuntimeUnder5Min++
		} else if durMin >= 5 && durMin <= 720 {
			summary.RuntimeNormal++
		}
		if isOver12hCheck {
			summary.RuntimeOver12hCheck++
		}

		// Gom nhóm theo Team
		if team != "" {
			teamSet[team] = true
			if _, exists := teamMap[team]; !exists {
				teamMap[team] = &models.TeamStatAggregate{TeamName: team, TeamCode: teamCode}
			}
			teamMap[team].TicketCount++
			teamMap[team].PlanQty += planQty
			teamMap[team].ActualQty += actualQty
			teamMap[team].TotalActualQty += actualQty
			teamMap[team].PassQty += passQty
			teamMap[team].TotalPassQty += passQty
			teamMap[team].DefectQty += defectQty
			teamMap[team].TotalDefectQty += defectQty
			teamMap[team].RuntimeHours += rtHours
			teamMap[team].TotalRuntimeHours += rtHours
			if isMes {
				teamMap[team].MesCount++
			}
			if isUnder5Min {
				teamMap[team].Under5Min++
				teamMap[team].Under5MinCount++
			}
			if isOver12hCheck {
				teamMap[team].Anomalies++
				teamMap[team].Over12hCheckCount++
			}
			if isPassAuto {
				teamMap[team].AutoExportPass++
			} else if isMissingAuto {
				teamMap[team].AutoExportMissing++
			}
		}

		// Gom nhóm theo Machine
		if machineCodeVal != "" {
			machineSet[machineCodeVal] = true
			if _, exists := machineMap[machineCodeVal]; !exists {
				machineMap[machineCodeVal] = &models.MachineStatAggregate{
					MachineCode: machineCodeVal,
					MachineName: machineNameVal,
					TeamName:    team,
					IsManual:    isManualMachine(machineNameVal, machineCodeVal),
				}
			}
			machineMap[machineCodeVal].TicketCount++
			machineMap[machineCodeVal].PlanQty += planQty
			machineMap[machineCodeVal].ActualQty += actualQty
			machineMap[machineCodeVal].TotalActualQty += actualQty
			machineMap[machineCodeVal].PassQty += passQty
			machineMap[machineCodeVal].TotalPassQty += passQty
			machineMap[machineCodeVal].DefectQty += defectQty
			machineMap[machineCodeVal].TotalDefectQty += defectQty
			machineMap[machineCodeVal].RuntimeHours += rtHours
			machineMap[machineCodeVal].TotalRuntimeHours += rtHours
			if isUnder5Min {
				machineMap[machineCodeVal].Under5Min++
				machineMap[machineCodeVal].Under5MinCount++
			}
			if isOver12hCheck {
				machineMap[machineCodeVal].Anomalies++
				machineMap[machineCodeVal].Over12hCheckCount++
			}
			if isMes {
				machineMap[machineCodeVal].MesCount++
			}
		}

		// Gom nhóm theo Ngày
		if prodDate != "" {
			dateSet[prodDate] = true
			if _, exists := dayMap[prodDate]; !exists {
				dayMap[prodDate] = &models.DailyStatAggregate{Date: prodDate}
			}
			dayMap[prodDate].TicketCount++
			dayMap[prodDate].PlanQty += planQty
			dayMap[prodDate].ActualQty += actualQty
			dayMap[prodDate].TotalActualQty += actualQty
			dayMap[prodDate].PassQty += passQty
			dayMap[prodDate].TotalPassQty += passQty
			dayMap[prodDate].DefectQty += defectQty
			dayMap[prodDate].TotalDefectQty += defectQty
			dayMap[prodDate].RuntimeHours += rtHours
			dayMap[prodDate].TotalRuntimeHours += rtHours
			if isOver12hCheck {
				dayMap[prodDate].Over12hCount++
				dayMap[prodDate].Anomalies++
			}
			if isUnder5Min {
				dayMap[prodDate].Under5MinCount++
				dayMap[prodDate].Under5Min++
			}
			if isPassAuto {
				dayMap[prodDate].AutoExportedCount++
				dayMap[prodDate].AutoExportPass++
			} else if isMissingAuto {
				dayMap[prodDate].NotAutoExportedCount++
				dayMap[prodDate].AutoExportMissing++
			}
			if isMes {
				dayMap[prodDate].MesCount++
			} else {
				dayMap[prodDate].NonMesCount++
			}
			if hasSync {
				dayMap[prodDate].TotalSyncSec += syncSec
				dayMap[prodDate].SyncCount++
				if syncSec <= 10 {
					dayMap[prodDate].Under10++
					dayMap[prodDate].SyncUnder10++
				} else if syncSec <= 30 {
					dayMap[prodDate].From11to30++
					dayMap[prodDate].Sync11to30++
				} else if syncSec <= 60 {
					dayMap[prodDate].From31to60++
					dayMap[prodDate].Sync31to60++
				} else {
					dayMap[prodDate].Over60++
					dayMap[prodDate].SyncOver60++
				}
			} else {
				dayMap[prodDate].SyncEmpty++
			}

			// Gom nhóm theo Cụm máy theo Ngày
			if machineCodeVal != "" {
				if _, ok := machineDailyMap[prodDate]; !ok {
					machineDailyMap[prodDate] = make(map[string]*machineDateStat)
				}
				if _, ok := machineDailyMap[prodDate][machineCodeVal]; !ok {
					machineDailyMap[prodDate][machineCodeVal] = &machineDateStat{}
				}
				mds := machineDailyMap[prodDate][machineCodeVal]
				mds.runtimeHours += rtHours
				mds.actualQty += actualQty
				mds.passQty += passQty
				mds.planQty += planQty
				mds.ticketCount++
			}

			// Gom nhóm theo Tổ sản xuất theo Ngày
			if team != "" {
				if _, ok := teamDailyMap[prodDate]; !ok {
					teamDailyMap[prodDate] = make(map[string]*teamDateStat)
				}
				if _, ok := teamDailyMap[prodDate][team]; !ok {
					teamDailyMap[prodDate][team] = &teamDateStat{}
				}
				tds := teamDailyMap[prodDate][team]
				tds.runtimeHours += rtHours
				tds.actualQty += actualQty
				tds.passQty += passQty
				tds.defectQty += defectQty
				tds.planQty += planQty
				tds.ticketCount++
			}
		}

		if shiftVal != "" {
			shiftSet[shiftVal] = true
		}
	}

	// 7. Hoàn tất tính % và Format cho Summary
	if summary.TotalActualQty > 0 {
		summary.OverallPassRate = math.Round((summary.TotalPassQty/summary.TotalActualQty)*10000) / 100
		summary.AvgPassRate = summary.OverallPassRate
	} else {
		summary.OverallPassRate = 100
		summary.AvgPassRate = 100
	}
	if summary.TotalPlanQty > 0 {
		summary.PlanCompletionRate = math.Round((summary.TotalActualQty/summary.TotalPlanQty)*10000) / 100
	}
	if summary.TotalTickets > 0 {
		summary.AvgRuntimeHours = math.Round((summary.TotalRuntimeHours/float64(summary.TotalTickets))*100) / 100
		summary.MesRate = math.Round((float64(summary.MesCreatedCount)/float64(summary.TotalTickets))*10000) / 100
	}
	totalAutoChecked := summary.AutoExportCount + summary.NoAutoExportCount
	if totalAutoChecked > 0 {
		summary.AutoExportRate = math.Round((float64(summary.AutoExportCount)/float64(totalAutoChecked))*10000) / 100
	}
	if syncCount > 0 {
		summary.AvgSyncDelaySeconds = math.Round((totalSyncSec/float64(syncCount))*10) / 10
		summary.AvgSyncDelayFormatted = formatSecondsToTime(summary.AvgSyncDelaySeconds)
	} else {
		summary.AvgSyncDelayFormatted = "00:00:00"
	}
	summary.TotalRuntimeHours = math.Round(summary.TotalRuntimeHours*100) / 100

	// 8. Tính số ngày trong chu kỳ và định mức công suất trần
	totalDays := 1
	if len(dateSet) > 0 {
		totalDays = len(dateSet)
	} else if statDateFrom != "" && statDateTo != "" {
		d1Str := statDateFrom
		if len(d1Str) > 10 {
			d1Str = d1Str[:10]
		}
		d2Str := statDateTo
		if len(d2Str) > 10 {
			d2Str = d2Str[:10]
		}
		t1, err1 := time.Parse("2006-01-02", d1Str)
		t2, err2 := time.Parse("2006-01-02", d2Str)
		if err1 == nil && err2 == nil && !t2.Before(t1) {
			diff := int(t2.Sub(t1).Hours()/24) + 1
			if diff > 0 {
				totalDays = diff
			}
		}
	}
	standardCapacityHours := float64(totalDays * 24)
	summary.TotalDays = totalDays
	summary.StandardCapacityHours = standardCapacityHours
	summary.FromDate = statDateFrom
	summary.ToDate = statDateTo

	// Team Aggregates
	for _, agg := range teamMap {
		if agg.ActualQty > 0 {
			agg.PassRate = math.Round((agg.PassQty/agg.ActualQty)*10000) / 100
		} else {
			agg.PassRate = 100
		}
		if agg.TicketCount > 0 {
			agg.MesRate = math.Round((float64(agg.MesCount)/float64(agg.TicketCount))*10000) / 100
		}
		totalTeamAuto := agg.AutoExportPass + agg.AutoExportMissing
		if totalTeamAuto > 0 {
			agg.AutoExportRate = math.Round((float64(agg.AutoExportPass)/float64(totalTeamAuto))*10000) / 100
		}
		agg.RuntimeHours = math.Round(agg.RuntimeHours*100) / 100
		agg.TotalRuntimeHours = agg.RuntimeHours
		chartByTeam = append(chartByTeam, *agg)
	}
	sort.Slice(chartByTeam, func(i, j int) bool { return chartByTeam[i].PassRate > chartByTeam[j].PassRate })

	// Machine Aggregates
	for _, agg := range machineMap {
		if agg.ActualQty > 0 {
			agg.PassRate = math.Round((agg.PassQty/agg.ActualQty)*10000) / 100
		} else {
			agg.PassRate = 100
		}
		if agg.TicketCount > 0 {
			agg.MesRate = math.Round((float64(agg.MesCount)/float64(agg.TicketCount))*10000) / 100
		}
		agg.RuntimeHours = math.Round(agg.RuntimeHours*100) / 100
		agg.TotalRuntimeHours = agg.RuntimeHours
		agg.StandardCapacityHours = standardCapacityHours
		if standardCapacityHours > 0 {
			agg.RuntimeVsCapacity = math.Round((agg.RuntimeHours/standardCapacityHours)*1000) / 10
		}
		if totalDays > 0 {
			agg.AvgDailyHours = math.Round((agg.RuntimeHours/float64(totalDays))*10) / 10
		}
		agg.IsOver24h = agg.RuntimeHours > standardCapacityHours
		chartByMachine = append(chartByMachine, *agg)
	}
	sort.Slice(chartByMachine, func(i, j int) bool { return chartByMachine[i].RuntimeHours > chartByMachine[j].RuntimeHours })

	// Daily Aggregates
	for _, agg := range dayMap {
		if agg.ActualQty > 0 {
			agg.PassRate = math.Round((agg.PassQty/agg.ActualQty)*10000) / 100
		} else {
			agg.PassRate = 100
		}
		if agg.TicketCount > 0 {
			agg.MesRate = math.Round((float64(agg.MesCount)/float64(agg.TicketCount))*10000) / 100
		}
		totalDayAuto := agg.AutoExportedCount + agg.NotAutoExportedCount
		if totalDayAuto > 0 {
			agg.AutoExportRate = math.Round((float64(agg.AutoExportedCount)/float64(totalDayAuto))*10000) / 100
		}
		if agg.SyncCount > 0 {
			agg.AvgSyncDelaySeconds = math.Round((agg.TotalSyncSec/float64(agg.SyncCount))*10) / 10
			agg.AvgDelaySec = agg.AvgSyncDelaySeconds
		}
		if agg.TicketCount > 0 {
			agg.InstantRate = math.Round((float64(agg.Under10)/float64(agg.TicketCount))*1000) / 10
		}
		agg.RuntimeHours = math.Round(agg.RuntimeHours*100) / 100
		agg.TotalRuntimeHours = agg.RuntimeHours
		chartByDay = append(chartByDay, *agg)
	}
	sort.Slice(chartByDay, func(i, j int) bool { return chartByDay[i].Date < chartByDay[j].Date })

	// Phân bổ độ trễ Sync Breakdown
	totalRec := float64(summary.TotalTickets)
	syncBreakdown := []models.SyncDelayGroupItem{
		{Group: "≤ 10 giây", ShortGroup: "≤ 10s", Count: syncUnder10, Color: "#01411b"},
		{Group: "11 – 30 giây", ShortGroup: "11–30s", Count: sync11to30, Color: "#166534"},
		{Group: "31 – 60 giây", ShortGroup: "31–60s", Count: sync31to60, Color: "#475569"},
		{Group: "> 60 giây (Độ trễ cao)", ShortGroup: "> 60s", Count: syncOver60, Color: "#64748b"},
		{Group: "Không đồng bộ (trống)", ShortGroup: "Trống", Count: syncEmpty, Color: "#94a3b8"},
	}
	for i := range syncBreakdown {
		if totalRec > 0 {
			syncBreakdown[i].Rate = math.Round((float64(syncBreakdown[i].Count)/totalRec)*1000) / 10
		}
	}

	// Phân bổ chứng từ Auto Export Breakdown
	autoExportBreakdown := make([]models.AutoExportGroupItem, 0)
	for label, count := range autoExportTypeMap {
		color := "#01411b"
		if isMissingAutoIo(label) {
			color = "#dc2626"
		} else if isNoMaterialAutoIo(label) {
			color = "#94a3b8"
		}
		rate := 0.0
		if totalRec > 0 {
			rate = math.Round((float64(count)/totalRec)*1000) / 10
		}
		autoExportBreakdown = append(autoExportBreakdown, models.AutoExportGroupItem{
			Label: label,
			Count: count,
			Rate:  rate,
			Color: color,
		})
	}
	sort.Slice(autoExportBreakdown, func(i, j int) bool { return autoExportBreakdown[i].Count > autoExportBreakdown[j].Count })

	// Danh sách bộ lọc
	filterOpts := models.FilterOptionList{
		Teams:    getKeysFromMap(teamSet),
		Machines: getKeysFromMap(machineSet),
		Shifts:   getKeysFromMap(shiftSet),
		Dates:    getKeysFromMap(dateSet),
	}

	includeItems := getFilterValue(filters, "includeItems", "IncludeItems", "withItems", "WithItems", "include_items")
	withoutItems := getFilterValue(filters, "withoutItems", "WithoutItems", "without_items")

	// Phân trang
	page := 1
	pageSize := 0
	if ps := getFilterValue(filters, "pageSize", "PageSize", "page_size"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val >= 0 {
			pageSize = val
		}
	} else if includeItems == "true" || includeItems == "1" || includeItems == "all" {
		pageSize = len(items)
	}

	if p := getFilterValue(filters, "page", "Page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	totalRecords := int64(len(items))
	pagedItems := make([]models.ProdStatsDetailReportItem, 0)
	if withoutItems != "true" && withoutItems != "1" {
		if pageSize <= 0 {
			pageSize = 10000
		}
		startIdx := (page - 1) * pageSize
		if startIdx < 0 {
			startIdx = 0
		}
		endIdx := startIdx + pageSize
		if startIdx > len(items) {
			startIdx = len(items)
		}
		if endIdx > len(items) {
			endIdx = len(items)
		}
		pagedItems = items[startIdx:endIdx]
	}

	totalPages := 1
	if pageSize > 0 {
		totalPages = int(math.Ceil(float64(totalRecords) / float64(pageSize)))
	}

	// 8. Build Machine & Team Timeline Breakdown
	machineTimelineBreakdown := buildMachineTimelineBreakdown(dayMap, machineMap, machineDailyMap, dateSet)
	teamTimelineBreakdown := buildTeamTimelineBreakdown(dayMap, teamMap, teamDailyMap, dateSet)

	return &models.ProdStatsReportResponse{
		Summary:                  summary,
		ChartByTeam:              chartByTeam,
		TeamBreakdown:            chartByTeam,
		ChartByMachine:           chartByMachine,
		MachineBreakdown:         chartByMachine,
		ChartByDay:               chartByDay,
		DailyTrendData:           chartByDay,
		DailyAggregates:          chartByDay,
		MachineTimelineBreakdown: machineTimelineBreakdown,
		TeamTimelineBreakdown:    teamTimelineBreakdown,
		SyncDelayBreakdown:       syncBreakdown,
		AutoExportBreakdown:      autoExportBreakdown,
		FilterOptions:            filterOpts,
		Items:                    pagedItems,
		Pagination: models.PlanPageInfo{
			Page:        page,
			PageSize:    pageSize,
			TotalRows:   int(totalRecords),
			Total:       totalRecords,
			TotalPages:  totalPages,
			TotalAll:    totalRecords,
			LoadedCount: len(pagedItems),
		},
	}, nil
}

func getKeysFromMap(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func cleanDateString(dateVal *string) string {
	if dateVal == nil || strings.TrimSpace(*dateVal) == "" {
		return ""
	}
	s := strings.TrimSpace(*dateVal)
	if len(s) >= 10 && s[4] == '-' && s[7] == '-' {
		return s[:10]
	}
	if strings.Contains(s, "T") {
		parts := strings.Split(s, "T")
		return parts[0]
	}
	if strings.Contains(s, "/") {
		parts := strings.Split(strings.Split(s, " ")[0], "/")
		if len(parts) == 3 {
			m, d, y := parts[0], parts[1], parts[2]
			if len(y) == 2 {
				y = "20" + y
			}
			if len(m) == 1 {
				m = "0" + m
			}
			if len(d) == 1 {
				d = "0" + d
			}
			return y + "-" + m + "-" + d
		}
	}
	if strings.Contains(s, "-") {
		parts := strings.Split(strings.Split(s, " ")[0], "-")
		if len(parts) == 3 && len(parts[0]) <= 2 && len(parts[2]) == 4 {
			d, m, y := parts[0], parts[1], parts[2]
			if len(m) == 1 {
				m = "0" + m
			}
			if len(d) == 1 {
				d = "0" + d
			}
			return y + "-" + m + "-" + d
		}
	}
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}

func buildMachineTimelineBreakdown(
	dayMap map[string]*models.DailyStatAggregate,
	machineMap map[string]*models.MachineStatAggregate,
	machineDailyMap map[string]map[string]*machineDateStat,
	dateSet map[string]bool,
) *models.MachineTimelineBreakdownDTO {
	dateList := make([]string, 0, len(dateSet))
	for d := range dateSet {
		dateList = append(dateList, d)
	}
	sort.Strings(dateList)

	machineList := make([]string, 0, len(machineMap))
	for m := range machineMap {
		machineList = append(machineList, m)
	}
	sort.Strings(machineList)

	machineClusters := make([]map[string]interface{}, 0, len(machineList))
	for _, mCode := range machineList {
		mAgg := machineMap[mCode]
		mName := mCode
		team := ""
		isManual := false
		if mAgg != nil {
			mName = mAgg.MachineName
			team = mAgg.TeamName
			isManual = mAgg.IsManual
		}
		machineClusters = append(machineClusters, map[string]interface{}{
			"machineCode":  mCode,
			"machineName":  mName,
			"teamName":     team,
			"isManual":     isManual,
			"runtimeHours": mAgg.RuntimeHours,
			"ticketCount":  mAgg.TicketCount,
			"actualQty":    mAgg.ActualQty,
		})
	}

	dailyList := make([]map[string]interface{}, 0, len(dateList))

	type periodMachineAgg struct {
		periodKey      string
		name           string
		periodLabel    string
		totalRuntime   float64
		totalTickets   int
		totalActualQty float64
		machineStats   map[string]*machineDateStat
	}

	monthMap := make(map[string]*periodMachineAgg)
	quarterMap := make(map[string]*periodMachineAgg)

	for _, dStr := range dateList {
		shortDate := dStr
		if len(dStr) >= 10 {
			shortDate = dStr[8:10] + "/" + dStr[5:7]
		}
		dAgg := dayMap[dStr]
		dRuntime := 0.0
		dTickets := 0
		dActual := 0.0
		if dAgg != nil {
			dRuntime = math.Round(dAgg.RuntimeHours*100) / 100
			dTickets = dAgg.TicketCount
			dActual = dAgg.ActualQty
		}

		row := map[string]interface{}{
			"date":         dStr,
			"shortDate":    shortDate,
			"name":         shortDate,
			"runtimeHours": dRuntime,
			"totalRuntime": dRuntime,
			"ticketCount":  dTickets,
			"totalTickets": dTickets,
			"totalOrders":  dTickets,
			"actualQty":    dActual,
		}

		mKey := "Khác"
		if len(dStr) >= 7 {
			mKey = dStr[:7]
		}
		mNum := 1
		if len(dStr) >= 7 {
			mNum = int(dStr[5]-'0')*10 + int(dStr[6]-'0')
		}
		qNum := (mNum-1)/3 + 1
		qKey := "Khác"
		if len(dStr) >= 4 {
			qKey = dStr[:4] + "-Q" + string(rune('0'+qNum))
		}

		if _, ok := monthMap[mKey]; !ok {
			mName := mKey
			mLabel := mKey
			if len(mKey) >= 7 {
				mName = "T" + mKey[5:7] + "/" + mKey[2:4]
				mLabel = "Tháng " + mKey[5:7] + "/" + mKey[:4]
			}
			monthMap[mKey] = &periodMachineAgg{
				periodKey:    mKey,
				name:         mName,
				periodLabel:  mLabel,
				machineStats: make(map[string]*machineDateStat),
			}
		}
		mRec := monthMap[mKey]
		mRec.totalRuntime += dRuntime
		mRec.totalTickets += dTickets
		mRec.totalActualQty += dActual

		if _, ok := quarterMap[qKey]; !ok {
			quarterMap[qKey] = &periodMachineAgg{
				periodKey:    qKey,
				name:         qKey,
				periodLabel:  qKey,
				machineStats: make(map[string]*machineDateStat),
			}
		}
		qRec := quarterMap[qKey]
		qRec.totalRuntime += dRuntime
		qRec.totalTickets += dTickets
		qRec.totalActualQty += dActual

		for _, mCode := range machineList {
			mRuntime := 0.0
			mTickets := 0
			mActual := 0.0
			if mds, ok := machineDailyMap[dStr][mCode]; ok {
				mRuntime = math.Round(mds.runtimeHours*100) / 100
				mTickets = mds.ticketCount
				mActual = mds.actualQty

				if _, ok := mRec.machineStats[mCode]; !ok {
					mRec.machineStats[mCode] = &machineDateStat{}
				}
				mRec.machineStats[mCode].runtimeHours += mds.runtimeHours
				mRec.machineStats[mCode].ticketCount += mds.ticketCount
				mRec.machineStats[mCode].actualQty += mds.actualQty

				if _, ok := qRec.machineStats[mCode]; !ok {
					qRec.machineStats[mCode] = &machineDateStat{}
				}
				qRec.machineStats[mCode].runtimeHours += mds.runtimeHours
				qRec.machineStats[mCode].ticketCount += mds.ticketCount
				qRec.machineStats[mCode].actualQty += mds.actualQty
			}

			row[mCode] = mRuntime
			row[mCode+"_runtime"] = mRuntime
			row[mCode+"_tickets"] = mTickets
			row[mCode+"_actualQty"] = mActual
			mRuntimeRate := 0.0
			if dRuntime > 0 {
				mRuntimeRate = math.Round((mRuntime/dRuntime)*1000) / 10
			}
			row[mCode+"_runtimeRate"] = mRuntimeRate
		}

		dailyList = append(dailyList, row)
	}

	monthKeys := make([]string, 0, len(monthMap))
	for k := range monthMap {
		monthKeys = append(monthKeys, k)
	}
	sort.Strings(monthKeys)
	monthlyList := make([]map[string]interface{}, 0, len(monthKeys))
	for _, k := range monthKeys {
		m := monthMap[k]
		totRt := math.Round(m.totalRuntime*100) / 100
		mRow := map[string]interface{}{
			"periodKey":    m.periodKey,
			"date":         m.periodKey,
			"name":         m.name,
			"periodLabel":  m.periodLabel,
			"runtimeHours": totRt,
			"totalRuntime": totRt,
			"ticketCount":  m.totalTickets,
			"totalTickets": m.totalTickets,
			"totalOrders":  m.totalTickets,
			"actualQty":    m.totalActualQty,
		}
		for _, mCode := range machineList {
			mRt := 0.0
			mTk := 0
			mAct := 0.0
			if ms, ok := m.machineStats[mCode]; ok {
				mRt = math.Round(ms.runtimeHours*100) / 100
				mTk = ms.ticketCount
				mAct = ms.actualQty
			}
			mRow[mCode] = mRt
			mRow[mCode+"_runtime"] = mRt
			mRow[mCode+"_tickets"] = mTk
			mRow[mCode+"_actualQty"] = mAct
			mRate := 0.0
			if totRt > 0 {
				mRate = math.Round((mRt/totRt)*1000) / 10
			}
			mRow[mCode+"_runtimeRate"] = mRate
		}
		monthlyList = append(monthlyList, mRow)
	}

	quarterKeys := make([]string, 0, len(quarterMap))
	for k := range quarterMap {
		quarterKeys = append(quarterKeys, k)
	}
	sort.Strings(quarterKeys)
	quarterlyList := make([]map[string]interface{}, 0, len(quarterKeys))
	for _, k := range quarterKeys {
		q := quarterMap[k]
		totRt := math.Round(q.totalRuntime*100) / 100
		qRow := map[string]interface{}{
			"periodKey":    q.periodKey,
			"date":         q.periodKey,
			"name":         q.name,
			"periodLabel":  q.periodLabel,
			"runtimeHours": totRt,
			"totalRuntime": totRt,
			"ticketCount":  q.totalTickets,
			"totalTickets": q.totalTickets,
			"totalOrders":  q.totalTickets,
			"actualQty":    q.totalActualQty,
		}
		for _, mCode := range machineList {
			mRt := 0.0
			mTk := 0
			mAct := 0.0
			if ms, ok := q.machineStats[mCode]; ok {
				mRt = math.Round(ms.runtimeHours*100) / 100
				mTk = ms.ticketCount
				mAct = ms.actualQty
			}
			qRow[mCode] = mRt
			qRow[mCode+"_runtime"] = mRt
			qRow[mCode+"_tickets"] = mTk
			qRow[mCode+"_actualQty"] = mAct
			mRate := 0.0
			if totRt > 0 {
				mRate = math.Round((mRt/totRt)*1000) / 10
			}
			qRow[mCode+"_runtimeRate"] = mRate
		}
		quarterlyList = append(quarterlyList, qRow)
	}

	return &models.MachineTimelineBreakdownDTO{
		DailyList:       dailyList,
		MonthlyList:     monthlyList,
		QuarterlyList:   quarterlyList,
		MachineList:     machineList,
		MachineClusters: machineClusters,
	}
}

type teamDateStat struct {
	actualQty    float64
	passQty      float64
	defectQty    float64
	planQty      float64
	ticketCount  int
	runtimeHours float64
}

func buildTeamTimelineBreakdown(
	dayMap map[string]*models.DailyStatAggregate,
	teamMap map[string]*models.TeamStatAggregate,
	teamDailyMap map[string]map[string]*teamDateStat,
	dateSet map[string]bool,
) *models.TeamTimelineBreakdownDTO {
	dateList := make([]string, 0, len(dateSet))
	for d := range dateSet {
		dateList = append(dateList, d)
	}
	sort.Strings(dateList)

	teamList := make([]string, 0, len(teamMap))
	for t := range teamMap {
		teamList = append(teamList, t)
	}
	sort.Strings(teamList)

	teamClusters := make([]map[string]interface{}, 0, len(teamList))
	for _, tName := range teamList {
		tAgg := teamMap[tName]
		pRate := 100.0
		if tAgg != nil && tAgg.TotalActualQty > 0 {
			pRate = math.Round((tAgg.TotalPassQty/tAgg.TotalActualQty)*10000) / 100
		}
		teamClusters = append(teamClusters, map[string]interface{}{
			"teamName":     tName,
			"teamCode":     tAgg.TeamCode,
			"actualQty":    tAgg.TotalActualQty,
			"passQty":      tAgg.TotalPassQty,
			"defectQty":    tAgg.TotalDefectQty,
			"passRate":     pRate,
			"ticketCount":  tAgg.TicketCount,
			"runtimeHours": tAgg.TotalRuntimeHours,
		})
	}

	dailyList := make([]map[string]interface{}, 0, len(dateList))

	type periodTeamAgg struct {
		periodKey      string
		name           string
		periodLabel    string
		totalActualQty float64
		totalPassQty   float64
		totalDefectQty float64
		totalTickets   int
		totalRuntime   float64
		teamStats      map[string]*teamDateStat
	}

	monthMap := make(map[string]*periodTeamAgg)
	quarterMap := make(map[string]*periodTeamAgg)

	for _, dStr := range dateList {
		shortDate := dStr
		if len(dStr) >= 10 {
			shortDate = dStr[8:10] + "/" + dStr[5:7]
		}
		dAgg := dayMap[dStr]
		dActual := 0.0
		dPass := 0.0
		dDefect := 0.0
		dTickets := 0
		dRuntime := 0.0
		if dAgg != nil {
			dActual = dAgg.ActualQty
			dPass = dAgg.PassQty
			dDefect = dAgg.DefectQty
			dTickets = dAgg.TicketCount
			dRuntime = math.Round(dAgg.RuntimeHours*100) / 100
		}

		row := map[string]interface{}{
			"date":           dStr,
			"shortDate":      shortDate,
			"name":           shortDate,
			"actualQty":      dActual,
			"totalActualQty": dActual,
			"passQty":        dPass,
			"totalPassQty":   dPass,
			"defectQty":      dDefect,
			"totalDefectQty": dDefect,
			"ticketCount":    dTickets,
			"totalTickets":   dTickets,
			"runtimeHours":   dRuntime,
			"totalRuntime":   dRuntime,
		}

		mKey := "Khác"
		if len(dStr) >= 7 {
			mKey = dStr[:7]
		}
		mNum := 1
		if len(dStr) >= 7 {
			mNum = int(dStr[5]-'0')*10 + int(dStr[6]-'0')
		}
		qNum := (mNum-1)/3 + 1
		qKey := "Khác"
		if len(dStr) >= 4 {
			qKey = dStr[:4] + "-Q" + string(rune('0'+qNum))
		}

		if _, ok := monthMap[mKey]; !ok {
			mName := mKey
			mLabel := mKey
			if len(mKey) >= 7 {
				mName = "T" + mKey[5:7] + "/" + mKey[2:4]
				mLabel = "Tháng " + mKey[5:7] + "/" + mKey[:4]
			}
			monthMap[mKey] = &periodTeamAgg{
				periodKey:   mKey,
				name:        mName,
				periodLabel: mLabel,
				teamStats:   make(map[string]*teamDateStat),
			}
		}
		mRec := monthMap[mKey]
		mRec.totalActualQty += dActual
		mRec.totalPassQty += dPass
		mRec.totalDefectQty += dDefect
		mRec.totalTickets += dTickets
		mRec.totalRuntime += dRuntime

		if _, ok := quarterMap[qKey]; !ok {
			quarterMap[qKey] = &periodTeamAgg{
				periodKey:   qKey,
				name:        qKey,
				periodLabel: qKey,
				teamStats:   make(map[string]*teamDateStat),
			}
		}
		qRec := quarterMap[qKey]
		qRec.totalActualQty += dActual
		qRec.totalPassQty += dPass
		qRec.totalDefectQty += dDefect
		qRec.totalTickets += dTickets
		qRec.totalRuntime += dRuntime

		for _, tName := range teamList {
			tActual := 0.0
			tPass := 0.0
			tDefect := 0.0
			tTickets := 0
			tRuntime := 0.0
			if tds, ok := teamDailyMap[dStr][tName]; ok {
				tActual = tds.actualQty
				tPass = tds.passQty
				tDefect = tds.defectQty
				tTickets = tds.ticketCount
				tRuntime = math.Round(tds.runtimeHours*100) / 100

				if _, ok := mRec.teamStats[tName]; !ok {
					mRec.teamStats[tName] = &teamDateStat{}
				}
				mRec.teamStats[tName].actualQty += tds.actualQty
				mRec.teamStats[tName].passQty += tds.passQty
				mRec.teamStats[tName].defectQty += tds.defectQty
				mRec.teamStats[tName].ticketCount += tds.ticketCount
				mRec.teamStats[tName].runtimeHours += tds.runtimeHours

				if _, ok := qRec.teamStats[tName]; !ok {
					qRec.teamStats[tName] = &teamDateStat{}
				}
				qRec.teamStats[tName].actualQty += tds.actualQty
				qRec.teamStats[tName].passQty += tds.passQty
				qRec.teamStats[tName].defectQty += tds.defectQty
				qRec.teamStats[tName].ticketCount += tds.ticketCount
				qRec.teamStats[tName].runtimeHours += tds.runtimeHours
			}

			row[tName] = tActual
			row[tName+"_actualQty"] = tActual
			row[tName+"_passQty"] = tPass
			row[tName+"_defectQty"] = tDefect
			row[tName+"_tickets"] = tTickets
			row[tName+"_runtime"] = tRuntime
			tPassRate := 100.0
			tDefectRate := 0.0
			if tActual > 0 {
				tPassRate = math.Round((tPass/tActual)*1000) / 10
				tDefectRate = math.Round((tDefect/tActual)*1000) / 10
			}
			row[tName+"_passRate"] = tPassRate
			row[tName+"_defectRate"] = tDefectRate
		}

		dailyList = append(dailyList, row)
	}

	monthKeys := make([]string, 0, len(monthMap))
	for k := range monthMap {
		monthKeys = append(monthKeys, k)
	}
	sort.Strings(monthKeys)
	monthlyList := make([]map[string]interface{}, 0, len(monthKeys))
	for _, k := range monthKeys {
		m := monthMap[k]
		mRow := map[string]interface{}{
			"periodKey":      m.periodKey,
			"date":           m.periodKey,
			"name":           m.name,
			"periodLabel":    m.periodLabel,
			"actualQty":      m.totalActualQty,
			"totalActualQty": m.totalActualQty,
			"passQty":        m.totalPassQty,
			"totalPassQty":   m.totalPassQty,
			"defectQty":      m.totalDefectQty,
			"totalDefectQty": m.totalDefectQty,
			"ticketCount":    m.totalTickets,
			"totalTickets":   m.totalTickets,
			"runtimeHours":   math.Round(m.totalRuntime*100) / 100,
			"totalRuntime":   math.Round(m.totalRuntime*100) / 100,
		}
		for _, tName := range teamList {
			tAct := 0.0
			tPass := 0.0
			tDef := 0.0
			tTk := 0
			tRt := 0.0
			if ts, ok := m.teamStats[tName]; ok {
				tAct = ts.actualQty
				tPass = ts.passQty
				tDef = ts.defectQty
				tTk = ts.ticketCount
				tRt = math.Round(ts.runtimeHours*100) / 100
			}
			mRow[tName] = tAct
			mRow[tName+"_actualQty"] = tAct
			mRow[tName+"_passQty"] = tPass
			mRow[tName+"_defectQty"] = tDef
			mRow[tName+"_tickets"] = tTk
			mRow[tName+"_runtime"] = tRt
			pRate := 100.0
			dRate := 0.0
			if tAct > 0 {
				pRate = math.Round((tPass/tAct)*1000) / 10
				dRate = math.Round((tDef/tAct)*1000) / 10
			}
			mRow[tName+"_passRate"] = pRate
			mRow[tName+"_defectRate"] = dRate
		}
		monthlyList = append(monthlyList, mRow)
	}

	quarterKeys := make([]string, 0, len(quarterMap))
	for k := range quarterMap {
		quarterKeys = append(quarterKeys, k)
	}
	sort.Strings(quarterKeys)
	quarterlyList := make([]map[string]interface{}, 0, len(quarterKeys))
	for _, k := range quarterKeys {
		q := quarterMap[k]
		qRow := map[string]interface{}{
			"periodKey":      q.periodKey,
			"date":           q.periodKey,
			"name":           q.name,
			"periodLabel":    q.periodLabel,
			"actualQty":      q.totalActualQty,
			"totalActualQty": q.totalActualQty,
			"passQty":        q.totalPassQty,
			"totalPassQty":   q.totalPassQty,
			"defectQty":      q.totalDefectQty,
			"totalDefectQty": q.totalDefectQty,
			"ticketCount":    q.totalTickets,
			"totalTickets":   q.totalTickets,
			"runtimeHours":   math.Round(q.totalRuntime*100) / 100,
			"totalRuntime":   math.Round(q.totalRuntime*100) / 100,
		}
		for _, tName := range teamList {
			tAct := 0.0
			tPass := 0.0
			tDef := 0.0
			tTk := 0
			tRt := 0.0
			if ts, ok := q.teamStats[tName]; ok {
				tAct = ts.actualQty
				tPass = ts.passQty
				tDef = ts.defectQty
				tTk = ts.ticketCount
				tRt = math.Round(ts.runtimeHours*100) / 100
			}
			qRow[tName] = tAct
			qRow[tName+"_actualQty"] = tAct
			qRow[tName+"_passQty"] = tPass
			qRow[tName+"_defectQty"] = tDef
			qRow[tName+"_tickets"] = tTk
			qRow[tName+"_runtime"] = tRt
			pRate := 100.0
			dRate := 0.0
			if tAct > 0 {
				pRate = math.Round((tPass/tAct)*1000) / 10
				dRate = math.Round((tDef/tAct)*1000) / 10
			}
			qRow[tName+"_passRate"] = pRate
			qRow[tName+"_defectRate"] = dRate
		}
		quarterlyList = append(quarterlyList, qRow)
	}

	return &models.TeamTimelineBreakdownDTO{
		DailyList:     dailyList,
		MonthlyList:   monthlyList,
		QuarterlyList: quarterlyList,
		TeamList:      teamList,
		TeamClusters:  teamClusters,
	}
}

