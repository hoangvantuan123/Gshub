package perm_action

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// PermActionsA - Thêm mới hành động quyền hạn chuẩn hóa theo chuẩn SysAttrGroup
func (s *PermActionsService) PermActionsA(ctx context.Context, actions []domainRoles.ERPPermActions) ([]domainRoles.ERPPermActions, error) {
	if len(actions) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if len(actions) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng thêm mới vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(actions))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N) - 0% I/O DB) ──
	codeTracker := make(map[string]int, len(actions))
	codes := make([]string, 0, len(actions))
	var errorDetails []domainSys.RowErrorDetail

	for idx, a := range actions {
		rowNum := idx + 1
		if a.IdxNo != nil && *a.IdxNo > 0 {
			rowNum = *a.IdxNo
		}

		// 1. Kiểm tra ActionCode (Mã Hành Động *)
		if strings.TrimSpace(a.ActionCode) == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "ActionCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã hành động (ActionCode) không được để trống", rowNum),
			})
		} else {
			codeClean := strings.ToLower(strings.TrimSpace(a.ActionCode))
			if firstRow, exists := codeTracker[codeClean]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     a.ActionCode,
					Field:   "ActionCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã hành động '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, a.ActionCode, firstRow),
				})
			} else {
				codeTracker[codeClean] = rowNum
				codes = append(codes, strings.TrimSpace(a.ActionCode))
			}
		}

		// 2. Kiểm tra ActionName (Tên Hành Động *)
		if strings.TrimSpace(a.ActionName) == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     a.ActionCode,
				Field:   "ActionName",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên hành động (ActionName) không được để trống", rowNum),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: MỞ TRANSACTION & BATCH PRE-CHECK TRÙNG DB (ActionCode) ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var dbDuplicates []domainSys.RowErrorDetail

	// 2.1. Kiểm tra trùng ActionCode trong DB
	if len(codes) > 0 {
		queryDupCode, argsDupCode, err := sqlx.In(`SELECT "ActionCode" FROM "_ERPPermActions" WHERE "ActionCode" IN (?)`, codes)
		if err == nil {
			queryDupCode = tx.Rebind(queryDupCode)
			var existingCodes []string
			_ = tx.SelectContext(ctx, &existingCodes, queryDupCode, argsDupCode...)
			for _, c := range existingCodes {
				cClean := strings.ToLower(strings.TrimSpace(c))
				rowNum := codeTracker[cClean]
				dbDuplicates = append(dbDuplicates, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     c,
					Field:   "ActionCode",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã hành động '%s' đã tồn tại sẵn trong cơ sở dữ liệu", rowNum, c),
				})
			}
		}
	}

	if len(dbDuplicates) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: "Phát hiện dữ liệu trùng lặp trong hệ thống",
			Details: dbDuplicates,
		}
	}

	// ── BƯỚC 3: 1-QUERY ATOMIC BULK INSERT BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(actions)
	arrIdSeqs := make([]string, n)
	arrActionCodes := make([]string, n)
	arrActionNames := make([]string, n)
	arrLangKeys := make([]string, n)
	arrIsDefaultAllows := make([]bool, n)
	arrComments := make([]string, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrCreatedBy := make([]string, n)
	arrUpdatedBy := make([]string, n)

	for i, a := range actions {
		if a.IdSeq != "" {
			arrIdSeqs[i] = a.IdSeq
		} else {
			arrIdSeqs[i] = uuid.New().String()
		}
		arrActionCodes[i] = a.ActionCode
		arrActionNames[i] = a.ActionName
		if a.LangKey != nil {
			arrLangKeys[i] = *a.LangKey
		}
		arrIsDefaultAllows[i] = a.IsDefaultAllow
		if a.Comment != nil {
			arrComments[i] = *a.Comment
		}
		arrRowVersions[i] = 1
		if a.IdxNo != nil {
			arrIdxNos[i] = *a.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if a.CreatedBy != nil {
			arrCreatedBy[i] = *a.CreatedBy
		}
		if a.UpdatedBy != nil {
			arrUpdatedBy[i] = *a.UpdatedBy
		} else if a.CreatedBy != nil {
			arrUpdatedBy[i] = *a.CreatedBy
		}
	}

	bulkInsertSQL := `
		WITH inserted AS (
			INSERT INTO "_ERPPermActions" (
				"IdSeq", "ActionCode", "ActionName", "LangKey", "IsDefaultAllow", "Comment", "RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			)
			SELECT 
				t.idseq, t.acode, t.aname, t.lkey, t.allow, t.cmt, t.ver, t.idx, t.cb, NOW(), t.ub, NOW()
			FROM UNNEST(
				$1::text[], $2::text[], $3::text[], $4::text[], $5::boolean[], $6::text[], $7::bigint[], $8::int[], $9::text[], $10::text[]
			) AS t(idseq, acode, aname, lkey, allow, cmt, ver, idx, cb, ub)
			RETURNING *
		)
		SELECT 
			a."IdSeq", a."ActionCode", a."ActionName", a."LangKey", a."IsDefaultAllow", a."Comment", 
			COALESCE(a."RowVersion", 1) AS "RowVersion", a."IdxNo", 
			a."CreatedBy",
			COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(a."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			a."CreatedAt",
			a."UpdatedBy",
			COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(a."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			a."UpdatedAt"
		FROM inserted a
		LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY a."IdxNo" ASC, a."CreatedAt" ASC
	`

	var createdRecords []domainRoles.ERPPermActions
	err = tx.SelectContext(ctx, &createdRecords, bulkInsertSQL,
		pq.Array(arrIdSeqs),
		pq.Array(arrActionCodes),
		pq.Array(arrActionNames),
		pq.Array(arrLangKeys),
		pq.Array(arrIsDefaultAllows),
		pq.Array(arrComments),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Insert PermActions: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(createdRecords)))
	cache.GetCache().DeletePrefix(ctx, "perm_actions_q:")
	s.PublishKafkaEvent("PERM_ACTION_CREATED", createdRecords)

	return createdRecords, nil
}
