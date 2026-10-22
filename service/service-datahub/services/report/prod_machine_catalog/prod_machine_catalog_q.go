package prod_machine_catalog

import (
	"context"
	models "service-datahub/models/report"
	"strconv"
	"strings"
)

// splitSearchTokens splits multiple search values by comma, semicolon, newline, or tab.
func splitSearchTokens(input string) []string {
	var tokens []string
	rawTokens := strings.FieldsFunc(input, func(r rune) bool {
		return r == ',' || r == ';' || r == '\n' || r == '\r' || r == '\t'
	})
	for _, tok := range rawTokens {
		trimmed := strings.TrimSpace(tok)
		if trimmed != "" {
			tokens = append(tokens, trimmed)
		}
	}
	return tokens
}

func (s *ProdMachineCatalogService) ProdMachineCatalogQ(ctx context.Context, filters map[string]string) ([]models.ERPProdMachineCatalog, *models.PlanPageInfo, error) {
	f := map[string]string{}
	for k, v := range filters {
		f[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	page, size := 1, 100
	for key, dst := range map[string]*int{"page": &page, "pagesize": &size} {
		if f[key] != "" {
			n, err := strconv.Atoi(f[key])
			if err != nil || n < 1 || n > 1000000 {
				return nil, nil, invalid("Phân trang không hợp lệ")
			}
			*dst = n
		}
	}
	if size > 1000 {
		return nil, nil, invalid("pageSize tối đa 1000")
	}
	if id := f["idseq"]; id != "" && !validID(id) {
		return nil, nil, invalid("IdSeq không hợp lệ")
	}
	var active bool
	if val := f["isactive"]; val != "" {
		var err error
		active, err = strconv.ParseBool(val)
		if err != nil {
			return nil, nil, invalid("IsActive không hợp lệ")
		}
	}
	q := s.db.WithContext(ctx).Model(&models.ERPProdMachineCatalog{})
	if id := f["idseq"]; id != "" {
		q = q.Where(`"IdSeq" = ?`, id)
	}

	// Lọc theo các trường đơn lẻ, hỗ trợ tìm kiếm nhiều giá trị phân tách bởi dấu phẩy/chấm phẩy/xuống dòng
	for _, field := range []string{"MachineCode", "MachineName", "TeamCode", "TeamName", "Factory"} {
		lowerField := strings.ToLower(field)
		if val := f[lowerField]; val != "" {
			tokens := splitSearchTokens(val)
			if len(tokens) == 1 {
				q = q.Where(`"`+field+`" ILIKE ?`, "%"+tokens[0]+"%")
			} else if len(tokens) > 1 {
				var conds []string
				var args []interface{}
				for _, tok := range tokens {
					conds = append(conds, `"`+field+`" ILIKE ?`)
					args = append(args, "%"+tok+"%")
				}
				q = q.Where("("+strings.Join(conds, " OR ")+")", args...)
			}
		}
	}

	// Hỗ trợ alias deptcode / deptname nếu có truyền
	if val := f["deptcode"]; val != "" && f["teamcode"] == "" {
		tokens := splitSearchTokens(val)
		if len(tokens) == 1 {
			q = q.Where(`"TeamCode" ILIKE ?`, "%"+tokens[0]+"%")
		} else if len(tokens) > 1 {
			var conds []string
			var args []interface{}
			for _, tok := range tokens {
				conds = append(conds, `"TeamCode" ILIKE ?`)
				args = append(args, "%"+tok+"%")
			}
			q = q.Where("("+strings.Join(conds, " OR ")+")", args...)
		}
	}
	if val := f["deptname"]; val != "" && f["teamname"] == "" {
		tokens := splitSearchTokens(val)
		if len(tokens) == 1 {
			q = q.Where(`"TeamName" ILIKE ?`, "%"+tokens[0]+"%")
		} else if len(tokens) > 1 {
			var conds []string
			var args []interface{}
			for _, tok := range tokens {
				conds = append(conds, `"TeamName" ILIKE ?`)
				args = append(args, "%"+tok+"%")
			}
			q = q.Where("("+strings.Join(conds, " OR ")+")", args...)
		}
	}

	// Lọc theo Từ khóa tổng hợp (Keyword) - Hỗ trợ tìm kiếm nhiều mã máy/tổ phân tách bởi dấu phẩy/chấm phẩy/xuống dòng
	if val := f["keyword"]; val != "" {
		tokens := splitSearchTokens(val)
		if len(tokens) == 1 {
			kw := "%" + tokens[0] + "%"
			q = q.Where(`("MachineCode" ILIKE ? OR "MachineName" ILIKE ? OR "TeamCode" ILIKE ? OR "TeamName" ILIKE ? OR "Factory" ILIKE ? OR "Description" ILIKE ?)`,
				kw, kw, kw, kw, kw, kw)
		} else if len(tokens) > 1 {
			var conds []string
			var args []interface{}
			for _, tok := range tokens {
				kw := "%" + tok + "%"
				conds = append(conds, `("MachineCode" ILIKE ? OR "MachineName" ILIKE ? OR "TeamCode" ILIKE ? OR "TeamName" ILIKE ? OR "Factory" ILIKE ? OR "Description" ILIKE ?)`)
				args = append(args, kw, kw, kw, kw, kw, kw)
			}
			q = q.Where("("+strings.Join(conds, " OR ")+")", args...)
		}
	}

	if val := f["isactive"]; val != "" {
		q = q.Where(`"IsActive" = ?`, active)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}
	rows := make([]models.ERPProdMachineCatalog, 0)
	if err := q.Order(`"IdxNo" ASC NULLS LAST, "MachineCode" ASC, "IdSeq" ASC`).
		Offset((page - 1) * size).Limit(size).Find(&rows).Error; err != nil {
		return nil, nil, err
	}
	return rows, &models.PlanPageInfo{
		Page:         page,
		PageSize:     size,
		Total:        total,
		TotalRows:    int(total),
		TotalPages:   int((total + int64(size) - 1) / int64(size)),
		LoadedCount:  len(rows),
		TotalColumns: 14,
	}, nil
}
