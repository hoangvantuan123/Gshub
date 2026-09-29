package plan_master

import (
	"context"
	"math"
	"strconv"
	"strings"

	models "service-datahub/models/report"
)

// PlanMasterQ - Truy vấn Master đăng ký báo cáo theo bộ lọc
func (s *PlanMasterService) PlanMasterQ(ctx context.Context, filters map[string]string) ([]models.ERPPlanMaster, *models.PlanPageInfo, error) {
	query := s.db.WithContext(ctx).Model(&models.ERPPlanMaster{})

	// 1. Lọc chuỗi tương đối ILIKE
	likeFields := map[string]string{
		"RegCode":     `"RegCode"`,
		"FactoryName": `"FactoryName"`,
		"Remark":      `"Remark"`,
		"CreatedBy":   `"CreatedBy"`,
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

	// 2. Lọc chính xác EXACT
	if val, ok := filters["ReportType"]; ok && val != "" {
		query = query.Where(`"ReportType" = ?`, val)
	}
	if val, ok := filters["Status"]; ok && val != "" {
		query = query.Where(`"Status" = ?`, val)
	}
	if val, ok := filters["FactoryNameExact"]; ok && val != "" {
		query = query.Where(`"FactoryName" = ?`, val)
	}
	if val, ok := filters["IsActive"]; ok && val != "" {
		if val == "1" || strings.EqualFold(val, "true") {
			query = query.Where(`"IsActive" = true`)
		} else if val == "0" || strings.EqualFold(val, "false") {
			query = query.Where(`"IsActive" = false`)
		}
	}

	// 3. Lọc khoảng ngày áp dụng
	if fromDate, ok := filters["ApplyDateFrom"]; ok && fromDate != "" {
		query = query.Where(`"ApplyDate" >= ?`, fromDate)
	}
	if toDate, ok := filters["ApplyDateTo"]; ok && toDate != "" {
		query = query.Where(`"ApplyDate" <= ?`, toDate)
	}
	if exactDate, ok := filters["ApplyDate"]; ok && exactDate != "" {
		query = query.Where(`"ApplyDate" = ?`, exactDate)
	}

	// 4. Lọc ngày tạo CreatedAt
	if fromTime, ok := filters["CreatedAtFrom"]; ok && fromTime != "" {
		query = query.Where(`"CreatedAt" >= ?`, fromTime)
	}
	if toTime, ok := filters["CreatedAtTo"]; ok && toTime != "" {
		query = query.Where(`"CreatedAt" <= ?`, toTime)
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
	sortField := `"CreatedAt"`
	sortOrder := "DESC"
	if sf, ok := filters["sortField"]; ok && sf != "" {
		sortField = `"` + sf + `"`
	}
	if so, ok := filters["sortOrder"]; ok && strings.ToUpper(so) == "ASC" {
		sortOrder = "ASC"
	}

	var results []models.ERPPlanMaster
	err := query.Order(sortField + " " + sortOrder).Offset(offset).Limit(pageSize).Find(&results).Error
	if err != nil {
		return nil, nil, err
	}

	pageInfo := &models.PlanPageInfo{
		Page:         page,
		PageSize:     pageSize,
		Total:        totalFiltered,
		TotalAll:     s.GetTotalAll(),
		TotalPages:   totalPages,
		LoadedCount:  len(results),
		TotalColumns: 10,
	}

	return results, pageInfo, nil
}
