package user

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	domain "server-core/internal/models/auth"

	"github.com/jmoiron/sqlx"
)

// UsersAuthQ truy vấn danh sách người dùng có phân trang và bộ lọc
func (s *UserAuthService) UsersAuthQ(ctx context.Context, filters map[string]string) ([]domain.ERPUsers, *domain.PageInfo, error) {
	if s.log != nil {
		s.log.Info("[DATABASE SELECT] Thực thi câu SQL SELECT UsersAuthQ trực tiếp vào PostgreSQL Primary DB")
	}

	var filterConditions []string
	args := map[string]interface{}{}

	// 1. Nhóm các cột tìm kiếm dạng chuỗi tương đối (ILIKE)
	likeColumnMap := map[string]string{
		"UserId":        `u."UserId"`,
		"UserName":      `u."UserName"`,
		"EmpCode":       `u."EmpCode"`,
		"EmpName":       `u."EmpName"`,
		"DeptName":      `u."DeptName"`,
		"ManagerName":   `u."ManagerName"`,
		"Email":         `u."Email"`,
		"Remark":        `u."Remark"`,
		"CreatedByName": `COALESCE(uc."UserName", uc."UserId", u."CreatedBy", '')`,
		"UpdatedByName": `COALESCE(uu."UserName", uu."UserId", u."UpdatedBy", '')`,
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
	if val, ok := filters["UserSeq"]; ok && val != "" {
		filterConditions = append(filterConditions, `u."UserSeq" = :userSeq`)
		args["userSeq"] = val
	}
	if val, ok := filters["CreatedBy"]; ok && val != "" {
		filterConditions = append(filterConditions, `u."CreatedBy" = :createdBy`)
		args["createdBy"] = val
	}
	if val, ok := filters["UpdatedBy"]; ok && val != "" {
		filterConditions = append(filterConditions, `u."UpdatedBy" = :updatedBy`)
		args["updatedBy"] = val
	}
	if val, ok := filters["EmpID"]; ok && val != "" {
		filterConditions = append(filterConditions, `u."EmpID" = :empID`)
		args["empID"] = val
	}
	statusVal := ""
	if v, ok := filters["StatusAcc"]; ok && v != "" {
		statusVal = v
	} else if v, ok := filters["statusAcc"]; ok && v != "" {
		statusVal = v
	}
	if statusVal != "" && statusVal != "ALL" {
		if statusVal == "1" || strings.EqualFold(statusVal, "true") {
			filterConditions = append(filterConditions, `COALESCE(u."StatusAcc", false) = true`)
		} else if statusVal == "0" || strings.EqualFold(statusVal, "false") {
			filterConditions = append(filterConditions, `COALESCE(u."StatusAcc", false) = false`)
		}
	}

	checkPassVal := ""
	if v, ok := filters["CheckPass1"]; ok && v != "" {
		checkPassVal = v
	} else if v, ok := filters["checkPass1"]; ok && v != "" {
		checkPassVal = v
	} else if v, ok := filters["checkpass1"]; ok && v != "" {
		checkPassVal = v
	}
	if checkPassVal != "" && checkPassVal != "ALL" {
		if checkPassVal == "1" || strings.EqualFold(checkPassVal, "true") {
			filterConditions = append(filterConditions, `COALESCE(u."CheckPass1", false) = true`)
		} else if checkPassVal == "0" || strings.EqualFold(checkPassVal, "false") {
			filterConditions = append(filterConditions, `COALESCE(u."CheckPass1", false) = false`)
		}
	}

	activeVal := ""
	if v, ok := filters["Active"]; ok && v != "" {
		activeVal = v
	} else if v, ok := filters["active"]; ok && v != "" {
		activeVal = v
	}
	if activeVal != "" && activeVal != "ALL" {
		if activeVal == "1" || strings.EqualFold(activeVal, "true") {
			filterConditions = append(filterConditions, `COALESCE(u."Active", true) = true`)
		} else if activeVal == "0" || strings.EqualFold(activeVal, "false") {
			filterConditions = append(filterConditions, `COALESCE(u."Active", true) = false`)
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
		filterConditions = append(filterConditions, `u."CreatedAt" >= CAST(:createdFrom AS TIMESTAMPTZ)`)
		args["createdFrom"] = createdFrom
	}
	if createdTo != "" {
		if len(createdTo) == 10 {
			createdTo = createdTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `u."CreatedAt" <= CAST(:createdTo AS TIMESTAMPTZ)`)
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
		filterConditions = append(filterConditions, `u."UpdatedAt" >= CAST(:updatedFrom AS TIMESTAMPTZ)`)
		args["updatedFrom"] = updatedFrom
	}
	if updatedTo != "" {
		if len(updatedTo) == 10 {
			updatedTo = updatedTo + " 23:59:59.999+07:00"
		}
		filterConditions = append(filterConditions, `u."UpdatedAt" <= CAST(:updatedTo AS TIMESTAMPTZ)`)
		args["updatedTo"] = updatedTo
	}

	// 2.3. Lọc theo Đăng nhập gần nhất (LastLoginDate / LoginDate)
	loginFrom := filters["LastLoginDateFrom"]
	if loginFrom == "" {
		loginFrom = filters["LoginDateFrom"]
	}
	loginTo := filters["LastLoginDateTo"]
	if loginTo == "" {
		loginTo = filters["LoginDateTo"]
	}
	if rawLogin, ok := filters["LastLoginDate"]; ok && rawLogin != "" && loginFrom == "" && loginTo == "" {
		parts := strings.Split(rawLogin, ",")
		if len(parts) == 2 {
			loginFrom = strings.TrimSpace(parts[0])
			loginTo = strings.TrimSpace(parts[1])
		} else {
			loginFrom = strings.TrimSpace(rawLogin)
			loginTo = strings.TrimSpace(rawLogin)
		}
	}
	if loginFrom != "" {
		if len(loginFrom) == 10 {
			loginFrom = loginFrom + " 00:00:00"
		}
		filterConditions = append(filterConditions, `u."LoginDate" >= :loginFrom`)
		args["loginFrom"] = loginFrom
	}
	if loginTo != "" {
		if len(loginTo) == 10 {
			loginTo = loginTo + " 23:59:59"
		}
		filterConditions = append(filterConditions, `u."LoginDate" <= :loginTo`)
		args["loginTo"] = loginTo
	}

	// Mặc định tải 1500 dòng/page cho cuộn mượt (hỗ trợ tối đa 10,000 dòng/batch)
	limit := 1500
	offset := 0

	for _, key := range []string{"Limit", "PageSize", "Take"} {
		if val, ok := filters[key]; ok && val != "" {
			if l, err := strconv.Atoi(val); err == nil && l > 0 {
				if l > 10000 {
					limit = 10000
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

	totalAll := s.GetTotalAll()
	total := totalAll

	isFirstBatch := (offset == 0) && (filters["Cursor"] == "")

	if len(filterConditions) > 0 {
		if isFirstBatch {
			countQuery := `SELECT COUNT(*) FROM (
				SELECT 1 FROM "_ERPUsers" u 
				LEFT JOIN "_ERPUsers" uc ON u."CreatedBy" = uc."UserSeq"
				LEFT JOIN "_ERPUsers" uu ON u."UpdatedBy" = uu."UserSeq"
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

	// 4. Hỗ trợ Keyset/Cursor Pagination bằng UserSeq (UUIDv7 O(log N))
	whereClauses := append([]string(nil), filterConditions...)
	if val, ok := filters["Cursor"]; ok && val != "" {
		whereClauses = append(whereClauses, `u."UserSeq" > :cursor`)
		args["cursor"] = val
	} else if val, ok := filters["LastUserSeq"]; ok && val != "" {
		whereClauses = append(whereClauses, `u."UserSeq" > :lastUserSeq`)
		args["lastUserSeq"] = val
	} else if val, ok := filters["LastIdxNo"]; ok && val != "" {
		if lastIdx, err := strconv.Atoi(val); err == nil && lastIdx > 0 {
			whereClauses = append(whereClauses, `u."IdxNo" > :lastIdxNo`)
			args["lastIdxNo"] = lastIdx
		}
	}

	query := `SELECT 
				u."UserSeq", u."UserId", u."UserName", u."Email", u."EmpID", u."EmpCode", u."EmpName", 
				u."DeptName", u."ManagerName", u."Remark", u."IdxNo", 
				COALESCE(u."Active", true) AS "Active", 
				COALESCE(u."CheckPass1", false) AS "CheckPass1", 
				COALESCE(u."StatusAcc", false) AS "StatusAcc", 
				COALESCE(u."LoginDate", '') AS "LastLoginDate", 
				u."CreatedBy", 
				COALESCE(uc."UserName", uc."UserId", u."CreatedBy", '') AS "CreatedByName",
				COALESCE(u."CreatedAt", NOW()) AS "CreatedAt", 
				u."UpdatedBy", 
				COALESCE(uu."UserName", uu."UserId", u."UpdatedBy", '') AS "UpdatedByName",
				COALESCE(u."UpdatedAt", NOW()) AS "UpdatedAt" 
	          FROM "_ERPUsers" u
	          LEFT JOIN "_ERPUsers" uc ON u."CreatedBy" = uc."UserSeq"
	          LEFT JOIN "_ERPUsers" uu ON u."UpdatedBy" = uu."UserSeq"`

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query += fmt.Sprintf(` ORDER BY u."UserSeq" ASC LIMIT %d OFFSET %d`, limit, offset)

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	var result []domain.ERPUsers
	err = s.db.SelectContext(ctx, &result, query, argsList...)
	if err != nil {
		return nil, nil, err
	}

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
		nextCursor = result[len(result)-1].UserSeq
	}
	hasMore := offset+len(result) < total

	pageInfo := &domain.PageInfo{
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
