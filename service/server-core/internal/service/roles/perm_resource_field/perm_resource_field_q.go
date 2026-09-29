package perm_resource_field

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	authDomain "server-core/internal/models/auth"
	domainRoles "server-core/internal/models/roles"
)

// PermResourceFieldsQ - Truy vấn danh sách trường phân quyền dữ liệu theo Menu (LEFT JOIN master _ERPPermFields)
func (s *PermResourceFieldsService) PermResourceFieldsQ(ctx context.Context, filters map[string]string) ([]domainRoles.ERPPermResourceFields, *authDomain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT PermResourceFieldsQ")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Lọc theo Menu (ResourceSeq)
	if val, ok := filters["ResourceSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `(a."ResourceSeq" = :resourceSeq OR CAST(sm."Id" AS VARCHAR) = :resourceSeq)`)
		args["resourceSeq"] = strings.TrimSpace(val)
	}

	// 2. Lọc theo Trường master (FieldSeq)
	if val, ok := filters["FieldSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `a."FieldSeq" = :fieldSeq`)
		args["fieldSeq"] = strings.TrimSpace(val)
	}

	// 3. Tìm kiếm chuỗi tương đối (FieldCode, FieldName, CustomFieldName, Comment)
	likeColumnMap := map[string]string{
		"FieldCode":       `f."FieldCode"`,
		"FieldName":       `COALESCE(a."CustomFieldName", f."FieldName")`,
		"CustomFieldName": `a."CustomFieldName"`,
		"LangKey":         `f."LangKey"`,
		"Comment":         `a."Comment"`,
		"CreatedByName":   `COALESCE(uc."UserName", uc."UserId", CAST(a."CreatedBy" AS VARCHAR), '')`,
		"UpdatedByName":   `COALESCE(uu."UserName", uu."UserId", CAST(a."UpdatedBy" AS VARCHAR), '')`,
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

	// 4. Boolean filters
	for _, boolKey := range []string{"IsMaskable", "IsSensitive"} {
		val := ""
		if v, ok := filters[boolKey]; ok && v != "" {
			val = v
		} else if v, ok := filters[strings.ToLower(boolKey)]; ok && v != "" {
			val = v
		}
		if val != "" {
			bVal := val == "true" || val == "1"
			paramName := "bool_" + strings.ToLower(boolKey)
			filterConditions = append(filterConditions, fmt.Sprintf(`a."%s" = :%s`, boolKey, paramName))
			args[paramName] = bVal
		}
	}

	whereClause := ""
	if len(filterConditions) > 0 {
		whereClause = "WHERE " + strings.Join(filterConditions, " AND ")
	}

	// Phân trang
	limit := s.GetDefaultQueryLimit()
	if v, ok := filters["Limit"]; ok && v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
		}
	} else if v, ok := filters["limit"]; ok && v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
		}
	} else if v, ok := filters["PageSize"]; ok && v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
		}
	}
	maxLimit := s.GetMaxQueryLimit()
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}

	page := 1
	if v, ok := filters["Page"]; ok && v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	} else if v, ok := filters["page"]; ok && v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}

	offset := (page - 1) * limit
	if v, ok := filters["Offset"]; ok && v != "" {
		if o, err := strconv.Atoi(v); err == nil && o >= 0 {
			offset = o
		}
	} else if v, ok := filters["offset"]; ok && v != "" {
		if o, err := strconv.Atoi(v); err == nil && o >= 0 {
			offset = o
		}
	}

	args["limit"] = limit
	args["offset"] = offset

	// Đếm tổng số bản ghi
	var total int
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM "_ERPPermResourceFields" a
		LEFT JOIN "_ERPPermFields" f ON a."FieldSeq" = f."IdSeq"
		LEFT JOIN "_ERPMenus" sm ON CAST(a."ResourceSeq" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		%s
	`, whereClause)

	nstmt, err := s.db.PrepareNamedContext(ctx, countQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("chuẩn bị truy vấn đếm thất bại: %w", err)
	}
	defer nstmt.Close()

	if err := nstmt.GetContext(ctx, &total, args); err != nil {
		return nil, nil, fmt.Errorf("thực thi đếm bản ghi thất bại: %w", err)
	}

	// Truy vấn dữ liệu thực tế kết hợp LEFT JOIN master
	query := fmt.Sprintf(`
		SELECT
			a."IdSeq",
			a."ResourceSeq",
			COALESCE(sm."Key", '') AS "ResourceCode",
			COALESCE(sm."Label", '') AS "ResourceName",
			a."FieldSeq",
			COALESCE(f."FieldCode", '') AS "FieldCode",
			COALESCE(a."CustomFieldName", f."FieldName", '') AS "FieldName",
			f."DictSeq",
			COALESCE(f."LangKey", '') AS "LangKey",
			a."CustomFieldName",
			a."IsMaskable",
			a."IsSensitive",
			a."OrderNo",
			a."Comment",
			a."RowVersion",
			a."IdxNo",
			a."CreatedBy",
			COALESCE(uc."UserName", uc."UserId", CAST(a."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			a."CreatedAt",
			a."UpdatedBy",
			COALESCE(uu."UserName", uu."UserId", CAST(a."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			a."UpdatedAt"
		FROM "_ERPPermResourceFields" a
		LEFT JOIN "_ERPPermFields" f ON a."FieldSeq" = f."IdSeq"
		LEFT JOIN "_ERPMenus" sm ON CAST(a."ResourceSeq" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		%s
		ORDER BY a."OrderNo" ASC, a."CreatedAt" ASC
		LIMIT :limit OFFSET :offset
	`, whereClause)

	dataStmt, err := s.db.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, nil, fmt.Errorf("chuẩn bị truy vấn dữ liệu thất bại: %w", err)
	}
	defer dataStmt.Close()

	var result []domainRoles.ERPPermResourceFields
	if err := dataStmt.SelectContext(ctx, &result, args); err != nil {
		return nil, nil, fmt.Errorf("thực thi truy vấn dữ liệu thất bại: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	hasMore := (offset + len(result)) < total
	nextCursor := ""
	if hasMore && len(result) > 0 {
		nextCursor = strconv.Itoa(offset + len(result))
	}

	totalAll := s.GetTotalAll()
	if totalAll < total {
		totalAll = total
	}

	pageInfo := &authDomain.PageInfo{
		Page:        page,
		PageSize:    limit,
		Total:       total,
		TotalPages:  totalPages,
		TotalAll:    totalAll,
		LoadedCount: len(result),
		HasMore:     hasMore,
		NextCursor:  nextCursor,
	}

	return result, pageInfo, nil
}
