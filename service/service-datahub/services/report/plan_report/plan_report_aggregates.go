package plan_report

import (
	"math"
	"sort"

	models "service-datahub/models/report"
)

type picDateStat struct {
	totalOrders    int
	khopSlCount    int
	khopJobCount   int
	sxSaiNgayCount int
	truotKhCount   int
	planQty        float64
	actualQty      float64
}

type timeDateStat struct {
	totalOrders     int
	timeChamCount   int
	timeNhanhCount  int
	timeDungCount   int
	timeNoDataCount int
}

type capaDateStat struct {
	totalOrders    int
	capaNhanhCount int
	capaChamCount  int
	capaDungCount  int
}

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
	dailyItemsMap     map[string]map[string]bool
	picDailyMap       map[string]map[string]*picDateStat
	timeDailyMap      map[string]*timeDateStat
	capaDailyMap      map[string]*capaDateStat
}

func newAggregateAccumulator() *aggregateAccumulator {
	return &aggregateAccumulator{
		distinctItems: make(map[string]bool),
		distinctDates: make(map[string]bool),
		picMap:        make(map[string]*models.PicPlanAggregate),
		teamMap:       make(map[string]*models.TeamPlanAggregate),
		machineMap:    make(map[string]*models.MachinePlanAggregate),
		dailyMap:      make(map[string]*models.DailyPlanAggregate),
		dailyItemsMap: make(map[string]map[string]bool),
		picDailyMap:   make(map[string]map[string]*picDateStat),
		timeDailyMap:  make(map[string]*timeDateStat),
		capaDailyMap:  make(map[string]*capaDateStat),
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
		if _, ok := acc.dailyItemsMap[date]; !ok {
			acc.dailyItemsMap[date] = make(map[string]bool)
		}
		if itemCode != "" {
			acc.dailyItemsMap[date][itemCode] = true
		}
		dAcc := acc.dailyMap[date]
		dAcc.OrderCount++
		dAcc.TotalOrders++
		dAcc.PlanQty += planQty
		dAcc.ActualQty += actualQty
		switch dpCode {
		case "SX_SAI_NGAY":
			dAcc.SxSaiNgayCount++
		case "TRUOT_KH":
			dAcc.TruotKhCount++
		case "KHOP_SL":
			dAcc.KhopSlCount++
		case "KHOP_JOB":
			dAcc.KhopJobCount++
		}

		// 5. PIC Daily Tracking
		if _, ok := acc.picDailyMap[date]; !ok {
			acc.picDailyMap[date] = make(map[string]*picDateStat)
		}
		if _, ok := acc.picDailyMap[date][pic]; !ok {
			acc.picDailyMap[date][pic] = &picDateStat{}
		}
		pds := acc.picDailyMap[date][pic]
		pds.totalOrders++
		pds.planQty += planQty
		pds.actualQty += actualQty
		switch dpCode {
		case "SX_SAI_NGAY":
			pds.sxSaiNgayCount++
		case "TRUOT_KH":
			pds.truotKhCount++
		case "KHOP_SL":
			pds.khopSlCount++
		case "KHOP_JOB":
			pds.khopJobCount++
		}

		// 6. Time Daily Tracking
		if _, ok := acc.timeDailyMap[date]; !ok {
			acc.timeDailyMap[date] = &timeDateStat{}
		}
		tds := acc.timeDailyMap[date]
		tds.totalOrders++
		switch timeStatus {
		case "Chậm hơn ĐM":
			tds.timeChamCount++
		case "Nhanh hơn ĐM":
			tds.timeNhanhCount++
		case "Đúng ĐM":
			tds.timeDungCount++
		default:
			tds.timeNoDataCount++
		}

		// 7. Capa Daily Tracking
		if _, ok := acc.capaDailyMap[date]; !ok {
			acc.capaDailyMap[date] = &capaDateStat{}
		}
		cds := acc.capaDailyMap[date]
		cds.totalOrders++
		switch capaStatus {
		case "Nhanh hơn ĐM":
			cds.capaNhanhCount++
		case "Chậm hơn ĐM":
			cds.capaChamCount++
		default:
			cds.capaDungCount++
		}
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

		tot := p.TotalOrders
		if tot > 0 {
			p.SxSaiNgayRate = math.Round((float64(p.SxSaiNgayCount)/float64(tot))*1000) / 10
			p.TruotKhRate = math.Round((float64(p.TruotKhCount)/float64(tot))*1000) / 10
			p.KhopSlRate = math.Round((float64(p.KhopSlCount)/float64(tot))*1000) / 10
			p.KhopJobRate = math.Round((float64(p.KhopJobCount)/float64(tot))*1000) / 10
			khopTotal := float64(p.KhopSlCount + p.KhopJobCount)
			p.PassBenchmarkRate = math.Round((khopTotal/float64(tot))*1000) / 10
			p.KhopRate = p.PassBenchmarkRate
		}

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
		d.TotalOrders = d.OrderCount
		if items, ok := acc.dailyItemsMap[d.Date]; ok {
			d.TotalItems = len(items)
		}
		if d.OrderCount > 0 {
			d.SxSaiNgayRate = math.Round((float64(d.SxSaiNgayCount)/float64(d.OrderCount))*1000) / 10
			d.TruotKhRate = math.Round((float64(d.TruotKhCount)/float64(d.OrderCount))*1000) / 10
			d.KhopSlRate = math.Round((float64(d.KhopSlCount)/float64(d.OrderCount))*1000) / 10
			d.KhopJobRate = math.Round((float64(d.KhopJobCount)/float64(d.OrderCount))*1000) / 10
		}
		list = append(list, *d)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Date < list[j].Date })
	return list
}

// BuildPicTimelineBreakdown: Tính toán chính xác tuyệt đối phân bổ theo từng ngày/tháng/quý của từng nhân sự điều phối (PIC)
func (acc *aggregateAccumulator) BuildPicTimelineBreakdown() *models.PicTimelineBreakdownDTO {
	picList := make([]string, 0, len(acc.picMap))
	for p := range acc.picMap {
		picList = append(picList, p)
	}
	sort.Strings(picList)

	dateList := make([]string, 0, len(acc.dailyMap))
	for d := range acc.dailyMap {
		dateList = append(dateList, d)
	}
	sort.Strings(dateList)

	dailyList := make([]map[string]interface{}, 0, len(dateList))

	type periodAgg struct {
		periodKey   string
		name        string
		periodLabel string
		totalOrders int
		khopSl      int
		khopJob     int
		sxSaiNgay   int
		truotKh     int
		picStats    map[string]*picDateStat
	}

	monthMap := make(map[string]*periodAgg)
	quarterMap := make(map[string]*periodAgg)

	for _, dStr := range dateList {
		dAcc := acc.dailyMap[dStr]
		shortDate := dStr
		if len(dStr) >= 10 {
			shortDate = dStr[8:10] + "/" + dStr[5:7]
		}
		passOrders := dAcc.KhopSlCount + dAcc.KhopJobCount
		passRate := 0.0
		if dAcc.TotalOrders > 0 {
			passRate = math.Round((float64(passOrders)/float64(dAcc.TotalOrders))*1000) / 10
		}

		picStatsMap := make(map[string]interface{})
		row := map[string]interface{}{
			"date":        dStr,
			"shortDate":   shortDate,
			"name":        shortDate,
			"totalOrders": dAcc.TotalOrders,
			"sxSaiNgay":   dAcc.SxSaiNgayCount,
			"truotKh":     dAcc.TruotKhCount,
			"khopSl":      dAcc.KhopSlCount,
			"khopJob":     dAcc.KhopJobCount,
			"passOrders":  passOrders,
			"passRate":    passRate,
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

		// Monthly Map Init
		if _, ok := monthMap[mKey]; !ok {
			mName := mKey
			mLabel := mKey
			if len(mKey) >= 7 {
				mName = "T" + mKey[5:7] + "/" + mKey[2:4]
				mLabel = "Tháng " + mKey[5:7] + "/" + mKey[:4]
			}
			monthMap[mKey] = &periodAgg{
				periodKey:   mKey,
				name:        mName,
				periodLabel: mLabel,
				picStats:    make(map[string]*picDateStat),
			}
		}
		mRec := monthMap[mKey]
		mRec.totalOrders += dAcc.TotalOrders
		mRec.khopSl += dAcc.KhopSlCount
		mRec.khopJob += dAcc.KhopJobCount
		mRec.sxSaiNgay += dAcc.SxSaiNgayCount
		mRec.truotKh += dAcc.TruotKhCount

		// Quarterly Map Init
		if _, ok := quarterMap[qKey]; !ok {
			quarterMap[qKey] = &periodAgg{
				periodKey:   qKey,
				name:        qKey,
				periodLabel: qKey,
				picStats:    make(map[string]*picDateStat),
			}
		}
		qRec := quarterMap[qKey]
		qRec.totalOrders += dAcc.TotalOrders
		qRec.khopSl += dAcc.KhopSlCount
		qRec.khopJob += dAcc.KhopJobCount
		qRec.sxSaiNgay += dAcc.SxSaiNgayCount
		qRec.truotKh += dAcc.TruotKhCount

		for _, p := range picList {
			if pds, ok := acc.picDailyMap[dStr][p]; ok {
				pPass := pds.khopSlCount + pds.khopJobCount
				pPassRate := 0.0
				if pds.totalOrders > 0 {
					pPassRate = math.Round((float64(pPass)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopSlRate := 0.0
				if pds.totalOrders > 0 {
					pKhopSlRate = math.Round((float64(pds.khopSlCount)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopJobRate := 0.0
				if pds.totalOrders > 0 {
					pKhopJobRate = math.Round((float64(pds.khopJobCount)/float64(pds.totalOrders))*1000) / 10
				}

				pStat := map[string]interface{}{
					"totalOrders": pds.totalOrders,
					"khopSl":      pds.khopSlCount,
					"khopJob":     pds.khopJobCount,
					"sxSaiNgay":   pds.sxSaiNgayCount,
					"truotKh":     pds.truotKhCount,
				}

				row[p] = pds.totalOrders
				row[p+"_orders"] = pds.totalOrders
				row[p+"_khopSl"] = pds.khopSlCount
				row[p+"_khopJob"] = pds.khopJobCount
				row[p+"_sxSaiNgay"] = pds.sxSaiNgayCount
				row[p+"_truotKh"] = pds.truotKhCount
				row[p+"_pass"] = pPass
				row[p+"_passRate"] = pPassRate
				row[p+"_khopSlRate"] = pKhopSlRate
				row[p+"_khopJobRate"] = pKhopJobRate
				picStatsMap[p] = pStat

				// Accumulate into monthly & quarterly for this PIC
				if _, ok := mRec.picStats[p]; !ok {
					mRec.picStats[p] = &picDateStat{}
				}
				mRec.picStats[p].totalOrders += pds.totalOrders
				mRec.picStats[p].khopSlCount += pds.khopSlCount
				mRec.picStats[p].khopJobCount += pds.khopJobCount
				mRec.picStats[p].sxSaiNgayCount += pds.sxSaiNgayCount
				mRec.picStats[p].truotKhCount += pds.truotKhCount

				if _, ok := qRec.picStats[p]; !ok {
					qRec.picStats[p] = &picDateStat{}
				}
				qRec.picStats[p].totalOrders += pds.totalOrders
				qRec.picStats[p].khopSlCount += pds.khopSlCount
				qRec.picStats[p].khopJobCount += pds.khopJobCount
				qRec.picStats[p].sxSaiNgayCount += pds.sxSaiNgayCount
				qRec.picStats[p].truotKhCount += pds.truotKhCount
			} else {
				pStat := map[string]interface{}{
					"totalOrders": 0,
					"khopSl":      0,
					"khopJob":     0,
					"sxSaiNgay":   0,
					"truotKh":     0,
				}
				row[p] = 0
				row[p+"_orders"] = 0
				row[p+"_khopSl"] = 0
				row[p+"_khopJob"] = 0
				row[p+"_sxSaiNgay"] = 0
				row[p+"_truotKh"] = 0
				row[p+"_pass"] = 0
				row[p+"_passRate"] = 0.0
				row[p+"_khopSlRate"] = 0.0
				row[p+"_khopJobRate"] = 0.0
				picStatsMap[p] = pStat
			}
		}
		row["picStats"] = picStatsMap
		dailyList = append(dailyList, row)
	}

	// Monthly list sorted
	mKeys := make([]string, 0, len(monthMap))
	for k := range monthMap {
		mKeys = append(mKeys, k)
	}
	sort.Strings(mKeys)

	monthlyList := make([]map[string]interface{}, 0, len(mKeys))
	for _, k := range mKeys {
		mRec := monthMap[k]
		passOrders := mRec.khopSl + mRec.khopJob
		passRate := 0.0
		if mRec.totalOrders > 0 {
			passRate = math.Round((float64(passOrders)/float64(mRec.totalOrders))*1000) / 10
		}

		picStatsMap := make(map[string]interface{})
		row := map[string]interface{}{
			"periodKey":   mRec.periodKey,
			"name":        mRec.name,
			"periodLabel": mRec.periodLabel,
			"totalOrders": mRec.totalOrders,
			"sxSaiNgay":   mRec.sxSaiNgay,
			"truotKh":     mRec.truotKh,
			"khopSl":      mRec.khopSl,
			"khopJob":     mRec.khopJob,
			"passOrders":  passOrders,
			"passRate":    passRate,
		}

		for _, p := range picList {
			if pds, ok := mRec.picStats[p]; ok {
				pPass := pds.khopSlCount + pds.khopJobCount
				pPassRate := 0.0
				if pds.totalOrders > 0 {
					pPassRate = math.Round((float64(pPass)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopSlRate := 0.0
				if pds.totalOrders > 0 {
					pKhopSlRate = math.Round((float64(pds.khopSlCount)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopJobRate := 0.0
				if pds.totalOrders > 0 {
					pKhopJobRate = math.Round((float64(pds.khopJobCount)/float64(pds.totalOrders))*1000) / 10
				}

				picStatsMap[p] = map[string]interface{}{
					"totalOrders": pds.totalOrders,
					"khopSl":      pds.khopSlCount,
					"khopJob":     pds.khopJobCount,
					"sxSaiNgay":   pds.sxSaiNgayCount,
					"truotKh":     pds.truotKhCount,
				}
				row[p] = pds.totalOrders
				row[p+"_orders"] = pds.totalOrders
				row[p+"_khopSl"] = pds.khopSlCount
				row[p+"_khopJob"] = pds.khopJobCount
				row[p+"_sxSaiNgay"] = pds.sxSaiNgayCount
				row[p+"_truotKh"] = pds.truotKhCount
				row[p+"_pass"] = pPass
				row[p+"_passRate"] = pPassRate
				row[p+"_khopSlRate"] = pKhopSlRate
				row[p+"_khopJobRate"] = pKhopJobRate
			} else {
				picStatsMap[p] = map[string]interface{}{
					"totalOrders": 0,
					"khopSl":      0,
					"khopJob":     0,
					"sxSaiNgay":   0,
					"truotKh":     0,
				}
				row[p] = 0
				row[p+"_orders"] = 0
				row[p+"_khopSl"] = 0
				row[p+"_khopJob"] = 0
				row[p+"_sxSaiNgay"] = 0
				row[p+"_truotKh"] = 0
				row[p+"_pass"] = 0
				row[p+"_passRate"] = 0.0
				row[p+"_khopSlRate"] = 0.0
				row[p+"_khopJobRate"] = 0.0
			}
		}
		row["picStats"] = picStatsMap
		monthlyList = append(monthlyList, row)
	}

	// Quarterly list sorted
	qKeys := make([]string, 0, len(quarterMap))
	for k := range quarterMap {
		qKeys = append(qKeys, k)
	}
	sort.Strings(qKeys)

	quarterlyList := make([]map[string]interface{}, 0, len(qKeys))
	for _, k := range qKeys {
		qRec := quarterMap[k]
		passOrders := qRec.khopSl + qRec.khopJob
		passRate := 0.0
		if qRec.totalOrders > 0 {
			passRate = math.Round((float64(passOrders)/float64(qRec.totalOrders))*1000) / 10
		}

		picStatsMap := make(map[string]interface{})
		row := map[string]interface{}{
			"periodKey":   qRec.periodKey,
			"name":        qRec.name,
			"periodLabel": qRec.periodLabel,
			"totalOrders": qRec.totalOrders,
			"sxSaiNgay":   qRec.sxSaiNgay,
			"truotKh":     qRec.truotKh,
			"khopSl":      qRec.khopSl,
			"khopJob":     qRec.khopJob,
			"passOrders":  passOrders,
			"passRate":    passRate,
		}

		for _, p := range picList {
			if pds, ok := qRec.picStats[p]; ok {
				pPass := pds.khopSlCount + pds.khopJobCount
				pPassRate := 0.0
				if pds.totalOrders > 0 {
					pPassRate = math.Round((float64(pPass)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopSlRate := 0.0
				if pds.totalOrders > 0 {
					pKhopSlRate = math.Round((float64(pds.khopSlCount)/float64(pds.totalOrders))*1000) / 10
				}
				pKhopJobRate := 0.0
				if pds.totalOrders > 0 {
					pKhopJobRate = math.Round((float64(pds.khopJobCount)/float64(pds.totalOrders))*1000) / 10
				}

				picStatsMap[p] = map[string]interface{}{
					"totalOrders": pds.totalOrders,
					"khopSl":      pds.khopSlCount,
					"khopJob":     pds.khopJobCount,
					"sxSaiNgay":   pds.sxSaiNgayCount,
					"truotKh":     pds.truotKhCount,
				}
				row[p] = pds.totalOrders
				row[p+"_orders"] = pds.totalOrders
				row[p+"_khopSl"] = pds.khopSlCount
				row[p+"_khopJob"] = pds.khopJobCount
				row[p+"_sxSaiNgay"] = pds.sxSaiNgayCount
				row[p+"_truotKh"] = pds.truotKhCount
				row[p+"_pass"] = pPass
				row[p+"_passRate"] = pPassRate
				row[p+"_khopSlRate"] = pKhopSlRate
				row[p+"_khopJobRate"] = pKhopJobRate
			} else {
				picStatsMap[p] = map[string]interface{}{
					"totalOrders": 0,
					"khopSl":      0,
					"khopJob":     0,
					"sxSaiNgay":   0,
					"truotKh":     0,
				}
				row[p] = 0
				row[p+"_orders"] = 0
				row[p+"_khopSl"] = 0
				row[p+"_khopJob"] = 0
				row[p+"_sxSaiNgay"] = 0
				row[p+"_truotKh"] = 0
				row[p+"_pass"] = 0
				row[p+"_passRate"] = 0.0
				row[p+"_khopSlRate"] = 0.0
				row[p+"_khopJobRate"] = 0.0
			}
		}
		row["picStats"] = picStatsMap
		quarterlyList = append(quarterlyList, row)
	}

	// PicGrowthList
	midIndex := len(dailyList) / 2
	firstHalfDays := dailyList[:midIndex]
	if midIndex == 0 && len(dailyList) > 0 {
		firstHalfDays = dailyList[:1]
	}
	secondHalfDays := dailyList[midIndex:]
	if len(secondHalfDays) == 0 && len(dailyList) > 0 {
		secondHalfDays = dailyList
	}

	picGrowthList := make([]map[string]interface{}, 0, len(picList))
	for _, p := range picList {
		firstHalf := 0
		secondHalf := 0
		total := 0
		khopSl := 0
		khopJob := 0
		sxSaiNgay := 0
		truotKh := 0
		dailySeries := make([]map[string]interface{}, 0, len(dailyList))

		for _, d := range firstHalfDays {
			if v, ok := d[p].(int); ok {
				firstHalf += v
			}
		}
		for _, d := range secondHalfDays {
			if v, ok := d[p].(int); ok {
				secondHalf += v
			}
		}

		for _, d := range dailyList {
			cnt := 0
			if v, ok := d[p].(int); ok {
				cnt = v
			}
			pRate := 0.0
			if v, ok := d[p+"_passRate"].(float64); ok {
				pRate = v
			}
			if pStats, ok := d["picStats"].(map[string]interface{}); ok {
				if ps, ok := pStats[p].(map[string]interface{}); ok {
					if v, ok := ps["khopSl"].(int); ok {
						khopSl += v
					}
					if v, ok := ps["khopJob"].(int); ok {
						khopJob += v
					}
					if v, ok := ps["sxSaiNgay"].(int); ok {
						sxSaiNgay += v
					}
					if v, ok := ps["truotKh"].(int); ok {
						truotKh += v
					}
				}
			}
			total += cnt
			dailySeries = append(dailySeries, map[string]interface{}{
				"date":      d["date"],
				"shortDate": d["shortDate"],
				"orders":    cnt,
				"passRate":  pRate,
			})
		}

		growthDiff := secondHalf - firstHalf
		growthRate := 0.0
		if firstHalf > 0 {
			growthRate = math.Round((float64(secondHalf-firstHalf)/float64(firstHalf))*1000) / 10
		} else if secondHalf > 0 {
			growthRate = 100.0
		}

		passCount := khopSl + khopJob
		passRate := 0.0
		if total > 0 {
			passRate = math.Round((float64(passCount)/float64(total))*1000) / 10
		}

		trendDirection := "STABLE"
		if growthRate > 5 || growthDiff >= 3 {
			trendDirection = "UP"
		} else if growthRate < -5 || growthDiff <= -3 {
			trendDirection = "DOWN"
		}

		picGrowthList = append(picGrowthList, map[string]interface{}{
			"pic":              p,
			"totalOrders":      total,
			"firstHalfOrders":  firstHalf,
			"secondHalfOrders": secondHalf,
			"growthDiff":       growthDiff,
			"growthRate":       growthRate,
			"trendDirection":   trendDirection,
			"passCount":        passCount,
			"passRate":         passRate,
			"khopSl":           khopSl,
			"khopJob":          khopJob,
			"sxSaiNgay":        sxSaiNgay,
			"truotKh":          truotKh,
			"dailySeries":      dailySeries,
		})
	}

	return &models.PicTimelineBreakdownDTO{
		DailyList:     dailyList,
		MonthlyList:   monthlyList,
		QuarterlyList: quarterlyList,
		PicList:       picList,
		PicGrowthList: picGrowthList,
	}
}

// BuildTimeTimelineBreakdown: Phân tích diễn biến trạng thái thời gian theo ngày/tháng/quý
func (acc *aggregateAccumulator) BuildTimeTimelineBreakdown() *models.TimeTimelineBreakdownDTO {
	dateList := make([]string, 0, len(acc.distinctDates))
	for d := range acc.distinctDates {
		dateList = append(dateList, d)
	}
	sort.Strings(dateList)

	categories := []map[string]interface{}{
		{"key": "timeCham", "name": "Chậm hơn ĐM", "color": "#dc2626"},
		{"key": "timeNhanh", "name": "Nhanh hơn ĐM", "color": "#0284c7"},
		{"key": "timeDung", "name": "Đúng ĐM", "color": "#01411b"},
		{"key": "timeNoData", "name": "Chưa có dữ liệu", "color": "#64748b"},
	}

	dailyList := make([]map[string]interface{}, 0, len(dateList))

	type periodAgg struct {
		periodKey       string
		name            string
		periodLabel     string
		totalOrders     int
		timeChamCount   int
		timeNhanhCount  int
		timeDungCount   int
		timeNoDataCount int
	}

	monthMap := make(map[string]*periodAgg)
	quarterMap := make(map[string]*periodAgg)

	for _, dStr := range dateList {
		shortDate := dStr
		if len(dStr) >= 10 {
			shortDate = dStr[8:10] + "/" + dStr[5:7]
		}
		tds := acc.timeDailyMap[dStr]
		total := 0
		cCham := 0
		cNhanh := 0
		cDung := 0
		cNoData := 0
		if tds != nil {
			total = tds.totalOrders
			cCham = tds.timeChamCount
			cNhanh = tds.timeNhanhCount
			cDung = tds.timeDungCount
			cNoData = tds.timeNoDataCount
		}

		calcRate := func(cnt int) float64 {
			if total > 0 {
				return math.Round((float64(cnt)/float64(total))*1000) / 10
			}
			return 0
		}

		row := map[string]interface{}{
			"date":           dStr,
			"shortDate":      shortDate,
			"name":           shortDate,
			"totalOrders":    total,
			"timeCham":       cCham,
			"timeNhanh":      cNhanh,
			"timeDung":       cDung,
			"timeNoData":     cNoData,
			"timeChamRate":   calcRate(cCham),
			"timeNhanhRate":  calcRate(cNhanh),
			"timeDungRate":   calcRate(cDung),
			"timeNoDataRate": calcRate(cNoData),
		}
		dailyList = append(dailyList, row)

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
			monthMap[mKey] = &periodAgg{
				periodKey:   mKey,
				name:        mName,
				periodLabel: mLabel,
			}
		}
		mRec := monthMap[mKey]
		mRec.totalOrders += total
		mRec.timeChamCount += cCham
		mRec.timeNhanhCount += cNhanh
		mRec.timeDungCount += cDung
		mRec.timeNoDataCount += cNoData

		if _, ok := quarterMap[qKey]; !ok {
			quarterMap[qKey] = &periodAgg{
				periodKey:   qKey,
				name:        qKey,
				periodLabel: qKey,
			}
		}
		qRec := quarterMap[qKey]
		qRec.totalOrders += total
		qRec.timeChamCount += cCham
		qRec.timeNhanhCount += cNhanh
		qRec.timeDungCount += cDung
		qRec.timeNoDataCount += cNoData
	}

	monthKeys := make([]string, 0, len(monthMap))
	for k := range monthMap {
		monthKeys = append(monthKeys, k)
	}
	sort.Strings(monthKeys)
	monthlyList := make([]map[string]interface{}, 0, len(monthKeys))
	for _, k := range monthKeys {
		m := monthMap[k]
		tot := m.totalOrders
		cRate := func(cnt int) float64 {
			if tot > 0 {
				return math.Round((float64(cnt)/float64(tot))*1000) / 10
			}
			return 0
		}
		monthlyList = append(monthlyList, map[string]interface{}{
			"periodKey":      m.periodKey,
			"date":           m.periodKey,
			"name":           m.name,
			"periodLabel":    m.periodLabel,
			"totalOrders":    tot,
			"timeCham":       m.timeChamCount,
			"timeNhanh":      m.timeNhanhCount,
			"timeDung":       m.timeDungCount,
			"timeNoData":     m.timeNoDataCount,
			"timeChamRate":   cRate(m.timeChamCount),
			"timeNhanhRate":  cRate(m.timeNhanhCount),
			"timeDungRate":   cRate(m.timeDungCount),
			"timeNoDataRate": cRate(m.timeNoDataCount),
		})
	}

	quarterKeys := make([]string, 0, len(quarterMap))
	for k := range quarterMap {
		quarterKeys = append(quarterKeys, k)
	}
	sort.Strings(quarterKeys)
	quarterlyList := make([]map[string]interface{}, 0, len(quarterKeys))
	for _, k := range quarterKeys {
		q := quarterMap[k]
		tot := q.totalOrders
		cRate := func(cnt int) float64 {
			if tot > 0 {
				return math.Round((float64(cnt)/float64(tot))*1000) / 10
			}
			return 0
		}
		quarterlyList = append(quarterlyList, map[string]interface{}{
			"periodKey":      q.periodKey,
			"date":           q.periodKey,
			"name":           q.name,
			"periodLabel":    q.periodLabel,
			"totalOrders":    tot,
			"timeCham":       q.timeChamCount,
			"timeNhanh":      q.timeNhanhCount,
			"timeDung":       q.timeDungCount,
			"timeNoData":     q.timeNoDataCount,
			"timeChamRate":   cRate(q.timeChamCount),
			"timeNhanhRate":  cRate(q.timeNhanhCount),
			"timeDungRate":   cRate(q.timeDungCount),
			"timeNoDataRate": cRate(q.timeNoDataCount),
		})
	}

	return &models.TimeTimelineBreakdownDTO{
		DailyList:     dailyList,
		MonthlyList:   monthlyList,
		QuarterlyList: quarterlyList,
		Categories:    categories,
	}
}

// BuildCapaTimelineBreakdown: Phân tích diễn biến trạng thái Capa theo ngày/tháng/quý
func (acc *aggregateAccumulator) BuildCapaTimelineBreakdown() *models.CapaTimelineBreakdownDTO {
	dateList := make([]string, 0, len(acc.distinctDates))
	for d := range acc.distinctDates {
		dateList = append(dateList, d)
	}
	sort.Strings(dateList)

	categories := []map[string]interface{}{
		{"key": "capaNhanh", "name": "Nhanh hơn ĐM", "color": "#01411b"},
		{"key": "capaCham", "name": "Chậm hơn ĐM", "color": "#dc2626"},
		{"key": "capaDung", "name": "Trống / Đúng capa", "color": "#64748b"},
	}

	dailyList := make([]map[string]interface{}, 0, len(dateList))

	type periodAgg struct {
		periodKey      string
		name           string
		periodLabel    string
		totalOrders    int
		capaNhanhCount int
		capaChamCount  int
		capaDungCount  int
	}

	monthMap := make(map[string]*periodAgg)
	quarterMap := make(map[string]*periodAgg)

	for _, dStr := range dateList {
		shortDate := dStr
		if len(dStr) >= 10 {
			shortDate = dStr[8:10] + "/" + dStr[5:7]
		}
		cds := acc.capaDailyMap[dStr]
		total := 0
		cNhanh := 0
		cCham := 0
		cDung := 0
		if cds != nil {
			total = cds.totalOrders
			cNhanh = cds.capaNhanhCount
			cCham = cds.capaChamCount
			cDung = cds.capaDungCount
		}

		calcRate := func(cnt int) float64 {
			if total > 0 {
				return math.Round((float64(cnt)/float64(total))*1000) / 10
			}
			return 0
		}

		row := map[string]interface{}{
			"date":          dStr,
			"shortDate":     shortDate,
			"name":          shortDate,
			"totalOrders":   total,
			"capaNhanh":     cNhanh,
			"capaCham":      cCham,
			"capaDung":      cDung,
			"capaNhanhRate": calcRate(cNhanh),
			"capaChamRate":  calcRate(cCham),
			"capaDungRate":  calcRate(cDung),
		}
		dailyList = append(dailyList, row)

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
			monthMap[mKey] = &periodAgg{
				periodKey:   mKey,
				name:        mName,
				periodLabel: mLabel,
			}
		}
		mRec := monthMap[mKey]
		mRec.totalOrders += total
		mRec.capaNhanhCount += cNhanh
		mRec.capaChamCount += cCham
		mRec.capaDungCount += cDung

		if _, ok := quarterMap[qKey]; !ok {
			quarterMap[qKey] = &periodAgg{
				periodKey:   qKey,
				name:        qKey,
				periodLabel: qKey,
			}
		}
		qRec := quarterMap[qKey]
		qRec.totalOrders += total
		qRec.capaNhanhCount += cNhanh
		qRec.capaChamCount += cCham
		qRec.capaDungCount += cDung
	}

	monthKeys := make([]string, 0, len(monthMap))
	for k := range monthMap {
		monthKeys = append(monthKeys, k)
	}
	sort.Strings(monthKeys)
	monthlyList := make([]map[string]interface{}, 0, len(monthKeys))
	for _, k := range monthKeys {
		m := monthMap[k]
		tot := m.totalOrders
		cRate := func(cnt int) float64 {
			if tot > 0 {
				return math.Round((float64(cnt)/float64(tot))*1000) / 10
			}
			return 0
		}
		monthlyList = append(monthlyList, map[string]interface{}{
			"periodKey":     m.periodKey,
			"date":          m.periodKey,
			"name":          m.name,
			"periodLabel":   m.periodLabel,
			"totalOrders":   tot,
			"capaNhanh":     m.capaNhanhCount,
			"capaCham":      m.capaChamCount,
			"capaDung":      m.capaDungCount,
			"capaNhanhRate": cRate(m.capaNhanhCount),
			"capaChamRate":  cRate(m.capaChamCount),
			"capaDungRate":  cRate(m.capaDungCount),
		})
	}

	quarterKeys := make([]string, 0, len(quarterMap))
	for k := range quarterMap {
		quarterKeys = append(quarterKeys, k)
	}
	sort.Strings(quarterKeys)
	quarterlyList := make([]map[string]interface{}, 0, len(quarterKeys))
	for _, k := range quarterKeys {
		q := quarterMap[k]
		tot := q.totalOrders
		cRate := func(cnt int) float64 {
			if tot > 0 {
				return math.Round((float64(cnt)/float64(tot))*1000) / 10
			}
			return 0
		}
		quarterlyList = append(quarterlyList, map[string]interface{}{
			"periodKey":     q.periodKey,
			"date":          q.periodKey,
			"name":          q.name,
			"periodLabel":   q.periodLabel,
			"totalOrders":   tot,
			"capaNhanh":     q.capaNhanhCount,
			"capaCham":      q.capaChamCount,
			"capaDung":      q.capaDungCount,
			"capaNhanhRate": cRate(q.capaNhanhCount),
			"capaChamRate":  cRate(q.capaChamCount),
			"capaDungRate":  cRate(q.capaDungCount),
		})
	}

	return &models.CapaTimelineBreakdownDTO{
		DailyList:     dailyList,
		MonthlyList:   monthlyList,
		QuarterlyList: quarterlyList,
		Categories:    categories,
	}
}
