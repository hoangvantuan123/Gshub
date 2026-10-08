package sys_attr_group

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// SysAttrGroupsA - Thêm mới nhóm thuộc tính chuẩn hóa theo chuẩn RootMenu
func (s *SysAttrGroupsService) SysAttrGroupsA(ctx context.Context, groups []domain.ERPSysAttrGroups) ([]domain.ERPSysAttrGroups, error) {
	if len(groups) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if len(groups) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng thêm mới vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(groups))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N) - 0% I/O DB) ──
	codeTracker := make(map[string]int, len(groups))
	codeHelpTracker := make(map[int64]int, len(groups))
	codes := make([]string, 0, len(groups))
	codeHelps := make([]int64, 0, len(groups))
	var errorDetails []domain.RowErrorDetail

	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}

		// 1. Kiểm tra GroupCode (Mã Nhóm Thuộc Tính *)
		if strings.TrimSpace(g.GroupCode) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "GroupCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính (GroupCode) không được để trống", rowNum),
			})
		} else {
			codeClean := strings.ToLower(strings.TrimSpace(g.GroupCode))
			if firstRow, exists := codeTracker[codeClean]; exists {
				errorDetails = append(errorDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     g.GroupCode,
					Field:   "GroupCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, g.GroupCode, firstRow),
				})
			} else {
				codeTracker[codeClean] = rowNum
				codes = append(codes, strings.TrimSpace(g.GroupCode))
			}
		}

		// 2. Kiểm tra GroupName (Tên Nhóm Thuộc Tính *)
		if g.GroupName == nil || strings.TrimSpace(*g.GroupName) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     g.GroupCode,
				Field:   "GroupName",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên nhóm thuộc tính (GroupName) không được để trống", rowNum),
			})
		}

		// 3. Kiểm tra CodeHelp (Mã CodeHelp *)
		if g.CodeHelp <= 0 {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     g.GroupCode,
				Field:   "CodeHelp",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã CodeHelp bắt buộc phải lớn hơn 0", rowNum),
			})
		} else {
			if firstRow, exists := codeHelpTracker[g.CodeHelp]; exists {
				errorDetails = append(errorDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     g.GroupCode,
					Field:   "CodeHelp",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã CodeHelp '%d' bị trùng với dòng %d trong mảng thêm mới", rowNum, g.CodeHelp, firstRow),
				})
			} else {
				codeHelpTracker[g.CodeHelp] = rowNum
				codeHelps = append(codeHelps, g.CodeHelp)
			}
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: MỞ TRANSACTION & BATCH PRE-CHECK TRÙNG DB (GroupCode & CodeHelp) ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var dbDuplicates []domain.RowErrorDetail

	// 2.1. Kiểm tra trùng GroupCode trong DB
	if len(codes) > 0 {
		queryDupCode, argsDupCode, err := sqlx.In(`SELECT "GroupCode" FROM "_ERPSysAttrGroups" WHERE "GroupCode" IN (?)`, codes)
		if err == nil {
			queryDupCode = tx.Rebind(queryDupCode)
			var existingCodes []string
			_ = tx.SelectContext(ctx, &existingCodes, queryDupCode, argsDupCode...)
			for _, c := range existingCodes {
				cClean := strings.ToLower(strings.TrimSpace(c))
				rowNum := codeTracker[cClean]
				dbDuplicates = append(dbDuplicates, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     c,
					Field:   "GroupCode",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính '%s' đã tồn tại sẵn trong cơ sở dữ liệu", rowNum, c),
				})
			}
		}
	}

	// 2.2. Kiểm tra trùng CodeHelp trong DB
	if len(codeHelps) > 0 {
		type ExistingHelp struct {
			CodeHelp  int64  `db:"CodeHelp"`
			GroupCode string `db:"GroupCode"`
		}
		var existingHelps []ExistingHelp
		queryDupHelp, argsDupHelp, err := sqlx.In(`SELECT "CodeHelp", "GroupCode" FROM "_ERPSysAttrGroups" WHERE "CodeHelp" IN (?)`, codeHelps)
		if err == nil {
			queryDupHelp = tx.Rebind(queryDupHelp)
			_ = tx.SelectContext(ctx, &existingHelps, queryDupHelp, argsDupHelp...)
			for _, h := range existingHelps {
				rowNum := codeHelpTracker[h.CodeHelp]
				dbDuplicates = append(dbDuplicates, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     h.GroupCode,
					Field:   "CodeHelp",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã CodeHelp '%d' đã được sử dụng bởi nhóm thuộc tính '%s'", rowNum, h.CodeHelp, h.GroupCode),
				})
			}
		}
	}

	if len(dbDuplicates) > 0 {
		return nil, &domain.BatchSaveError{
			Message: "Phát hiện dữ liệu trùng lặp trong hệ thống",
			Details: dbDuplicates,
		}
	}

	// ── BƯỚC 3: 1-QUERY ATOMIC BULK INSERT BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(groups)
	arrIdSeqs := make([]string, n)
	arrGroupCodes := make([]string, n)
	arrGroupNames := make([]string, n)
	arrCodeHelps := make([]int64, n)
	arrLangKeys := make([]string, n)
	arrComments := make([]string, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrCreatedBy := make([]string, n)
	arrUpdatedBy := make([]string, n)

	for i, g := range groups {
		if g.IdSeq != "" {
			arrIdSeqs[i] = g.IdSeq
		} else {
			arrIdSeqs[i] = uuid.New().String()
		}
		arrGroupCodes[i] = g.GroupCode
		if g.GroupName != nil {
			arrGroupNames[i] = *g.GroupName
		}
		arrCodeHelps[i] = g.CodeHelp
		if g.LangKey != nil {
			arrLangKeys[i] = *g.LangKey
		}
		if g.Comment != nil {
			arrComments[i] = *g.Comment
		}
		arrRowVersions[i] = 1
		if g.IdxNo != nil {
			arrIdxNos[i] = *g.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if g.CreatedBy != nil {
			arrCreatedBy[i] = *g.CreatedBy
		}
		if g.UpdatedBy != nil {
			arrUpdatedBy[i] = *g.UpdatedBy
		} else if g.CreatedBy != nil {
			arrUpdatedBy[i] = *g.CreatedBy
		}
	}

	bulkInsertSQL := `
		WITH inserted AS (
			INSERT INTO "_ERPSysAttrGroups" (
				"IdSeq", "GroupCode", "GroupName", "CodeHelp", "LangKey", "Comment", "RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			)
			SELECT 
				t.idseq, t.gcode, t.gname, t.chelp, t.lkey, t.cmt, t.ver, t.idx, t.cb, NOW(), t.ub, NOW()
			FROM UNNEST(
				$1::text[], $2::text[], $3::text[], $4::bigint[], $5::text[], $6::text[], $7::bigint[], $8::int[], $9::text[], $10::text[]
			) AS t(idseq, gcode, gname, chelp, lkey, cmt, ver, idx, cb, ub)
			RETURNING *
		)
		SELECT 
			g."IdSeq", g."GroupCode", g."GroupName", g."CodeHelp", g."LangKey", g."Comment", 
			COALESCE(g."RowVersion", 1) AS "RowVersion", g."IdxNo", 
			g."CreatedBy",
			COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			g."CreatedAt",
			g."UpdatedBy",
			COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			g."UpdatedAt"
		FROM inserted g
		LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY g."IdxNo" ASC, g."CreatedAt" ASC
	`

	var createdRecords []domain.ERPSysAttrGroups
	err = tx.SelectContext(ctx, &createdRecords, bulkInsertSQL,
		pq.Array(arrIdSeqs),
		pq.Array(arrGroupCodes),
		pq.Array(arrGroupNames),
		pq.Array(arrCodeHelps),
		pq.Array(arrLangKeys),
		pq.Array(arrComments),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Insert SysAttrGroups: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(createdRecords)))
	cache.GetCache().DeletePrefix(ctx, "sys_attr_groups_q:")
	s.PublishKafkaEvent("SYS_ATTR_GROUP_CREATED", createdRecords)

	return createdRecords, nil
}
