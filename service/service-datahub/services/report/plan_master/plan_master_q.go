package plan_master

import (
	"context"
	"math"
	"strconv"
	"strings"
	"time"

	models "service-datahub/models/report"
)

// normalizeDateString chuẩn hóa các định dạng ngày (bao gồm cả ISO timestamp UTC như 2026-10-01T17:00:00.000Z) về YYYY-MM-DD theo giờ Việt Nam
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

// PlanMasterQ - Truy vấn Master đăng ký báo cáo theo bộ lọc
func (s *PlanMasterService) PlanMasterQ(ctx context.Context, filters map[string]string) ([]models.ERPPlanMaster, *models.PlanPageInfo, error) {
	query := s.db.WithContext(ctx).Model(&models.ERPPlanMaster{})

	// 1. Lọc chuỗi tương đối ILIKE
	likeFields := map[string]string{
		"RegCode":     `"RegCode"`,
		"FactoryCode": `"FactoryCode"`,
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
	if val, ok := filters["FactoryCodeExact"]; ok && val != "" {
		query = query.Where(`"FactoryCode" = ?`, val)
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
		cleanFrom := normalizeDateString(fromDate)
		if cleanFrom != "" {
			query = query.Where(`"ApplyDate" >= ?`, cleanFrom)
		}
	}
	if toDate, ok := filters["ApplyDateTo"]; ok && toDate != "" {
		cleanTo := normalizeDateString(toDate)
		if cleanTo != "" {
			query = query.Where(`"ApplyDate" <= ?`, cleanTo)
		}
	}
	if exactDate, ok := filters["ApplyDate"]; ok && exactDate != "" {
		cleanExact := normalizeDateString(exactDate)
		if cleanExact != "" {
			query = query.Where(`"ApplyDate" = ?`, cleanExact)
		}
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

	// 7. Sắp xếp (Ưu tiên theo thứ tự mới nhất ở cột ngày đăng ký báo cáo ApplyDate DESC)
	sortField := `"ApplyDate"`
	sortOrder := "DESC"
	if sf, ok := filters["sortField"]; ok && sf != "" {
		sortField = `"` + sf + `"`
	}
	if so, ok := filters["sortOrder"]; ok && strings.ToUpper(so) == "ASC" {
		sortOrder = "ASC"
	}

	orderClause := sortField + " " + sortOrder
	if sortField == `"ApplyDate"` {
		orderClause = `"ApplyDate" ` + sortOrder + `, "CreatedAt" ` + sortOrder + `, "IdSeq" ` + sortOrder
	} else if sortField == `"CreatedAt"` {
		orderClause = `"CreatedAt" ` + sortOrder + `, "ApplyDate" ` + sortOrder + `, "IdSeq" ` + sortOrder
	}

	var results []models.ERPPlanMaster
	err := query.Order(orderClause).Offset(offset).Limit(pageSize).Find(&results).Error
	if err != nil {
		return nil, nil, err
	}

	pageInfo := &models.PlanPageInfo{
		Page:         page,
		PageSize:     pageSize,
		TotalRows:    int(totalFiltered),
		Total:        totalFiltered,
		TotalAll:     s.GetTotalAll(),
		TotalPages:   totalPages,
		LoadedCount:  len(results),
		TotalColumns: 10,
	}

	return results, pageInfo, nil
}
