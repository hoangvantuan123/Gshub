package root_menu

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

func (s *RootMenusService) RootMenuA(ctx context.Context, menus []domain.ERPRootMenus) ([]domain.ERPRootMenus, error) {
	if len(menus) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if len(menus) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng thêm mới vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(menus))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N) - 0% I/O DB) ──
	keyTracker := make(map[string]int, len(menus))
	keys := make([]string, 0, len(menus))
	var errorDetails []domain.RowErrorDetail

	for idx, m := range menus {
		rowNum := idx + 1
		if m.IdxNo != nil && *m.IdxNo > 0 {
			rowNum = *m.IdxNo
		}
		if m.Key == nil || strings.TrimSpace(*m.Key) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Key",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã Key không được để trống", rowNum),
			})
			continue
		}
		if m.Label == nil || strings.TrimSpace(*m.Label) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     *m.Key,
				Field:   "Label",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d (Key '%s'): Tên nhãn (Label) không được để trống", rowNum, *m.Key),
			})
			continue
		}

		keyClean := strings.ToLower(strings.TrimSpace(*m.Key))
		if firstRow, exists := keyTracker[keyClean]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     *m.Key,
				Field:   "Key",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: Mã Key '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, *m.Key, firstRow),
			})
			continue
		}
		keyTracker[keyClean] = rowNum
		keys = append(keys, strings.TrimSpace(*m.Key))
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d dòng dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: MỞ TRANSACTION & BATCH PRE-CHECK TRÙNG DB ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	queryDup, argsDup, err := sqlx.In(`SELECT "Key" FROM "_ERPRootMenus" WHERE "Key" IN (?)`, keys)
	if err == nil {
		queryDup = tx.Rebind(queryDup)
		var existingKeys []string
		_ = tx.SelectContext(ctx, &existingKeys, queryDup, argsDup...)
		if len(existingKeys) > 0 {
			var dupDetails []domain.RowErrorDetail
			for _, k := range existingKeys {
				kClean := strings.ToLower(strings.TrimSpace(k))
				rowNum := keyTracker[kClean]
				dupDetails = append(dupDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     k,
					Field:   "Key",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã Key '%s' đã tồn tại sẵn trong cơ sở dữ liệu", rowNum, k),
				})
			}
			return nil, &domain.BatchSaveError{
				Message: fmt.Sprintf("Mã Key đã tồn tại trên hệ thống: %s", strings.Join(existingKeys, ", ")),
				Details: dupDetails,
			}
		}
	}

	// ── BƯỚC 3: 1-QUERY ATOMIC BULK INSERT BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(menus)
	arrKeys := make([]string, n)
	arrIdxNos := make([]int, n)
	arrLabels := make([]string, n)
	arrIcons := make([]string, n)
	arrLinks := make([]string, n)
	arrUtilities := make([]bool, n)
	arrRowVersions := make([]int64, n)
	arrCreatedBy := make([]string, n)
	arrUpdatedBy := make([]string, n)

	for i, m := range menus {
		if m.Key != nil {
			arrKeys[i] = *m.Key
		}
		if m.IdxNo != nil {
			arrIdxNos[i] = *m.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if m.Label != nil {
			arrLabels[i] = *m.Label
		}
		if m.Icon != nil {
			arrIcons[i] = *m.Icon
		}
		if m.Link != nil {
			arrLinks[i] = *m.Link
		}
		arrUtilities[i] = m.Utilities
		arrRowVersions[i] = 1
		arrCreatedBy[i] = fmt.Sprintf("%v", m.CreatedBy)
		arrUpdatedBy[i] = fmt.Sprintf("%v", m.UpdatedBy)
	}

	bulkInsertSQL := `
		WITH inserted AS (
			INSERT INTO "_ERPRootMenus" (
				"Key", "IdxNo", "Label", "Icon", "Link", "Utilities", "RowVersion", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			)
			SELECT 
				t.k, t.idx, t.lbl, t.ico, t.lnk, t.util, t.ver, t.cb, NOW(), t.ub, NOW()
			FROM UNNEST(
				$1::text[], $2::int[], $3::text[], $4::text[], $5::text[], $6::boolean[], $7::bigint[], $8::text[], $9::text[]
			) AS t(k, idx, lbl, ico, lnk, util, ver, cb, ub)
			RETURNING *
		)
		SELECT 
			rm."Id", rm."Key", rm."IdxNo", rm."Label", rm."Icon", rm."Link", 
			COALESCE(rm."Utilities", false) AS "Utilities",
			COALESCE(rm."RowVersion", 0) AS "RowVersion",
			rm."CreatedBy",
			COALESCE(uc."UserName", uc."UserId", rm."CreatedBy", '') AS "CreatedByName",
			rm."CreatedAt",
			rm."UpdatedBy",
			COALESCE(uu."UserName", uu."UserId", rm."UpdatedBy", '') AS "UpdatedByName",
			rm."UpdatedAt"
		FROM inserted rm
		LEFT JOIN "_ERPUsers" uc ON CAST(rm."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(rm."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(rm."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(rm."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY rm."IdxNo" ASC, rm."Id" ASC
	`

	var createdRecords []domain.ERPRootMenus
	err = tx.SelectContext(ctx, &createdRecords, bulkInsertSQL,
		pq.Array(arrKeys),
		pq.Array(arrIdxNos),
		pq.Array(arrLabels),
		pq.Array(arrIcons),
		pq.Array(arrLinks),
		pq.Array(arrUtilities),
		pq.Array(arrRowVersions),
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Insert: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(createdRecords)))
	cache.GetCache().DeletePrefix(ctx, "root_menu_q:")
	s.PublishKafkaEvent("ROOT_MENU_CREATED", createdRecords)

	return createdRecords, nil
}
