package root_menu

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	authDomain "server-core/internal/models/auth"
	domain "server-core/internal/models/roles"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

func (s *RootMenusService) RootMenuQ(ctx context.Context, filters map[string]string) ([]domain.ERPRootMenus, *authDomain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT RootMenuQ trực tiếp vào PostgreSQL Primary DB")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Nhóm các cột tìm kiếm dạng chuỗi tương đối (ILIKE)
	likeColumnMap := map[string]string{
		"Key":           `rm."Key"`,
		"Label":         `rm."Label"`,
		"Link":          `rm."Link"`,
		"Icon":          `rm."Icon"`,
		"CreatedByName": `COALESCE(uc."UserName", uc."UserId", rm."CreatedBy", '')`,
		"UpdatedByName": `COALESCE(uu."UserName", uu."UserId", rm."UpdatedBy", '')`,
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
	if val, ok := filters["Id"]; ok && val != "" {
		filterConditions = append(filterConditions, `rm."Id" = :id`)
		args["id"] = val
	}
	utilVal := ""
	if v, ok := filters["Utilities"]; ok && v != "" {
		utilVal = v
	} else if v, ok := filters["utilities"]; ok && v != "" {
		utilVal = v
	}
	if utilVal != "" && utilVal != "ALL" {
		if utilVal == "1" || strings.EqualFold(utilVal, "true") {
			filterConditions = append(filterConditions, `COALESCE(rm."Utilities", false) = true`)
		} else if utilVal == "0" || strings.EqualFold(utilVal, "false") {
			filterConditions = append(filterConditions, `COALESCE(rm."Utilities", false) = false`)
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
		filterConditions = append(filterConditions, `rm."CreatedAt" >= CAST(:createdFrom AS TIMESTAMPTZ)`)
		args["createdFrom"] = createdFrom
	}
	if createdTo != "" {
		if len(createdTo) == 10 {
			createdTo = createdTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `rm."CreatedAt" <= CAST(:createdTo AS TIMESTAMPTZ)`)
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
		filterConditions = append(filterConditions, `rm."UpdatedAt" >= CAST(:updatedFrom AS TIMESTAMPTZ)`)
		args["updatedFrom"] = updatedFrom
	}
	if updatedTo != "" {
		if len(updatedTo) == 10 {
			updatedTo = updatedTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `rm."UpdatedAt" <= CAST(:updatedTo AS TIMESTAMPTZ)`)
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

	// ── ĐẾM TỔNG SỐ BẢN GHI (COUNT) HIGH-CONCURRENCY LOCK-FREE (0% TẢI DB CHO TOTALALL) ──
	totalAll := s.GetTotalAll()
	total := totalAll

	isFirstBatch := (offset == 0) && (filters["Cursor"] == "")

	// Nếu CÓ BỘ LỌC và là trang đầu tiên, ta mới đếm filtered count với Bounded Count (chặn trần 10001)
	if len(filterConditions) > 0 {
		if isFirstBatch {
			countQuery := `SELECT COUNT(*) FROM (
				SELECT 1 FROM "_ERPRootMenus" rm 
				LEFT JOIN "_ERPUsers" uc ON rm."CreatedBy" = uc."UserSeq"
				LEFT JOIN "_ERPUsers" uu ON rm."UpdatedBy" = uu."UserSeq"
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
		if cursorId, err := strconv.Atoi(val); err == nil {
			whereClauses = append(whereClauses, `rm."Id" > :cursor`)
			args["cursor"] = cursorId
		}
	} else if val, ok := filters["LastId"]; ok && val != "" {
		if lastId, err := strconv.Atoi(val); err == nil {
			whereClauses = append(whereClauses, `rm."Id" > :lastId`)
			args["lastId"] = lastId
		}
	} else if val, ok := filters["LastIdxNo"]; ok && val != "" {
		if lastIdx, err := strconv.Atoi(val); err == nil && lastIdx > 0 {
			whereClauses = append(whereClauses, `rm."IdxNo" > :lastIdxNo`)
			args["lastIdxNo"] = lastIdx
		}
	}

	query := `SELECT 
				rm."Id", rm."Key", rm."IdxNo", rm."Label", rm."Icon", rm."Link", 
				COALESCE(rm."Utilities", false) AS "Utilities",
				COALESCE(rm."RowVersion", 0) AS "RowVersion",
				rm."CreatedBy",
				COALESCE(uc."UserName", uc."UserId", rm."CreatedBy", '') AS "CreatedByName",
				rm."CreatedAt",
				rm."UpdatedBy",
				COALESCE(uu."UserName", uu."UserId", rm."UpdatedBy", '') AS "UpdatedByName",
				rm."UpdatedAt"
	          FROM "_ERPRootMenus" rm
	          LEFT JOIN "_ERPUsers" uc ON rm."CreatedBy" = uc."UserSeq"
	          LEFT JOIN "_ERPUsers" uu ON rm."UpdatedBy" = uu."UserSeq"`

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// ── SẮP XẾP CHUẨN THEO IdxNo, Id ──
	query += fmt.Sprintf(` ORDER BY COALESCE(rm."IdxNo", 999999) ASC, rm."Id" ASC LIMIT %d OFFSET %d`, limit, offset)

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	var result []domain.ERPRootMenus
	err = s.db.SelectContext(ctx, &result, query, argsList...)
	if err != nil {
		if s.log != nil {
			s.log.Error("[RootMenuQ] Database query failed", zap.Error(err), zap.String("query", query))
		}
		return nil, nil, fmt.Errorf("failed to query root menus: %w", err)
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
		nextCursor = fmt.Sprintf("%v", result[len(result)-1].Id)
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
