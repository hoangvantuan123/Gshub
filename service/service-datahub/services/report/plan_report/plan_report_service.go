package plan_report

import (
	"context"
	"math"
	"sort"
	"strings"

	models "service-datahub/models/report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type PlanReportService struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewPlanReportService(db *gorm.DB, logger *zap.Logger) *PlanReportService {
	return &PlanReportService{
		db:     db,
		logger: logger,
	}
}

// GenerateProductionPlanReport: Xử lý và tổng hợp toàn diện Báo Cáo Kế Hoạch Sản Xuất
func (s *PlanReportService) GenerateProductionPlanReport(ctx context.Context, filters map[string]string) (*models.PlanReportResponse, error) {
	regCode := getFilterValue(filters, "regCode", "RegCode", "reg_code")
	masterSeq := getFilterValue(filters, "masterSeq", "MasterSeq", "master_seq")
	factoryCode := getFilterValue(filters, "factoryCode", "FactoryCode", "factory_code", "plantCode", "PlantCode")
	planDateFrom := getFilterValue(filters, "planDateFrom", "PlanDateFrom", "fromDate", "FromDate", "dateFrom", "DateFrom", "from_date", "date_from")
	planDateTo := getFilterValue(filters, "planDateTo", "PlanDateTo", "toDate", "ToDate", "dateTo", "DateTo", "to_date", "date_to")
	pic := getFilterValue(filters, "pic", "Pic", "picDp", "PicDp", "planner", "Planner")
	teamName := getFilterValue(filters, "teamName", "TeamName", "team", "Team", "opTypeName", "OpTypeName")
	machineCode := getFilterValue(filters, "machineCode", "MachineCode", "machine", "Machine", "machineName", "MachineName")
	itemCode := getFilterValue(filters, "itemCode", "ItemCode", "item_code")
	orderNo := getFilterValue(filters, "orderNo", "OrderNo", "routingDocNo", "RoutingDocNo")
	status := getFilterValue(filters, "status", "Status", "statusDpSx", "StatusDpSx")

	query := s.db.WithContext(ctx).Model(&models.ERPPlanDetail{})

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

	// 3. Lọc ngày điều phối & ngày kế hoạch
	if planDateFrom != "" && planDateTo != "" {
		from10 := planDateFrom
		if len(from10) > 10 {
			from10 = from10[:10]
		}
		to10 := planDateTo
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

		query = query.Where(`(LEFT("OpDate", 10) >= ? AND LEFT("OpDate", 10) <= ?) OR (LEFT("RoutingDocDate", 10) >= ? AND LEFT("RoutingDocDate", 10) <= ?) OR ("RegCode" IN (?))`,
			from10, to10, from10, to10, subDateMaster)
	} else if planDateFrom != "" {
		from10 := planDateFrom
		if len(from10) > 10 {
			from10 = from10[:10]
		}
		subDateMaster := s.db.Model(&models.ERPPlanMaster{}).
			Select(`"RegCode"`).
			Where(`LEFT("ApplyDate", 10) >= ? OR "ApplyDate" >= ?`, from10, from10)
		if factoryCode != "" && factoryCode != "ALL" {
			subDateMaster = subDateMaster.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}

		query = query.Where(`LEFT("OpDate", 10) >= ? OR LEFT("RoutingDocDate", 10) >= ? OR ("RegCode" IN (?))`,
			from10, from10, subDateMaster)
	} else if planDateTo != "" {
		to10 := planDateTo
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

		query = query.Where(`LEFT("OpDate", 10) <= ? OR LEFT("RoutingDocDate", 10) <= ? OR ("RegCode" IN (?))`,
			to10, to10, subDateMaster)
	}

	// 4. Lọc PIC, Tổ, Máy, Item, Order, Status
	if pic != "" && pic != "ALL" {
		query = query.Where(`"PicDp" ILIKE ?`, "%"+pic+"%")
	}
	if teamName != "" && teamName != "ALL" {
		query = query.Where(`"OpTypeName" ILIKE ? OR "OperationName" ILIKE ?`, "%"+teamName+"%", "%"+teamName+"%")
	}
	if machineCode != "" && machineCode != "ALL" {
		query = query.Where(`"MachineName" ILIKE ?`, "%"+machineCode+"%")
	}
	if itemCode != "" {
		query = query.Where(`"ItemCode" ILIKE ? OR "ItemName" ILIKE ?`, "%"+itemCode+"%", "%"+itemCode+"%")
	}
	if orderNo != "" {
		query = query.Where(`"RoutingDocNo" ILIKE ? OR "OperationNo" ILIKE ?`, "%"+orderNo+"%", "%"+orderNo+"%")
	}
	if status != "" && status != "ALL" {
		query = query.Where(`"StatusDpSx" ILIKE ?`, "%"+status+"%")
	}

	var rawList []models.ERPPlanDetail
	err := query.Order(`"RowSeq" ASC, "IdSeq" ASC`).Find(&rawList).Error
	if err != nil {
		return nil, err
	}

	// Nếu không tìm thấy và không lọc chi tiết, lấy đợt Master mới nhất
	if len(rawList) == 0 && regCode == "" && masterSeq == "" && planDateFrom == "" && planDateTo == "" {
		var latestMaster models.ERPPlanMaster
		masterQuery := s.db.Model(&models.ERPPlanMaster{}).
			Where(`"ReportType" = 'plan' OR "ReportType" = 'khsx' OR "ReportType" = 'Kế hoạch sản xuất'`)
		if factoryCode != "" {
			masterQuery = masterQuery.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
		}
		if errM := masterQuery.Order(`"CreatedAt" DESC`).First(&latestMaster).Error; errM == nil && latestMaster.RegCode != "" {
			_ = s.db.Where(`"RegCode" = ? OR "MasterSeq" = ?`, latestMaster.RegCode, latestMaster.IdSeq).Find(&rawList).Error
		}
	}

	// Tải danh sách Master KHSX (đợt kế hoạch) trước để ánh xạ ngày áp dụng chuẩn
	var masterList []models.ERPPlanMaster
	mQuery := s.db.WithContext(ctx).Model(&models.ERPPlanMaster{}).
		Where(`"ReportType" ILIKE '%plan%' OR "ReportType" ILIKE '%khsx%' OR "ReportType" = 'Kế hoạch sản xuất'`)
	if factoryCode != "" && factoryCode != "ALL" {
		mQuery = mQuery.Where(`"FactoryCode" ILIKE ? OR "FactoryName" ILIKE ?`, "%"+factoryCode+"%", "%"+factoryCode+"%")
	}
	_ = mQuery.Order(`"ApplyDate" DESC, "CreatedAt" DESC`).Limit(200).Find(&masterList).Error

	masterMap := make(map[string]models.ERPPlanMaster)
	for _, m := range masterList {
		if m.RegCode != "" {
			masterMap[m.RegCode] = m
		}
		if m.IdSeq != "" {
			masterMap[m.IdSeq] = m
		}
	}

	// Khởi tạo accumulator tổng hợp
	accumulator := newAggregateAccumulator()
	items := make([]models.PlanDetailReportItem, 0, len(rawList))
	picSet := make(map[string]bool)
	teamSet := make(map[string]bool)
	machineSet := make(map[string]bool)
	dateSet := make(map[string]bool)

	for _, row := range rawList {
		planQty := parseNumber(row.TargetProdQty, parseNumber(row.TargetPassQty, 0))
		actualQty := parseNumber(row.StatPassQty, planQty)
		passQty := actualQty
		defectQty := math.Max(0, planQty-actualQty)

		passRate := 100.0
		if planQty > 0 {
			passRate = math.Round((actualQty/planQty)*10000) / 100
		}

		picVal := "Admin"
		if row.PicDp != nil && strings.TrimSpace(*row.PicDp) != "" {
			picVal = strings.TrimSpace(*row.PicDp)
		}
		picSet[picVal] = true

		teamVal := "Tổ sản xuất"
		if row.OpTypeName != nil && strings.TrimSpace(*row.OpTypeName) != "" {
			teamVal = strings.TrimSpace(*row.OpTypeName)
		} else if row.OperationName != nil && strings.TrimSpace(*row.OperationName) != "" {
			teamVal = strings.TrimSpace(*row.OperationName)
		}
		teamSet[teamVal] = true

		machineVal := "Thiết bị"
		if row.MachineName != nil && strings.TrimSpace(*row.MachineName) != "" {
			machineVal = strings.TrimSpace(*row.MachineName)
		}
		machineSet[machineVal] = true

		itemCodeVal := ""
		if row.ItemCode != nil {
			itemCodeVal = strings.TrimSpace(*row.ItemCode)
		}

		planDate := cleanDateString(row.RoutingDocDate)
		actualDate := cleanDateString(row.OpDate)
		effectiveDate := ""

		// Ưu tiên lấy theo ngày đăng ký báo cáo ApplyDate của Master
		if row.MasterSeq != "" {
			if m, ok := masterMap[row.MasterSeq]; ok && m.ApplyDate != nil && *m.ApplyDate != "" {
				effectiveDate = cleanDateString(m.ApplyDate)
			}
		}
		if effectiveDate == "" && row.RegCode != "" {
			if m, ok := masterMap[row.RegCode]; ok && m.ApplyDate != nil && *m.ApplyDate != "" {
				effectiveDate = cleanDateString(m.ApplyDate)
			}
		}
		if effectiveDate == "" {
			effectiveDate = planDate
		}
		if effectiveDate == "" {
			effectiveDate = actualDate
		}
		if effectiveDate != "" {
			dateSet[effectiveDate] = true
		}

		dpCode, dpText := categorizeDpStatus(row.StatusDpSx, planQty, actualQty, row.OpDate, row.RoutingDocDate)
		timeStat := categorizeTimeStatus(row.TimeStatus)
		capaStat := categorizeCapaStatus(row.CapaStatus)

		// Thêm vào accumulator
		accumulator.addRow(
			picVal,
			teamVal,
			machineVal,
			machineVal,
			itemCodeVal,
			effectiveDate,
			planQty,
			actualQty,
			passQty,
			dpCode,
			timeStat,
			capaStat,
		)

		// Dựng item hoàn chỉnh cho FE
		idStr := row.IdSeq
		docNo := ""
		if row.OperationNo != nil {
			docNo = *row.OperationNo
		}
		orderNo := ""
		if row.RoutingDocNo != nil {
			orderNo = *row.RoutingDocNo
		}

		item := models.PlanDetailReportItem{
			ERPPlanDetail:  row,
			Id:             &idStr,
			DocNo:          &docNo,
			OrderNoVal:     &orderNo,
			PlanNoVal:      &docNo,
			PicVal:         &picVal,
			MachineCodeVal: &machineVal,
			MachineNameVal: &machineVal,
			TeamNameVal:    &teamVal,
			TeamVal:        &teamVal,
			PlanQtyVal:     &planQty,
			ActualQtyVal:   &actualQty,
			PassQtyVal:     &passQty,
			DefectQtyVal:   &defectQty,
			PassRateVal:    &passRate,
			PlanDateVal:    &planDate,
			ActualDateVal:  &actualDate,
			DpStatusCode:   &dpCode,
			DpStatusText:   &dpText,
			TimeStatusText: &timeStat,
			CapaStatusText: &capaStat,
		}
		items = append(items, item)
	}

	// Xây dựng các khối dữ liệu
	summary := accumulator.BuildSummary(planDateFrom, planDateTo)
	dpStatusBreakdown := accumulator.BuildDpStatusBreakdown()
	timeStatusBreakdown := accumulator.BuildTimeStatusBreakdown()
	capaStatusBreakdown := accumulator.BuildCapaStatusBreakdown()
	picBreakdown := accumulator.BuildPicBreakdown()
	teamBreakdown := accumulator.BuildTeamBreakdown()
	machineBreakdown := accumulator.BuildMachineBreakdown()
	dailyTrendData := accumulator.BuildDailyTrendData()
	picTimelineBreakdown := accumulator.BuildPicTimelineBreakdown()
	timeTimelineBreakdown := accumulator.BuildTimeTimelineBreakdown()
	capaTimelineBreakdown := accumulator.BuildCapaTimelineBreakdown()
	_ = mQuery.Order(`"ApplyDate" DESC, "CreatedAt" DESC`).Limit(100).Find(&masterList).Error

	planMasterOpts := make([]models.PlanMasterOption, 0, len(masterList))
	for _, m := range masterList {
		applyDate := ""
		if m.ApplyDate != nil {
			applyDate = *m.ApplyDate
		}
		remark := ""
		if m.Remark != nil {
			remark = *m.Remark
		}
		fCode := "GS1"
		if m.FactoryCode != nil {
			fCode = *m.FactoryCode
		}
		fName := "GS1 Hà Nội"
		if m.FactoryName != nil {
			fName = *m.FactoryName
		}
		planMasterOpts = append(planMasterOpts, models.PlanMasterOption{
			RegCode:     m.RegCode,
			MasterSeq:   m.IdSeq,
			FactoryCode: fCode,
			FactoryName: fName,
			ApplyDate:   applyDate,
			Remark:      remark,
			TotalRows:   m.TotalRows,
		})
	}

	// Filter options
	picsList := getKeysFromMap(picSet)
	teamsList := getKeysFromMap(teamSet)
	machinesList := getKeysFromMap(machineSet)
	datesList := getKeysFromMap(dateSet)
	sort.Strings(picsList)
	sort.Strings(teamsList)
	sort.Strings(machinesList)
	sort.Strings(datesList)

	filterOpts := models.PlanFilterOptionList{
		Factories:   []string{"GS1", "GS5"},
		PlanMasters: planMasterOpts,
		Pics:        picsList,
		Teams:       teamsList,
		Machines:    machinesList,
		Dates:       datesList,
	}

	withoutItems := getFilterValue(filters, "withoutItems", "WithoutItems", "without_items")

	pagedItems := make([]models.PlanDetailReportItem, 0)
	if withoutItems != "true" && withoutItems != "1" {
		pagedItems = items
	}

	totalRecords := int64(len(items))

	return &models.PlanReportResponse{
		Summary:               summary,
		DpStatusBreakdown:     dpStatusBreakdown,
		TimeStatusBreakdown:   timeStatusBreakdown,
		CapaStatusBreakdown:   capaStatusBreakdown,
		PicBreakdown:          picBreakdown,
		TeamBreakdown:         teamBreakdown,
		MachineBreakdown:      machineBreakdown,
		DailyTrendData:        dailyTrendData,
		PicTimelineBreakdown:  picTimelineBreakdown,
		TimeTimelineBreakdown: timeTimelineBreakdown,
		CapaTimelineBreakdown: capaTimelineBreakdown,
		FilterOptions:         filterOpts,
		Items:                 pagedItems,
		Pagination: models.PlanPageInfo{
			Page:        1,
			PageSize:    len(pagedItems),
			TotalRows:   int(totalRecords),
			Total:       totalRecords,
			TotalPages:  1,
			TotalAll:    totalRecords,
			LoadedCount: len(pagedItems),
		},
	}, nil
}
