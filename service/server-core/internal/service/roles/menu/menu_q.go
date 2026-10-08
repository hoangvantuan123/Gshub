package menu

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

func (s *MenusService) MenuQ(ctx context.Context, filters map[string]string) ([]domain.ERPMenus, *authDomain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT MenuQ trực tiếp vào PostgreSQL Primary DB")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Nhóm các cột tìm kiếm dạng chuỗi tương đối (ILIKE)
	likeColumnMap := map[string]string{
		"Key":             `m."Key"`,
		"Label":           `m."Label"`,
		"Link":            `m."Link"`,
		"Type":            `m."Type"`,
		"MenuRootName":    `COALESCE(rm."Label", '')`,
		"MenuSubRootName": `COALESCE(sm."Label", '')`,
		"CreatedByName":   `COALESCE(uc."UserName", uc."UserId", CAST(m."CreatedBy" AS VARCHAR), '')`,
		"UpdatedByName":   `COALESCE(uu."UserName", uu."UserId", CAST(m."UpdatedBy" AS VARCHAR), '')`,
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

	// 1.1 Tìm kiếm tổng hợp (KeyItem, KeyItem1, KeyItem2, KeyMenuItem, vv) cho tương thích ngược
	generalSearch := filters["KeyItem"]
	if generalSearch == "" {
		generalSearch = filters["KeyMenuItem"]
	}
	if generalSearch == "" {
		generalSearch = filters["keyitem"]
	}
	if generalSearch != "" {
		filterConditions = append(filterConditions, `(
			m."Label" ILIKE :genSearch OR 
			m."Key" ILIKE :genSearch OR 
			COALESCE(rm."Label", '') ILIKE :genSearch OR 
			COALESCE(sm."Label", '') ILIKE :genSearch
		)`)
		args["genSearch"] = "%" + strings.TrimSpace(generalSearch) + "%"
	}

	// 2. Nhóm các cột tìm kiếm chính xác (EXACT)
	idVal := filters["Id"]
	if idVal == "" {
		idVal = filters["id"]
	}
	if idVal != "" {
		filterConditions = append(filterConditions, `m."Id" = :id`)
		args["id"] = idVal
	}

	rootIdVal := filters["MenuRootId"]
	if rootIdVal == "" {
		rootIdVal = filters["menurootid"]
	}
	if rootIdVal != "" && rootIdVal != "0" {
		filterConditions = append(filterConditions, `CAST(m."MenuRootId" AS VARCHAR) = :menuRootId`)
		args["menuRootId"] = rootIdVal
	}

	subRootIdVal := filters["MenuSubRootId"]
	if subRootIdVal == "" {
		subRootIdVal = filters["menusubrootid"]
	}
	if subRootIdVal != "" && subRootIdVal != "0" {
		filterConditions = append(filterConditions, `CAST(m."MenuSubRootId" AS VARCHAR) = :menuSubRootId`)
		args["menuSubRootId"] = subRootIdVal
	}

	orderSeqVal := filters["OrderSeq"]
	if orderSeqVal == "" {
		orderSeqVal = filters["orderseq"]
	}
	if orderSeqVal != "" {
		filterConditions = append(filterConditions, `m."OrderSeq" = :orderSeq`)
		args["orderSeq"] = orderSeqVal
	}

	dictSeqVal := filters["DictSeq"]
	if dictSeqVal == "" {
		dictSeqVal = filters["dictseq"]
	}
	if dictSeqVal != "" {
		filterConditions = append(filterConditions, `CAST(m."DictSeq" AS VARCHAR) = :dictSeq`)
		args["dictSeq"] = dictSeqVal
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
		filterConditions = append(filterConditions, `m."CreatedAt" >= CAST(:createdFrom AS TIMESTAMPTZ)`)
		args["createdFrom"] = createdFrom
	}
	if createdTo != "" {
		if len(createdTo) == 10 {
			createdTo = createdTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `m."CreatedAt" <= CAST(:createdTo AS TIMESTAMPTZ)`)
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
		filterConditions = append(filterConditions, `m."UpdatedAt" >= CAST(:updatedFrom AS TIMESTAMPTZ)`)
		args["updatedFrom"] = updatedFrom
	}
	if updatedTo != "" {
		if len(updatedTo) == 10 {
			updatedTo = updatedTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `m."UpdatedAt" <= CAST(:updatedTo AS TIMESTAMPTZ)`)
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
				SELECT 1 FROM "_ERPMenus" m 
				LEFT JOIN "_ERPRootMenus" rm ON CAST(m."MenuRootId" AS VARCHAR) = CAST(rm."Id" AS VARCHAR)
				LEFT JOIN "_ERPMenus" sm ON CAST(m."MenuSubRootId" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
				LEFT JOIN "_ERPUsers" uc ON CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
				LEFT JOIN "_ERPUsers" uu ON CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
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
			whereClauses = append(whereClauses, `m."Id" > :cursor`)
			args["cursor"] = cursorId
		}
	} else if val, ok := filters["LastId"]; ok && val != "" {
		if lastId, err := strconv.Atoi(val); err == nil {
			whereClauses = append(whereClauses, `m."Id" > :lastId`)
			args["lastId"] = lastId
		}
	} else if val, ok := filters["LastIdxNo"]; ok && val != "" {
		if lastIdx, err := strconv.Atoi(val); err == nil && lastIdx > 0 {
			whereClauses = append(whereClauses, `m."IdxNo" > :lastIdxNo`)
			args["lastIdxNo"] = lastIdx
		}
	}

	query := `SELECT 
				m."Id", 
				CASE WHEN COALESCE(m."MenuSubRootId", 0) = 0 THEN COALESCE(m."MenuRootId", 0) ELSE 0 END AS "MenuRootId", 
				m."MenuSubRootId", 
				m."Key", 
				m."Label", 
				m."Link", 
				m."Type", 
				m."OrderSeq", 
				m."DictSeq", 
				m."IdxNo",
				COALESCE(m."RowVersion", 0) AS "RowVersion",
				CASE WHEN COALESCE(m."MenuSubRootId", 0) = 0 THEN COALESCE(rm."Label", '') ELSE '' END AS "MenuRootName",
				COALESCE(sm."Label", '') AS "MenuSubRootName",
				m."CreatedBy",
				COALESCE(uc."UserName", uc."UserId", CAST(m."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
				m."CreatedAt",
				m."UpdatedBy",
				COALESCE(uu."UserName", uu."UserId", CAST(m."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
				m."UpdatedAt"
	          FROM "_ERPMenus" m
	          LEFT JOIN "_ERPMenus" sm ON CAST(m."MenuSubRootId" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
	          LEFT JOIN "_ERPRootMenus" rm ON CAST(CASE WHEN m."MenuRootId" IS NOT NULL AND CAST(m."MenuRootId" AS VARCHAR) != '0' AND CAST(m."MenuRootId" AS VARCHAR) != '' THEN m."MenuRootId" ELSE sm."MenuRootId" END AS VARCHAR) = CAST(rm."Id" AS VARCHAR)
	          LEFT JOIN "_ERPUsers" uc ON CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	          LEFT JOIN "_ERPUsers" uu ON CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)`

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// SẮP XẾP CHUẨN PHÂN CẤP: MODULE (CẤP 1) -> NHÓM SUBMENU (CẤP 2) -> PHÂN ĐỊNH CHA TRƯỚC / CON SAU -> STT MENU CON
	query += fmt.Sprintf(` ORDER BY 
		COALESCE(rm."IdxNo", 999999) ASC, 
		COALESCE(rm."Id", m."MenuRootId", 0) ASC,
		CASE 
			WHEN COALESCE(m."MenuSubRootId", 0) = 0 THEN COALESCE(m."OrderSeq", m."IdxNo", 0)
			ELSE COALESCE(sm."OrderSeq", sm."IdxNo", 0)
		END ASC,
		CASE 
			WHEN COALESCE(m."MenuSubRootId", 0) = 0 THEN m."Id" 
			ELSE m."MenuSubRootId" 
		END ASC,
		CASE WHEN COALESCE(m."MenuSubRootId", 0) = 0 THEN 0 ELSE 1 END ASC,
		CASE 
			WHEN LOWER(COALESCE(m."Type", '')) = 'submenu' THEN 1 
			WHEN LOWER(COALESCE(m."Type", '')) = 'menu' THEN 2 
			WHEN LOWER(COALESCE(m."Type", '')) = 'menuitem' THEN 3 
			ELSE 4 
		END ASC,
		COALESCE(m."OrderSeq", 0) ASC, 
		COALESCE(m."IdxNo", 999999) ASC, 
		m."Id" ASC LIMIT %d OFFSET %d`, limit, offset)

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	var result []domain.ERPMenus
	err = s.db.SelectContext(ctx, &result, query, argsList...)
	if err != nil {
		if s.log != nil {
			s.log.Error("[MenuQ] Database query failed", zap.Error(err), zap.String("query", query))
		}
		return nil, nil, fmt.Errorf("failed to query menus: %w", err)
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
