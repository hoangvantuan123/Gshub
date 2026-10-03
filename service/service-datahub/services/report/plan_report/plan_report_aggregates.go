package plan_report

import (
	"math"
	"sort"

	models "service-datahub/models/report"
)

type aggregateAccumulator struct {
	totalOrders       int
	totalPlanQty      float64
	totalActualQty    float64
	totalPassQty      float64
	sxSaiNgayCount    int
	truotKhCount      int
	khopSlCount       int
	khopJobCount      int
	timeChamCount     int
	timeNhanhCount    int
	timeDungCount     int
	timeNoDataCount   int
	capaChamCount     int
	capaNhanhCount    int
	capaDungCount     int
	distinctItems     map[string]bool
	distinctDates     map[string]bool
	picMap            map[string]*models.PicPlanAggregate
	teamMap           map[string]*models.TeamPlanAggregate
	machineMap        map[string]*models.MachinePlanAggregate
	dailyMap          map[string]*models.DailyPlanAggregate
}

func newAggregateAccumulator() *aggregateAccumulator {
	return &aggregateAccumulator{
		distinctItems: make(map[string]bool),
		distinctDates: make(map[string]bool),
		picMap:        make(map[string]*models.PicPlanAggregate),
		teamMap:       make(map[string]*models.TeamPlanAggregate),
		machineMap:    make(map[string]*models.MachinePlanAggregate),
		dailyMap:      make(map[string]*models.DailyPlanAggregate),
	}
}

func (acc *aggregateAccumulator) addRow(
	pic string,
	team string,
	machineCode string,
	machineName string,
	itemCode string,
	date string,
	planQty float64,
	actualQty float64,
	passQty float64,
	dpCode string,
	timeStatus string,
	capaStatus string,
) {
	acc.totalOrders++
	acc.totalPlanQty += planQty
	acc.totalActualQty += actualQty
	acc.totalPassQty += passQty

	if itemCode != "" {
		acc.distinctItems[itemCode] = true
	}
	if date != "" {
		acc.distinctDates[date] = true
	}

	// ĐP-SX
	switch dpCode {
	case "SX_SAI_NGAY":
		acc.sxSaiNgayCount++
	case "TRUOT_KH":
		acc.truotKhCount++
	case "KHOP_SL":
		acc.khopSlCount++
	case "KHOP_JOB":
		acc.khopJobCount++
	}

	// Thời gian
	switch timeStatus {
	case "Chậm hơn ĐM":
		acc.timeChamCount++
	case "Nhanh hơn ĐM":
		acc.timeNhanhCount++
	case "Đúng ĐM":
		acc.timeDungCount++
	default:
		acc.timeNoDataCount++
	}

	// Capa
	switch capaStatus {
	case "Chậm hơn ĐM":
		acc.capaChamCount++
	case "Nhanh hơn ĐM":
		acc.capaNhanhCount++
	default:
		acc.capaDungCount++
	}

	// 1. PIC Aggregate
	if pic == "" {
		pic = "Chung"
	}
	if _, ok := acc.picMap[pic]; !ok {
		acc.picMap[pic] = &models.PicPlanAggregate{
			Pic:     pic,
			PicName: pic,
		}
	}
	pAcc := acc.picMap[pic]
	pAcc.TotalOrders++
	pAcc.PlanQty += planQty
	pAcc.ActualQty += actualQty
	if dpCode == "SX_SAI_NGAY" {
		pAcc.SxSaiNgayCount++
	}
	if dpCode == "TRUOT_KH" {
		pAcc.TruotKhCount++
	}
	if dpCode == "KHOP_SL" {
		pAcc.KhopSlCount++
	}
	if dpCode == "KHOP_JOB" {
		pAcc.KhopJobCount++
	}

	// 2. Team Aggregate
	if team == "" {
		team = "Tổ sản xuất chung"
	}
	if _, ok := acc.teamMap[team]; !ok {
		acc.teamMap[team] = &models.TeamPlanAggregate{
			TeamName: team,
			TeamCode: team,
		}
	}
	tAcc := acc.teamMap[team]
	tAcc.TotalOrders++
	tAcc.PlanQty += planQty
	tAcc.ActualQty += actualQty

	// 3. Machine Aggregate
	if machineCode == "" {
		machineCode = "CHUNG"
	}
	if machineName == "" {
		machineName = machineCode
	}
	if _, ok := acc.machineMap[machineCode]; !ok {
		acc.machineMap[machineCode] = &models.MachinePlanAggregate{
			MachineCode: machineCode,
			MachineName: machineName,
			TeamName:    team,
		}
	}
	mAcc := acc.machineMap[machineCode]
	mAcc.TotalOrders++
	mAcc.PlanQty += planQty
	mAcc.ActualQty += actualQty

	// 4. Daily Aggregate
	if date != "" {
		if _, ok := acc.dailyMap[date]; !ok {
			acc.dailyMap[date] = &models.DailyPlanAggregate{
				Date: date,
			}
		}
		dAcc := acc.dailyMap[date]
		dAcc.OrderCount++
		dAcc.PlanQty += planQty
		dAcc.ActualQty += actualQty
	}
}

// BuildSummary: Tạo chỉ số KPI tổng hợp
func (acc *aggregateAccumulator) BuildSummary(fromDate, toDate string) models.PlanReportSummary {
	total := acc.totalOrders
	overallProg := 100.0
	if acc.totalPlanQty > 0 {
		overallProg = math.Round((acc.totalActualQty/acc.totalPlanQty)*1000) / 10
	}

	calcRate := func(cnt int) float64 {
		if total > 0 {
			return math.Round((float64(cnt)/float64(total))*1000) / 10
		}
		return 0
	}

	totalDays := len(acc.distinctDates)
	if totalDays == 0 {
		totalDays = calcDaysBetween(fromDate, toDate)
	}

	return models.PlanReportSummary{
		TotalOrders:     total,
		TotalTickets:    total,
		TotalPlanQty:    math.Round(acc.totalPlanQty*100) / 100,
		TotalActualQty:  math.Round(acc.totalActualQty*100) / 100,
		TotalPassQty:    math.Round(acc.totalPassQty*100) / 100,
		OverallProgress: overallProg,
		AvgPassRate:     overallProg,
		TotalItems:      len(acc.distinctItems),
		SxSaiNgayCount:  acc.sxSaiNgayCount,
		SxSaiNgayRate:   calcRate(acc.sxSaiNgayCount),
		TruotKhCount:    acc.truotKhCount,
		TruotKhRate:     calcRate(acc.truotKhCount),
		KhopSlCount:     acc.khopSlCount,
		KhopSlRate:      calcRate(acc.khopSlCount),
		KhopJobCount:    acc.khopJobCount,
		KhopJobRate:     calcRate(acc.khopJobCount),
		TotalDays:       totalDays,
		FromDate:        fromDate,
		ToDate:          toDate,
	}
}

// BuildDpStatusBreakdown: Phân tích trạng thái Điều Phối - Sản Xuất
func (acc *aggregateAccumulator) BuildDpStatusBreakdown() []models.PlanStatusBreakdownItem {
	total := acc.totalOrders
	calcRate := func(cnt int) float64 {
		if total > 0 {
			return math.Round((float64(cnt)/float64(total))*1000) / 10
		}
		return 0
	}

	return []models.PlanStatusBreakdownItem{
		{
			Name:  "SX sai ngày KH",
			Count: acc.sxSaiNgayCount,
			Rate:  calcRate(acc.sxSaiNgayCount),
			Color: "#ea580c",
			Tag:   "Cảnh báo lệch ngày",
		},
		{
			Name:  "Trượt KH",
			Count: acc.truotKhCount,
			Rate:  calcRate(acc.truotKhCount),
			Color: "#dc2626",
			Tag:   "Cảnh báo trượt",
		},
		{
			Name:  "Khớp số lượng",
			Count: acc.khopSlCount,
			Rate:  calcRate(acc.khopSlCount),
			Color: "#01411b",
			Tag:   "Đạt chuẩn SL",
		},
		{
			Name:  "Khớp job",
			Count: acc.khopJobCount,
			Rate:  calcRate(acc.khopJobCount),
			Color: "#166534",
			Tag:   "Đạt chuẩn job",
		},
	}
}

// BuildTimeStatusBreakdown: Phân tích so sánh thời gian với định mức
func (acc *aggregateAccumulator) BuildTimeStatusBreakdown() []models.PlanStatusBreakdownItem {
	total := acc.totalOrders
	calcRate := func(cnt int) float64 {
		if total > 0 {
			return math.Round((float64(cnt)/float64(total))*1000) / 10
		}
		return 0
	}

	return []models.PlanStatusBreakdownItem{
		{
			Name:  "Chậm hơn ĐM",
			Count: acc.timeChamCount,
			Rate:  calcRate(acc.timeChamCount),
			Color: "#dc2626",
			Tag:   "Vượt định mức giờ",
		},
		{
			Name:  "Nhanh hơn ĐM",
			Count: acc.timeNhanhCount,
			Rate:  calcRate(acc.timeNhanhCount),
			Color: "#0284c7",
			Tag:   "Tối ưu thời gian",
		},
		{
			Name:  "Đúng ĐM",
			Count: acc.timeDungCount,
			Rate:  calcRate(acc.timeDungCount),
			Color: "#01411b",
			Tag:   "Chuẩn định mức",
		},
		{
			Name:  "Chưa có dữ liệu",
			Count: acc.timeNoDataCount,
			Rate:  calcRate(acc.timeNoDataCount),
			Color: "#64748b",
			Tag:   "Trống thời gian",
		},
	}
}

// BuildCapaStatusBreakdown: Phân tích trạng thái Capa công suất
func (acc *aggregateAccumulator) BuildCapaStatusBreakdown() []models.PlanStatusBreakdownItem {
	total := acc.totalOrders
	calcRate := func(cnt int) float64 {
		if total > 0 {
			return math.Round((float64(cnt)/float64(total))*1000) / 10
		}
		return 0
	}

	return []models.PlanStatusBreakdownItem{
		{
			Name:  "Nhanh hơn ĐM",
			Count: acc.capaNhanhCount,
			Rate:  calcRate(acc.capaNhanhCount),
			Color: "#01411b",
			Tag:   "Capa vượt định mức",
		},
		{
			Name:  "Chậm hơn ĐM",
			Count: acc.capaChamCount,
			Rate:  calcRate(acc.capaChamCount),
			Color: "#dc2626",
			Tag:   "Capa dưới định mức",
		},
		{
			Name:  "Trống / Đúng capa",
			Count: acc.capaDungCount,
			Rate:  calcRate(acc.capaDungCount),
			Color: "#64748b",
			Tag:   "Đúng tiêu chuẩn",
		},
	}
}

// BuildPicBreakdown: Thống kê hiệu suất theo nhân sự Điều Phối
func (acc *aggregateAccumulator) BuildPicBreakdown() []models.PicPlanAggregate {
	list := make([]models.PicPlanAggregate, 0, len(acc.picMap))
	for _, p := range acc.picMap {
		pr := 100.0
		if p.PlanQty > 0 {
			pr = math.Round((p.ActualQty/p.PlanQty)*1000) / 10
		}
		p.PassRate = pr
		p.PlanQty = math.Round(p.PlanQty*100) / 100
		p.ActualQty = math.Round(p.ActualQty*100) / 100
		list = append(list, *p)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].TotalOrders > list[j].TotalOrders })
	return list
}

// BuildTeamBreakdown: Thống kê theo tổ sản xuất
func (acc *aggregateAccumulator) BuildTeamBreakdown() []models.TeamPlanAggregate {
	list := make([]models.TeamPlanAggregate, 0, len(acc.teamMap))
	for _, t := range acc.teamMap {
		pr := 100.0
		if t.PlanQty > 0 {
			pr = math.Round((t.ActualQty/t.PlanQty)*1000) / 10
		}
		t.PassRate = pr
		t.PlanQty = math.Round(t.PlanQty*100) / 100
		t.ActualQty = math.Round(t.ActualQty*100) / 100
		list = append(list, *t)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].TotalOrders > list[j].TotalOrders })
	return list
}

// BuildMachineBreakdown: Thống kê theo thiết bị
func (acc *aggregateAccumulator) BuildMachineBreakdown() []models.MachinePlanAggregate {
	list := make([]models.MachinePlanAggregate, 0, len(acc.machineMap))
	for _, m := range acc.machineMap {
		pr := 100.0
		if m.PlanQty > 0 {
			pr = math.Round((m.ActualQty/m.PlanQty)*1000) / 10
		}
		m.PassRate = pr
		m.PlanQty = math.Round(m.PlanQty*100) / 100
		m.ActualQty = math.Round(m.ActualQty*100) / 100
		list = append(list, *m)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].TotalOrders > list[j].TotalOrders })
	return list
}

// BuildDailyTrendData: Thống kê tiến độ theo ngày
func (acc *aggregateAccumulator) BuildDailyTrendData() []models.DailyPlanAggregate {
	list := make([]models.DailyPlanAggregate, 0, len(acc.dailyMap))
	for _, d := range acc.dailyMap {
		pr := 100.0
		if d.PlanQty > 0 {
			pr = math.Round((d.ActualQty/d.PlanQty)*1000) / 10
		}
		d.PassRate = pr
		d.PlanQty = math.Round(d.PlanQty*100) / 100
		d.ActualQty = math.Round(d.ActualQty*100) / 100
		list = append(list, *d)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Date < list[j].Date })
	return list
}
