package prod_stats_detail

import (
	"context"
	"math"
	"strconv"
	"strings"
	"time"

	models "service-datahub/models/report"
)

// normalizeDateString chuẩn hóa các định dạng ngày về YYYY-MM-DD theo giờ Việt Nam
func normalizeDateString(val string) string {
	val = strings.TrimSpace(val)
	if val == "" {
		return ""
	}
	if strings.Contains(val, "T") {
		t, err := time.Parse(time.RFC3339, val)
		if err == nil {
			loc := time.FixedZone("Asia/Ho_Chi_Minh", 7*3600)
			return t.In(loc).Format("2006-01-02")
		}
		parts := strings.Split(val, "T")
		return parts[0]
	}
	return val
}

// ProdStatsDetailQ - Truy vấn dữ liệu chi tiết Thống Kê Sản Xuất kèm LEFT JOIN Master
func (s *ProdStatsDetailService) ProdStatsDetailQ(ctx context.Context, filters map[string]string) ([]models.ERPProdStatsDetail, *models.PlanPageInfo, error) {
	query := s.db.WithContext(ctx).Table(`"_ERPProdStatsDetail" AS d`).
		Joins(`LEFT JOIN "_ERPPlanMaster" AS m ON d."MasterSeq" = m."IdSeq" OR d."RegCode" = m."RegCode"`)

	// 1. Lọc theo MasterSeq hoặc RegCode
	if val, ok := filters["MasterSeq"]; ok && val != "" {
		query = query.Where(`d."MasterSeq" = ?`, val)
	}
	if val, ok := filters["RegCode"]; ok && val != "" {
		query = query.Where(`d."RegCode" ILIKE ?`, "%"+strings.TrimSpace(val)+"%")
	}

	// 2. Lọc chuỗi tương đối ILIKE trên các cột TKSX
	likeFields := map[string]string{
		"ItemCode":               `d."ItemCode"`,
		"ItemName":               `d."ItemName"`,
		"Version":                `d."Version"`,
		"Model":                  `d."Model"`,
		"OperationNo":            `d."OperationNo"`,
		"MainWorker":             `d."MainWorker"`,
		"SubWorker1":             `d."SubWorker1"`,
		"SubWorker2":             `d."SubWorker2"`,
		"BreakdownReason":        `d."BreakdownReason"`,
		"MachineCode":            `d."MachineCode"`,
		"MachineName":            `d."MachineName"`,
		"OpTypeCode":             `d."OpTypeCode"`,
		"OpTypeName":             `d."OpTypeName"`,
		"TeamName":               `d."TeamName"`,
		"Shift":                  `d."Shift"`,
		"WorkShiftName":          `d."Shift"`,
		"StatTicketNo":           `d."StatTicketNo"`,
		"StatStaff":              `d."StatStaff"`,
		"PicDp":                  `d."StatStaff"`,
		"Customer":               `d."Customer"`,
		"SalesStaff":             `d."SalesStaff"`,
		"OrderNo":                `d."OrderNo"`,
		"ProcessName":            `d."ProcessName"`,
		"Unit":                   `d."Unit"`,
		"RoutingDocNo":           `d."RoutingDocNo"`,
		"RoutingDate":            `d."RoutingDate"`,
		"Status":                 `d."Status"`,
		"AutoExport":             `d."AutoExport"`,
		"AutoImport":             `d."AutoImport"`,
		"ExportDocNo":            `d."ExportDocNo"`,
		"ImportDocNo":            `d."ImportDocNo"`,
		"CheckPlanStatus":        `d."CheckPlanStatus"`,
		"TicketCreationLocation": `d."TicketCreationLocation"`,
		"AutoIoStatus":           `d."AutoIoStatus"`,
		"UserMemo":               `d."UserMemo"`,
		"CreatedByName":          `d."CreatedByName"`,
	}

	for filterKey, colName := range likeFields {
		val := ""
		if v, ok := filters[filterKey]; ok && v != "" {
			val = v
		} else if v, ok := filters[strings.ToLower(filterKey)]; ok && v != "" {
			val = v
		}
		if val != "" {
			items := strings.FieldsFunc(val, func(r rune) bool { return r == ',' || r == ';' })
			if len(items) <= 1 {
				query = query.Where(colName+" ILIKE ?", "%"+strings.TrimSpace(val)+"%")
			} else {
				var orConditions []string
				var orArgs []interface{}
				for _, item := range items {
					itTrim := strings.TrimSpace(item)
					if itTrim != "" {
						orConditions = append(orConditions, colName+" ILIKE ?")
						orArgs = append(orArgs, "%"+itTrim+"%")
					}
				}
				if len(orConditions) > 0 {
					query = query.Where("("+strings.Join(orConditions, " OR ")+")", orArgs...)
				}
			}
		}
	}

	// 2.0 Lọc Công nhân (WorkerName tìm cả trong MainWorker, SubWorker1, SubWorker2)
	if wn, ok := filters["WorkerName"]; ok && wn != "" {
		items := strings.FieldsFunc(wn, func(r rune) bool { return r == ',' || r == ';' })
		var orConditions []string
		var orArgs []interface{}
		for _, item := range items {
			itTrim := strings.TrimSpace(item)
			if itTrim != "" {
				orConditions = append(orConditions, `(d."MainWorker" ILIKE ? OR d."SubWorker1" ILIKE ? OR d."SubWorker2" ILIKE ?)`)
				orArgs = append(orArgs, "%"+itTrim+"%", "%"+itTrim+"%", "%"+itTrim+"%")
			}
		}
		if len(orConditions) > 0 {
			query = query.Where("("+strings.Join(orConditions, " OR ")+")", orArgs...)
		}
	}

	// 2.1 Lọc từ khóa tổng quát Keyword
	if kw, ok := filters["Keyword"]; ok && kw != "" {
		kwTrim := strings.TrimSpace(kw)
		if kwTrim != "" {
			query = query.Where(`(d."ItemCode" ILIKE ? OR d."ItemName" ILIKE ? OR d."MachineName" ILIKE ? OR d."MachineCode" ILIKE ? OR d."TeamName" ILIKE ? OR d."StatTicketNo" ILIKE ? OR d."MainWorker" ILIKE ? OR d."OperationNo" ILIKE ? OR d."AutoIoStatus" ILIKE ? OR d."RegCode" ILIKE ? OR m."FactoryName" ILIKE ?)`,
				"%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%", "%"+kwTrim+"%")
		}
	}

	// 2.2 Lọc theo Nhà máy (FactoryName / FactoryCode)
	if fc, ok := filters["FactoryCode"]; ok && fc != "" {
		fcTrim := strings.ToUpper(strings.TrimSpace(fc))
		if strings.Contains(fcTrim, "GS5") {
			query = query.Where(`m."FactoryCode" ILIKE '%GS5%' OR d."MachineName" ILIKE '%GS5%' OR d."RegCode" ILIKE '%GS5%'`)
		} else if strings.Contains(fcTrim, "GS1") {
			query = query.Where(`(m."FactoryCode" ILIKE '%GS1%' OR m."FactoryCode" IS NULL) AND d."MachineName" NOT ILIKE '%GS5%' AND d."RegCode" NOT ILIKE '%GS5%'`)
		}
	} else if fn, ok := filters["FactoryName"]; ok && fn != "" {
		fnUpper := strings.ToUpper(fn)
		if strings.Contains(fnUpper, "GS5") || strings.Contains(fn, "Quế Võ") {
			query = query.Where(`m."FactoryName" ILIKE '%Quế Võ%' OR m."FactoryName" ILIKE '%GS5%' OR d."MachineName" ILIKE '%GS5%' OR d."RegCode" ILIKE '%GS5%'`)
		} else if strings.Contains(fnUpper, "GS1") || strings.Contains(fn, "Hà Nội") {
			query = query.Where(`(m."FactoryName" ILIKE '%Hà Nội%' OR m."FactoryName" ILIKE '%GS1%' OR m."FactoryName" IS NULL) AND d."MachineName" NOT ILIKE '%GS5%' AND d."RegCode" NOT ILIKE '%GS5%'`)
		}
	}

	// 3. Lọc ngày thống kê StatDate / StartDate / ApplyDate
	if val, ok := filters["ApplyDate"]; ok && val != "" {
		cleanDate := normalizeDateString(val)
		if cleanDate != "" {
			query = query.Where(`m."ApplyDate" = ?`, cleanDate)
		}
	}
	if val, ok := filters["StatDate"]; ok && val != "" {
		cleanDate := normalizeDateString(val)
		if cleanDate != "" {
			query = query.Where(`d."StatDate" = ?`, cleanDate)
		}
	}
	if fromDate, ok := filters["StatDateFrom"]; ok && fromDate != "" {
		cleanFrom := normalizeDateString(fromDate)
		if cleanFrom != "" {
			query = query.Where(`d."StatDate" >= ?`, cleanFrom)
		}
	}
	if toDate, ok := filters["StatDateTo"]; ok && toDate != "" {
		cleanTo := normalizeDateString(toDate)
		if cleanTo != "" {
			query = query.Where(`d."StatDate" <= ?`, cleanTo)
		}
	}
	if fromDate, ok := filters["FromDate"]; ok && fromDate != "" {
		cleanFrom := normalizeDateString(fromDate)
		if cleanFrom != "" {
			query = query.Where(`(d."StatDate" >= ? OR m."ApplyDate" >= ?)`, cleanFrom, cleanFrom)
		}
	}
	if toDate, ok := filters["ToDate"]; ok && toDate != "" {
		cleanTo := normalizeDateString(toDate)
		if cleanTo != "" {
			query = query.Where(`(d."StatDate" <= ? OR m."ApplyDate" <= ?)`, cleanTo, cleanTo)
		}
	}

	// 4. Lọc IsActive
	if val, ok := filters["IsActive"]; ok && val != "" {
		if val == "1" || strings.EqualFold(val, "true") {
			query = query.Where(`d."IsActive" = true`)
		} else if val == "0" || strings.EqualFold(val, "false") {
			query = query.Where(`d."IsActive" = false`)
		}
	}

	// 5. Đếm tổng số bản ghi
	var totalFiltered int64
	if err := query.Count(&totalFiltered).Error; err != nil {
		return nil, nil, err
	}

	// 6. Phân trang
	page := 1
	if p, ok := filters["page"]; ok && p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	pageSize := s.GetDefaultQueryLimit()
	if ps, ok := filters["pageSize"]; ok && ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			if val > s.GetMaxQueryLimit() {
				val = s.GetMaxQueryLimit()
			}
			pageSize = val
		}
	}

	offset := (page - 1) * pageSize
	totalPages := int(math.Ceil(float64(totalFiltered) / float64(pageSize)))
	if totalPages == 0 {
		totalPages = 1
	}

	// 7. Sắp xếp
	sortField := `d."RowSeq"`
	sortOrder := "ASC"
	if sf, ok := filters["sortField"]; ok && sf != "" {
		sortField = `d."` + sf + `"`
	}
	if so, ok := filters["sortOrder"]; ok && strings.ToUpper(so) == "DESC" {
		sortOrder = "DESC"
	}

	var details []models.ERPProdStatsDetail
	err := query.
		Select(`d.*, m."FactoryCode", m."FactoryName", m."ApplyDate", m."Status" AS "MasterStatus", m."Remark" AS "MasterRemark", m."ReportType"`).
		Order(sortField + " " + sortOrder + `, d."IdSeq" ASC`).
		Offset(offset).
		Limit(pageSize).
		Find(&details).Error
	if err != nil {
		return nil, nil, err
	}

	// Chuẩn hóa làm sạch số lượng chuỗi
	for i := range details {
		details[i].ProdQty = cleanNumberStr(details[i].ProdQty)
		details[i].PassQty = cleanNumberStr(details[i].PassQty)
		details[i].DefectQty = cleanNumberStr(details[i].DefectQty)
		details[i].ActualMeters = cleanNumberStr(details[i].ActualMeters)
		details[i].StandardMeters = cleanNumberStr(details[i].StandardMeters)
		details[i].TargetProdQty = cleanNumberStr(details[i].TargetProdQty)
		details[i].TargetPassQty = cleanNumberStr(details[i].TargetPassQty)
	}

	pageInfo := &models.PlanPageInfo{
		Page:         page,
		PageSize:     pageSize,
		TotalRows:    int(totalFiltered),
		Total:        totalFiltered,
		TotalAll:     s.GetTotalAll(),
		TotalPages:   totalPages,
		LoadedCount:  len(details),
		TotalColumns: 40,
	}

	return details, pageInfo, nil
}
