package perm_action

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"server-core/internal/constants"
	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermActionsU - Cập nhật hành động quyền hạn (Chống Deadlock + OCC RowVersion + Kiểm tra Unique ActionCode + CTE Bulk Update JOIN Audit User Info)
func (s *PermActionsService) PermActionsU(ctx context.Context, actions []domainRoles.ERPPermActions) ([]domainRoles.ERPPermActions, error) {
	if len(actions) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if len(actions) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng cập nhật vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(actions))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N)) ──
	codeTracker := make(map[string]int, len(actions))
	idTracker := make(map[string]int, len(actions))
	codes := make([]string, 0, len(actions))
	idSeqs := make([]string, 0, len(actions))
	var errorDetails []domainSys.RowErrorDetail

	for idx, a := range actions {
		rowNum := idx + 1
		if a.IdxNo != nil && *a.IdxNo > 0 {
			rowNum = *a.IdxNo
		}

		// 1. Kiểm tra IdSeq
		if strings.TrimSpace(a.IdSeq) == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu IdSeq định danh bản ghi", rowNum),
			})
			continue
		}
		idClean := strings.ToLower(strings.TrimSpace(a.IdSeq))
		if firstRow, exists := idTracker[idClean]; exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      a.IdSeq,
				Field:   "IdSeq",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: IdSeq '%s' bị trùng lặp với dòng %d trong mảng cập nhật", rowNum, a.IdSeq, firstRow),
			})
			continue
		}
		idTracker[idClean] = rowNum
		idSeqs = append(idSeqs, a.IdSeq)

		// 2. Kiểm tra ActionCode (Mã Hành Động *)
		if strings.TrimSpace(a.ActionCode) == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      a.IdSeq,
				Field:   "ActionCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã hành động (ActionCode) không được để trống", rowNum),
			})
		} else {
			codeClean := strings.ToLower(strings.TrimSpace(a.ActionCode))
			if firstRow, exists := codeTracker[codeClean]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Id:      a.IdSeq,
					Key:     a.ActionCode,
					Field:   "ActionCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã hành động '%s' bị trùng với dòng %d trong mảng cập nhật", rowNum, a.ActionCode, firstRow),
				})
			} else {
				codeTracker[codeClean] = rowNum
				codes = append(codes, strings.TrimSpace(a.ActionCode))
			}
		}

		// 3. Kiểm tra ActionName (Tên Hành Động *)
		if strings.TrimSpace(a.ActionName) == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      a.IdSeq,
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

	// ── BƯỚC 2: CHỐNG DEADLOCK BẰNG CÁCH SẮP XẾP IDSEQ TĂNG DẦN ──
	sort.Slice(actions, func(i, j int) bool {
		return actions[i].IdSeq < actions[j].IdSeq
	})

	// ── BƯỚC 3: MỞ TRANSACTION, PRE-CHECK UNIQUE DB & OCC ROWVERSION ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 3.1. Kiểm tra trùng ActionCode với các bản ghi KHÁC trong DB
	type ConflictCheck struct {
		IdSeq      string `db:"IdSeq"`
		ActionCode string `db:"ActionCode"`
	}
	var existingOthers []ConflictCheck
	queryConflict := `
		SELECT "IdSeq", "ActionCode"
		FROM "_ERPPermActions"
		WHERE "ActionCode" = ANY($1)
		  AND NOT ("IdSeq" = ANY($2))
	`
	err = tx.SelectContext(ctx, &existingOthers, queryConflict, pq.Array(codes), pq.Array(idSeqs))
	if err == nil && len(existingOthers) > 0 {
		var conflictDetails []domainSys.RowErrorDetail
		for _, other := range existingOthers {
			oCodeClean := strings.ToLower(strings.TrimSpace(other.ActionCode))
			if rowNum, exists := codeTracker[oCodeClean]; exists {
				conflictDetails = append(conflictDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     other.ActionCode,
					Field:   "ActionCode",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã hành động '%s' đã tồn tại ở bản ghi khác trong cơ sở dữ liệu", rowNum, other.ActionCode),
				})
			}
		}
		if len(conflictDetails) > 0 {
			return nil, &domainSys.BatchSaveError{
				Message: "Phát hiện xung đột mã hành động với dữ liệu hiện có",
				Details: conflictDetails,
			}
		}
	}

	// 3.2. Đọc dữ liệu hiện hành để kiểm tra Optimistic Concurrency Control (OCC RowVersion)
	type ExistingRecord struct {
		IdSeq         string     `db:"IdSeq"`
		ActionCode    string     `db:"ActionCode"`
		ActionName    string     `db:"ActionName"`
		RowVersion    int64      `db:"RowVersion"`
		UpdatedAt     *time.Time `db:"UpdatedAt"`
		UpdatedByName string     `db:"UpdatedByName"`
	}

	var existingList []ExistingRecord
	queryCheck := `
		SELECT a."IdSeq", a."ActionCode", a."ActionName", COALESCE(a."RowVersion", 1) AS "RowVersion", a."UpdatedAt",
		       COALESCE(u."UserName", u."UserId", CAST(a."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPPermActions" a
		LEFT JOIN "_ERPUsers" u ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE a."IdSeq" = ANY($1)
	`
	err = tx.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện hành PermActions: %w", err)
	}

	existingMap := make(map[string]ExistingRecord, len(existingList))
	for _, rec := range existingList {
		existingMap[rec.IdSeq] = rec
	}

	// Đối chiếu kiểm tra xung đột từng dòng (Row-level Concurrency via RowVersion)
	var conflictErrors []domainSys.RowErrorDetail
	for idx, a := range actions {
		rowNum := idx + 1
		if a.IdxNo != nil && *a.IdxNo > 0 {
			rowNum = *a.IdxNo
		}
		existing, found := existingMap[a.IdSeq]
		if !found {
			conflictErrors = append(conflictErrors, domainSys.RowErrorDetail{
				Id:      a.IdSeq,
				IdxNo:   rowNum,
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại hoặc đã bị xóa", rowNum),
			})
			continue
		}

		if (existing.RowVersion != 0 || a.RowVersion != 0) && existing.RowVersion != a.RowVersion {
			updatedByName := existing.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}

			msg := fmt.Sprintf("Dòng %d: Người dùng [%s] đã chỉnh sửa trước đó", rowNum, updatedByName)
			if existing.RowVersion > a.RowVersion {
				msg = fmt.Sprintf("Dòng %d: Người dùng [%s] đã cập nhật phiên bản mới hơn", rowNum, updatedByName)
			}

			if s.log != nil {
				s.log.Info("[PermActionsU OCC Conflict]",
					zap.String("idseq", a.IdSeq),
					zap.Int64("db_row_version", existing.RowVersion),
					zap.Int64("client_row_version", a.RowVersion),
				)
			}

			conflictErrors = append(conflictErrors, domainSys.RowErrorDetail{
				Id:      a.IdSeq,
				IdxNo:   rowNum,
				Key:     existing.ActionCode,
				Label:   existing.ActionName,
				Field:   "RowVersion",
				Type:    "CONFLICT",
				Message: msg,
			})
		}
	}

	if len(conflictErrors) > 0 {
		errMsg := fmt.Sprintf("Phát hiện %d dòng dữ liệu đã có phiên bản mới hơn trên hệ thống", len(conflictErrors))
		if len(conflictErrors) == 1 {
			errMsg = conflictErrors[0].Message
		} else if len(conflictErrors) <= 3 {
			var msgs []string
			for _, ce := range conflictErrors {
				msgs = append(msgs, ce.Message)
			}
			errMsg = strings.Join(msgs, " | ")
		}
		return nil, &domainSys.BatchSaveError{
			Message: errMsg,
			Details: conflictErrors,
		}
	}

	// ── BƯỚC 4: 1-QUERY ATOMIC BULK UPDATE BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(actions)
	arrIdSeqs := make([]string, n)
	arrActionCodes := make([]string, n)
	arrActionNames := make([]string, n)
	arrLangKeys := make([]string, n)
	arrIsDefaultAllows := make([]bool, n)
	arrComments := make([]string, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrUpdatedBy := make([]string, n)

	for i, a := range actions {
		arrIdSeqs[i] = a.IdSeq
		arrActionCodes[i] = a.ActionCode
		arrActionNames[i] = a.ActionName
		if a.LangKey != nil {
			arrLangKeys[i] = *a.LangKey
		}
		arrIsDefaultAllows[i] = a.IsDefaultAllow
		if a.Comment != nil {
			arrComments[i] = *a.Comment
		}
		arrRowVersions[i] = existingMap[a.IdSeq].RowVersion + 1
		if a.IdxNo != nil {
			arrIdxNos[i] = *a.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if a.UpdatedBy != nil {
			arrUpdatedBy[i] = *a.UpdatedBy
		}
	}

	bulkUpdateSQL := `
		WITH updated AS (
			UPDATE "_ERPPermActions" AS target
			SET 
				"ActionCode"     = data.acode,
				"ActionName"     = data.aname,
				"LangKey"        = data.lkey,
				"IsDefaultAllow" = data.allow,
				"Comment"        = data.cmt,
				"RowVersion"     = data.ver,
				"IdxNo"          = data.idx,
				"UpdatedBy"      = data.ub,
				"UpdatedAt"      = NOW()
			FROM (
				SELECT * FROM UNNEST(
					$1::text[], $2::text[], $3::text[], $4::text[], $5::boolean[], $6::text[], $7::bigint[], $8::int[], $9::text[]
				) AS t(idseq, acode, aname, lkey, allow, cmt, ver, idx, ub)
			) AS data
			WHERE target."IdSeq" = data.idseq
			RETURNING target.*
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
		FROM updated a
		LEFT JOIN "_ERPUsers" uc ON CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(a."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY a."IdxNo" ASC, a."CreatedAt" ASC
	`

	var updatedRecords []domainRoles.ERPPermActions
	err = tx.SelectContext(ctx, &updatedRecords, bulkUpdateSQL,
		pq.Array(arrIdSeqs),
		pq.Array(arrActionCodes),
		pq.Array(arrActionNames),
		pq.Array(arrLangKeys),
		pq.Array(arrIsDefaultAllows),
		pq.Array(arrComments),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Update PermActions: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "perm_actions_q:")
	s.PublishKafkaEvent("PERM_ACTION_UPDATED", updatedRecords)

	return updatedRecords, nil
}
