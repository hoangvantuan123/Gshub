package perm_scope

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	authDomain "server-core/internal/models/auth"
	domainRoles "server-core/internal/models/roles"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// PermScopesQ - Truy vấn quy tắc phạm vi quyền hạn chuẩn hóa
func (s *PermScopesService) PermScopesQ(ctx context.Context, filters map[string]string) ([]domainRoles.ERPPermScopes, *authDomain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT PermScopesQ trực tiếp vào PostgreSQL Primary DB")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Nhóm các cặp cột Code / Name (CodeHelp) tìm kiếm linh hoạt trên cả Cột Mã và Cột Tên
	dualColumnMap := map[string][2]string{
		"OperationCode":          {`COALESCE(act."ActionCode", '')`, `COALESCE(act."ActionName", '')`},
		"OperationName":          {`COALESCE(act."ActionName", '')`, `COALESCE(act."ActionCode", '')`},
		"DefaultScopeLevel":      {`COALESCE(sl."AttrValueCode", '')`, `COALESCE(sl."AttrValueName", '')`},
		"DefaultScopeLevelLabel": {`COALESCE(sl."AttrValueName", '')`, `COALESCE(sl."AttrValueCode", '')`},
		"RuleCondition":          {`COALESCE(rc."AttrValueCode", '')`, `COALESCE(rc."AttrValueName", '')`},
		"RuleConditionLabel":     {`COALESCE(rc."AttrValueName", '')`, `COALESCE(rc."AttrValueCode", '')`},
	}

	for key, cols := range dualColumnMap {
		val := ""
		if v, ok := filters[key]; ok && v != "" {
			val = v
		} else if v, ok := filters[strings.ToLower(key)]; ok && v != "" {
			val = v
		}
		if val != "" {
			items := strings.FieldsFunc(val, func(r rune) bool {
				return r == ',' || r == ';'
			})
			if len(items) <= 1 {
				paramName := "like_" + strings.ToLower(key)
				filterConditions = append(filterConditions, fmt.Sprintf(`(%s ILIKE :%s OR %s ILIKE :%s)`, cols[0], paramName, cols[1], paramName))
				args[paramName] = "%" + strings.TrimSpace(val) + "%"
			} else {
				var subOrClauses []string
				for idx, item := range items {
					itemTrimmed := strings.TrimSpace(item)
					if itemTrimmed != "" {
						subParam := fmt.Sprintf("like_%s_%d", strings.ToLower(key), idx)
						subOrClauses = append(subOrClauses, fmt.Sprintf(`(%s ILIKE :%s OR %s ILIKE :%s)`, cols[0], subParam, cols[1], subParam))
						args[subParam] = "%" + itemTrimmed + "%"
					}
				}
				if len(subOrClauses) > 0 {
					filterConditions = append(filterConditions, "("+strings.Join(subOrClauses, " OR ")+")")
				}
			}
		}
	}

	// 1.1. Nhóm các cột tìm kiếm đơn lẻ dạng chuỗi tương đối (ILIKE)
	likeColumnMap := map[string]string{
		"ScopeCode":     `a."ScopeCode"`,
		"ScopeName":     `a."ScopeName"`,
		"LangKey":       `a."LangKey"`,
		"Comment":       `a."Comment"`,
		"ConditionSql":  `a."ConditionSql"`,
		"CreatedByName": `COALESCE(uc."UserName", uc."UserId", CAST(a."CreatedBy" AS VARCHAR), '')`,
		"UpdatedByName": `COALESCE(uu."UserName", uu."UserId", CAST(a."UpdatedBy" AS VARCHAR), '')`,
	}

	for key, col := range likeColumnMap {
		val := ""
		if v, ok := filters[key]; ok && v != "" {
			val = v
		} else if v, ok := filters[strings.ToLower(key)]; ok && v != "" {
			val = v
		}
		if val != "" {
			items := strings.FieldsFunc(val, func(r rune) bool {
				return r == ',' || r == ';'
			})
			if len(items) <= 1 {
				paramName := "like_" + strings.ToLower(key)
				filterConditions = append(filterConditions, fmt.Sprintf(`%s ILIKE :%s`, col, paramName))
				args[paramName] = "%" + strings.TrimSpace(val) + "%"
			} else {
				var subOrClauses []string
				for idx, item := range items {
					itemTrimmed := strings.TrimSpace(item)
					if itemTrimmed != "" {
						subParam := fmt.Sprintf("like_%s_%d", strings.ToLower(key), idx)
						subOrClauses = append(subOrClauses, fmt.Sprintf(`%s ILIKE :%s`, col, subParam))
						args[subParam] = "%" + itemTrimmed + "%"
					}
				}
				if len(subOrClauses) > 0 {
					filterConditions = append(filterConditions, "("+strings.Join(subOrClauses, " OR ")+")")
				}
			}
		}
	}

	// 2. Nhóm các cột tìm kiếm chính xác (EXACT)
	if val, ok := filters["IdSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."IdSeq" = :idSeq`)
		args["idSeq"] = val
	}
	if val, ok := filters["PermActionSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."PermActionSeq" = :permActionSeq`)
		args["permActionSeq"] = val
	} else if val, ok := filters["permactionseq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."PermActionSeq" = :permActionSeq`)
		args["permActionSeq"] = val
	}
	if val, ok := filters["ScopeLevelSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."ScopeLevelSeq" = :scopeLevelSeq`)
		args["scopeLevelSeq"] = val
	} else if val, ok := filters["scopelevelseq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."ScopeLevelSeq" = :scopeLevelSeq`)
		args["scopeLevelSeq"] = val
	}
	if val, ok := filters["RuleConditionSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."RuleConditionSeq" = :ruleConditionSeq`)
		args["ruleConditionSeq"] = val
	} else if val, ok := filters["ruleconditionseq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."RuleConditionSeq" = :ruleConditionSeq`)
		args["ruleConditionSeq"] = val
	}

	// 2.1. Lọc theo Thời gian tạo (CreatedAt)
	createdFrom := filters["CreatedAtFrom"]
	if createdFrom == "" {
		createdFrom = filters["createdatfrom"]
	}
	createdTo := filters["CreatedAtTo"]
	if createdTo == "" {
		createdTo = filters["createdatto"]
	}
	if rawCreated, ok := filters["CreatedAt"]; ok && rawCreated != "" && createdFrom == "" && createdTo == "" {
		parts := strings.Split(rawCreated, ",")
		if len(parts) == 2 {
			createdFrom = strings.TrimSpace(parts[0])
			createdTo = strings.TrimSpace(parts[1])
		} else {
			createdFrom = strings.TrimSpace(rawCreated)
			createdTo = strings.TrimSpace(rawCreated)
		}
	}
	if createdFrom != "" {
		if len(createdFrom) == 10 {
			createdFrom += " 00:00:00"
		}
		filterConditions = append(filterConditions, `a."CreatedAt" >= :createdAtFrom`)
		args["createdAtFrom"] = createdFrom
	}
	if createdTo != "" {
		if len(createdTo) == 10 {
			createdTo += " 23:59:59.999999"
		}
		filterConditions = append(filterConditions, `a."CreatedAt" <= :createdAtTo`)
		args["createdAtTo"] = createdTo
	}

	// 2.2. Lọc theo Thời gian sửa (UpdatedAt)
	updatedFrom := filters["UpdatedAtFrom"]
	if updatedFrom == "" {
		updatedFrom = filters["updatedatfrom"]
	}
	updatedTo := filters["UpdatedAtTo"]
	if updatedTo == "" {
		updatedTo = filters["updatedatto"]
	}
	if rawUpdated, ok := filters["UpdatedAt"]; ok && rawUpdated != "" && updatedFrom == "" && updatedTo == "" {
		parts := strings.Split(rawUpdated, ",")
		if len(parts) == 2 {
			updatedFrom = strings.TrimSpace(parts[0])
			updatedTo = strings.TrimSpace(parts[1])
		} else {
			updatedFrom = strings.TrimSpace(rawUpdated)
			updatedTo = strings.TrimSpace(rawUpdated)
		}
	}
	if updatedFrom != "" {
		if len(updatedFrom) == 10 {
			updatedFrom += " 00:00:00"
		}
		filterConditions = append(filterConditions, `a."UpdatedAt" >= :updatedAtFrom`)
		args["updatedAtFrom"] = updatedFrom
	}
	if updatedTo != "" {
		if len(updatedTo) == 10 {
			updatedTo += " 23:59:59.999999"
		}
		filterConditions = append(filterConditions, `a."UpdatedAt" <= :updatedAtTo`)
		args["updatedAtTo"] = updatedTo
	}

	// 3. Xử lý Phân trang (Pagination)
	limit := 1500
	offset := 0

	for _, key := range []string{"Limit", "PageSize", "Take"} {
		if val, ok := filters[key]; ok && val != "" {
			if l, err := strconv.Atoi(val); err == nil && l > 0 {
				if l > s.GetMaxQueryLimit() {
					limit = s.GetMaxQueryLimit()
				} else {
					limit = l
				}
				break
			}
		}
	}

	if val, ok := filters["Offset"]; ok && val != "" {
		if o, err := strconv.Atoi(val); err == nil && o >= 0 {
			offset = o
		}
	} else if val, ok := filters["Page"]; ok && val != "" {
		if p, err := strconv.Atoi(val); err == nil && p > 0 {
			offset = (p - 1) * limit
		}
	}

	// ── ĐẾM TỔNG SỐ BẢN GHI (COUNT) HIGH-CONCURRENCY LOCK-FREE ──
	totalAll := s.GetTotalAll()
	total := totalAll

	isFirstBatch := (offset == 0) && (filters["Cursor"] == "")

	if len(filterConditions) > 0 {
		if isFirstBatch {
			countQuery := `SELECT COUNT(*) FROM (
				SELECT 1 FROM "_ERPPermScopes" a
				LEFT JOIN "_ERPPermActions" act ON CAST(a."PermActionSeq" AS VARCHAR) = CAST(act."IdSeq" AS VARCHAR)
				LEFT JOIN "_ERPSysAttrItems" sl ON CAST(a."ScopeLevelSeq" AS VARCHAR) = CAST(sl."IdSeq" AS VARCHAR)
				LEFT JOIN "_ERPSysAttrItems" rc ON CAST(a."RuleConditionSeq" AS VARCHAR) = CAST(rc."IdSeq" AS VARCHAR)
				LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
				LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
				WHERE ` + strings.Join(filterConditions, " AND ") + ` 
				LIMIT 10001
			) sub`
			countNamedQuery, countArgsList, err := sqlx.Named(countQuery, args)
			if err == nil {
				countNamedQuery = s.db.Rebind(countNamedQuery)
				_ = s.db.GetContext(ctx, &total, countNamedQuery, countArgsList...)
			}
		}
	}

	// 4. Hỗ trợ Keyset/Cursor Pagination
	whereClauses := append([]string(nil), filterConditions...)
	if val, ok := filters["Cursor"]; ok && val != "" {
		whereClauses = append(whereClauses, `a."IdSeq" > :cursor`)
		args["cursor"] = val
	} else if val, ok := filters["LastIdSeq"]; ok && val != "" {
		whereClauses = append(whereClauses, `a."IdSeq" > :lastIdSeq`)
		args["lastIdSeq"] = val
	} else if val, ok := filters["LastIdxNo"]; ok && val != "" {
		if lastIdx, err := strconv.Atoi(val); err == nil && lastIdx > 0 {
			whereClauses = append(whereClauses, `a."IdxNo" > :lastIdxNo`)
			args["lastIdxNo"] = lastIdx
		}
	}

	query := `SELECT 
		a."IdSeq", a."ScopeCode", a."ScopeName", a."LangKey", 
		a."PermActionSeq",
		COALESCE(act."ActionCode", '') AS "OperationCode",
		COALESCE(act."ActionName", '') AS "OperationName",
		a."ScopeLevelSeq",
		COALESCE(sl."AttrValueCode", '') AS "DefaultScopeLevel",
		COALESCE(sl."AttrValueName", '') AS "DefaultScopeLevelLabel",
		a."RuleConditionSeq",
		COALESCE(rc."AttrValueCode", '') AS "RuleCondition",
		COALESCE(rc."AttrValueName", '') AS "RuleConditionLabel",
		a."ConditionSql",
		a."Comment", 
		COALESCE(a."RowVersion", 1) AS "RowVersion", a."IdxNo", 
		a."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(a."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		a."CreatedAt",
		a."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(a."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		a."UpdatedAt"
	FROM "_ERPPermScopes" a
	LEFT JOIN "_ERPPermActions" act ON CAST(a."PermActionSeq" AS VARCHAR) = CAST(act."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" sl ON CAST(a."ScopeLevelSeq" AS VARCHAR) = CAST(sl."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" rc ON CAST(a."RuleConditionSeq" AS VARCHAR) = CAST(rc."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)`

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query += fmt.Sprintf(` ORDER BY COALESCE(a."IdxNo", 999999) ASC, a."CreatedAt" ASC LIMIT %d OFFSET %d`, limit, offset)

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	result := make([]domainRoles.ERPPermScopes, 0)
	err = s.db.SelectContext(ctx, &result, query, argsList...)
	if err != nil {
		if s.log != nil {
			s.log.Error("[PermScopesQ] Database query failed", zap.Error(err), zap.String("query", query))
		}
		return nil, nil, fmt.Errorf("failed to query perm scopes: %w", err)
	}

	// ── TÍNH TOÁN THÔNG TIN PHÂN TRANG (PageInfo) TRẢ VỀ CHO FE ──
	totalPages := 1
	if limit > 0 && total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(limit)))
	}
	currentPage := 1
	if limit > 0 {
		currentPage = (offset / limit) + 1
	}
	nextCursor := ""
	if len(result) > 0 {
		nextCursor = result[len(result)-1].IdSeq
	}
	hasMore := offset+len(result) < total

	pageInfo := &authDomain.PageInfo{
		Total:       total,
		TotalAll:    totalAll,
		Page:        currentPage,
		PageSize:    limit,
		TotalPages:  totalPages,
		LoadedCount: len(result),
		HasMore:     hasMore,
		NextCursor:  nextCursor,
	}

	return result, pageInfo, nil
}
