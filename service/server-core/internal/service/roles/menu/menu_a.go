package menu

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

func (s *MenusService) MenuA(ctx context.Context, menus []domain.ERPMenus) ([]domain.ERPMenus, error) {
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

	queryDup, argsDup, err := sqlx.In(`SELECT "Key" FROM "_ERPMenus" WHERE "Key" IN (?)`, keys)
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

	// ── BƯỚC 3: 1-QUERY ATOMIC BULK INSERT BẰNG CTE KÈM LEFT JOIN AUDIT & RELATIONS ──
	n := len(menus)
	arrKeys := make([]string, n)
	arrIdxNos := make([]int, n)
	arrMenuRootIds := make([]int64, n)
	arrMenuSubRootIds := make([]int64, n)
	arrLabels := make([]string, n)
	arrLinks := make([]string, n)
	arrTypes := make([]string, n)
	arrOrderSeqs := make([]int, n)
	arrDictSeqs := make([]int64, n)
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
		if m.MenuRootId != nil {
			id, _ := strconv.ParseInt(fmt.Sprintf("%v", m.MenuRootId), 10, 64)
			arrMenuRootIds[i] = id
		}
		if m.MenuSubRootId != nil {
			id, _ := strconv.ParseInt(fmt.Sprintf("%v", m.MenuSubRootId), 10, 64)
			arrMenuSubRootIds[i] = id
		}
		if m.Label != nil {
			arrLabels[i] = *m.Label
		}
		if m.Link != nil {
			arrLinks[i] = *m.Link
		}
		if m.Type != nil && *m.Type != "" {
			arrTypes[i] = *m.Type
		} else {
			arrTypes[i] = "menu"
		}
		if m.OrderSeq != nil {
			arrOrderSeqs[i] = *m.OrderSeq
		} else {
			arrOrderSeqs[i] = i + 1
		}
		if m.DictSeq != nil {
			ds, _ := strconv.ParseInt(fmt.Sprintf("%v", m.DictSeq), 10, 64)
			arrDictSeqs[i] = ds
		}
		arrRowVersions[i] = 1
		arrCreatedBy[i] = fmt.Sprintf("%v", m.CreatedBy)
		arrUpdatedBy[i] = fmt.Sprintf("%v", m.UpdatedBy)
	}

	bulkInsertSQL := `
		WITH inserted AS (
			INSERT INTO "_ERPMenus" (
				"Key", "IdxNo", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type", "OrderSeq", "DictSeq", "RowVersion", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			)
			SELECT 
				t.k, t.idx, t.root_id, t.sub_id, t.lbl, t.lnk, t.typ, t.ord, t.dict, t.ver, t.cb, NOW(), t.ub, NOW()
			FROM UNNEST(
				$1::text[], $2::int[], $3::bigint[], $4::bigint[], $5::text[], $6::text[], $7::text[], $8::int[], $9::bigint[], $10::bigint[], $11::text[], $12::text[]
			) AS t(k, idx, root_id, sub_id, lbl, lnk, typ, ord, dict, ver, cb, ub)
			RETURNING *
		)
		SELECT 
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
		FROM inserted m
		LEFT JOIN "_ERPMenus" sm ON CAST(m."MenuSubRootId" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		LEFT JOIN "_ERPRootMenus" rm ON CAST(CASE WHEN m."MenuRootId" IS NOT NULL AND CAST(m."MenuRootId" AS VARCHAR) != '0' AND CAST(m."MenuRootId" AS VARCHAR) != '' THEN m."MenuRootId" ELSE sm."MenuRootId" END AS VARCHAR) = CAST(rm."Id" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uc ON CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(m."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(m."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY 
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
			m."Id" ASC
	`

	var createdRecords []domain.ERPMenus
	err = tx.SelectContext(ctx, &createdRecords, bulkInsertSQL,
		pq.Array(arrKeys),
		pq.Array(arrIdxNos),
		pq.Array(arrMenuRootIds),
		pq.Array(arrMenuSubRootIds),
		pq.Array(arrLabels),
		pq.Array(arrLinks),
		pq.Array(arrTypes),
		pq.Array(arrOrderSeqs),
		pq.Array(arrDictSeqs),
		pq.Array(arrRowVersions),
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Insert Menu: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(createdRecords)))
	cache.GetCache().DeletePrefix(ctx, "menu_q:")
	s.PublishKafkaEvent("MENU_CREATED", createdRecords)

	return createdRecords, nil
}
