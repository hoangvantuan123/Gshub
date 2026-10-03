package prod_stats_detail

import (
	"context"
	"math"
	"strconv"
	"strings"

	models "service-datahub/models/report"
)

// ProdStatsDetailQ - Truy vấn dữ liệu chi tiết Thống Kê Sản Xuất
func (s *ProdStatsDetailService) ProdStatsDetailQ(ctx context.Context, filters map[string]string) ([]models.ERPProdStatsDetail, *models.PlanPageInfo, error) {
	query := s.db.WithContext(ctx).Model(&models.ERPProdStatsDetail{})

	// 1. Lọc theo MasterSeq hoặc RegCode
	if val, ok := filters["MasterSeq"]; ok && val != "" {
		query = query.Where(`"MasterSeq" = ?`, val)
	}
	if val, ok := filters["RegCode"]; ok && val != "" {
		query = query.Where(`"RegCode" = ?`, val)
	}

	// 2. Lọc chuỗi tương đối ILIKE trên các cột TKSX
	likeFields := map[string]string{
		"ItemCode":     `"ItemCode"`,
		"ItemName":     `"ItemName"`,
		"OperationNo":  `"OperationNo"`,
		"MainWorker":   `"MainWorker"`,
		"MachineName":  `"MachineName"`,
		"MachineCode":  `"MachineCode"`,
		"TeamName":     `"TeamName"`,
		"StatTicketNo": `"StatTicketNo"`,
		"StatStaff":    `"StatStaff"`,
		"Customer":     `"Customer"`,
		"OrderNo":      `"OrderNo"`,
		"RoutingDocNo": `"RoutingDocNo"`,
		"Status":       `"Status"`,
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

	// 3. Lọc ngày thống kê StatDate
	if val, ok := filters["StatDate"]; ok && val != "" {
		query = query.Where(`"StatDate" = ?`, val)
	}
	if fromDate, ok := filters["StatDateFrom"]; ok && fromDate != "" {
		query = query.Where(`"StatDate" >= ?`, fromDate)
	}
	if toDate, ok := filters["StatDateTo"]; ok && toDate != "" {
		query = query.Where(`"StatDate" <= ?`, toDate)
	}

	// 4. Lọc IsActive
	if val, ok := filters["IsActive"]; ok && val != "" {
		if val == "1" || strings.EqualFold(val, "true") {
			query = query.Where(`"IsActive" = true`)
		} else if val == "0" || strings.EqualFold(val, "false") {
			query = query.Where(`"IsActive" = false`)
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
	sortField := `"RowSeq"`
	sortOrder := "ASC"
	if sf, ok := filters["sortField"]; ok && sf != "" {
		sortField = `"` + sf + `"`
	}
	if so, ok := filters["sortOrder"]; ok && strings.ToUpper(so) == "DESC" {
		sortOrder = "DESC"
	}

	var details []models.ERPProdStatsDetail
	err := query.Order(sortField + " " + sortOrder + `, "IdSeq" ASC`).Offset(offset).Limit(pageSize).Find(&details).Error
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
