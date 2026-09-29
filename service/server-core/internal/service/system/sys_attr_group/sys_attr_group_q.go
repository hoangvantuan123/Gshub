package sys_attr_group

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	authDomain "server-core/internal/models/auth"
	domain "server-core/internal/models/system"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// SysAttrGroupsQ - Truy vấn nhóm thuộc tính chuẩn hóa theo chuẩn RootMenu
func (s *SysAttrGroupsService) SysAttrGroupsQ(ctx context.Context, filters map[string]string) ([]domain.ERPSysAttrGroups, *authDomain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT SysAttrGroupsQ trực tiếp vào PostgreSQL Primary DB")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Nhóm các cột tìm kiếm dạng chuỗi tương đối (ILIKE)
	likeColumnMap := map[string]string{
		"GroupCode":     `g."GroupCode"`,
		"GroupName":     `g."GroupName"`,
		"LangKey":       `g."LangKey"`,
		"Comment":       `g."Comment"`,
		"CreatedByName": `COALESCE(uc."UserName", uc."UserId", CAST(g."CreatedBy" AS VARCHAR), '')`,
		"UpdatedByName": `COALESCE(uu."UserName", uu."UserId", CAST(g."UpdatedBy" AS VARCHAR), '')`,
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
		filterConditions = append(filterConditions, `g."IdSeq" = :idSeq`)
		args["idSeq"] = val
	}
	if val, ok := filters["CodeHelp"]; ok && val != "" {
		if ch, err := strconv.ParseInt(val, 10, 64); err == nil && ch > 0 {
			filterConditions = append(filterConditions, `g."CodeHelp" = :codeHelp`)
			args["codeHelp"] = ch
		}
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
			createdFrom = createdFrom + " 00:00:00+07:00"
		}
		filterConditions = append(filterConditions, `g."CreatedAt" >= CAST(:createdFrom AS TIMESTAMPTZ)`)
		args["createdFrom"] = createdFrom
	}
	if createdTo != "" {
		if len(createdTo) == 10 {
			createdTo = createdTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `g."CreatedAt" <= CAST(:createdTo AS TIMESTAMPTZ)`)
		args["createdTo"] = createdTo
	}

	// 2.2. Lọc theo Thời gian cập nhật (UpdatedAt)
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
			updatedFrom = updatedFrom + " 00:00:00+07:00"
		}
		filterConditions = append(filterConditions, `g."UpdatedAt" >= CAST(:updatedFrom AS TIMESTAMPTZ)`)
		args["updatedFrom"] = updatedFrom
	}
	if updatedTo != "" {
		if len(updatedTo) == 10 {
			updatedTo = updatedTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `g."UpdatedAt" <= CAST(:updatedTo AS TIMESTAMPTZ)`)
		args["updatedTo"] = updatedTo
	}

	limit := s.GetDefaultQueryLimit()
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
				SELECT 1 FROM "_ERPSysAttrGroups" g
				LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
				LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
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
		whereClauses = append(whereClauses, `g."IdSeq" > :cursor`)
		args["cursor"] = val
	} else if val, ok := filters["LastIdSeq"]; ok && val != "" {
		whereClauses = append(whereClauses, `g."IdSeq" > :lastIdSeq`)
		args["lastIdSeq"] = val
	} else if val, ok := filters["LastIdxNo"]; ok && val != "" {
		if lastIdx, err := strconv.Atoi(val); err == nil && lastIdx > 0 {
			whereClauses = append(whereClauses, `g."IdxNo" > :lastIdxNo`)
			args["lastIdxNo"] = lastIdx
		}
	}

	query := `SELECT 
		g."IdSeq", g."GroupCode", g."GroupName", g."CodeHelp", g."LangKey", g."Comment", 
		COALESCE(g."RowVersion", 1) AS "RowVersion", g."IdxNo", 
		g."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		g."CreatedAt",
		g."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		g."UpdatedAt"
	FROM "_ERPSysAttrGroups" g
	LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)`

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query += fmt.Sprintf(` ORDER BY COALESCE(g."IdxNo", 999999) ASC, g."CreatedAt" ASC LIMIT %d OFFSET %d`, limit, offset)

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	var result []domain.ERPSysAttrGroups
	err = s.db.SelectContext(ctx, &result, query, argsList...)
	if err != nil {
		if s.log != nil {
			s.log.Error("[SysAttrGroupsQ] Database query failed", zap.Error(err), zap.String("query", query))
		}
		return nil, nil, fmt.Errorf("failed to query sys attr groups: %w", err)
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
