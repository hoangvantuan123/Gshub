package sys_attr_group

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"server-core/internal/constants"
	domain "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// SysAttrGroupsU - Cập nhật nhóm thuộc tính (Chống Deadlock + OCC RowVersion + Kiểm tra Unique CodeHelp/GroupCode + CTE Bulk Update JOIN Audit User Info)
func (s *SysAttrGroupsService) SysAttrGroupsU(ctx context.Context, groups []domain.ERPSysAttrGroups) ([]domain.ERPSysAttrGroups, error) {
	if len(groups) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if len(groups) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng cập nhật vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(groups))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N)) ──
	codeTracker := make(map[string]int, len(groups))
	codeHelpTracker := make(map[int64]int, len(groups))
	idTracker := make(map[string]int, len(groups))
	codes := make([]string, 0, len(groups))
	codeHelps := make([]int64, 0, len(groups))
	idSeqs := make([]string, 0, len(groups))
	var errorDetails []domain.RowErrorDetail

	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}

		// 1. Kiểm tra IdSeq
		if strings.TrimSpace(g.IdSeq) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu IdSeq định danh bản ghi", rowNum),
			})
			continue
		}
		idClean := strings.ToLower(strings.TrimSpace(g.IdSeq))
		if firstRow, exists := idTracker[idClean]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.IdSeq,
				Field:   "IdSeq",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: IdSeq '%s' bị trùng lặp với dòng %d trong mảng cập nhật", rowNum, g.IdSeq, firstRow),
			})
			continue
		}
		idTracker[idClean] = rowNum
		idSeqs = append(idSeqs, g.IdSeq)

		// 2. Kiểm tra GroupCode (Mã Nhóm Thuộc Tính *)
		if strings.TrimSpace(g.GroupCode) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.IdSeq,
				Field:   "GroupCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính (GroupCode) không được để trống", rowNum),
			})
		} else {
			codeClean := strings.ToLower(strings.TrimSpace(g.GroupCode))
			if firstRow, exists := codeTracker[codeClean]; exists {
				errorDetails = append(errorDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Id:      g.IdSeq,
					Key:     g.GroupCode,
					Field:   "GroupCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính '%s' bị trùng với dòng %d trong mảng cập nhật", rowNum, g.GroupCode, firstRow),
				})
			} else {
				codeTracker[codeClean] = rowNum
				codes = append(codes, strings.TrimSpace(g.GroupCode))
			}
		}

		// 3. Kiểm tra GroupName (Tên Nhóm Thuộc Tính *)
		if g.GroupName == nil || strings.TrimSpace(*g.GroupName) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.IdSeq,
				Key:     g.GroupCode,
				Field:   "GroupName",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên nhóm thuộc tính (GroupName) không được để trống", rowNum),
			})
		}

		// 4. Kiểm tra CodeHelp (Mã CodeHelp *)
		if g.CodeHelp <= 0 {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.IdSeq,
				Key:     g.GroupCode,
				Field:   "CodeHelp",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã CodeHelp bắt buộc phải lớn hơn 0", rowNum),
			})
		} else {
			if firstRow, exists := codeHelpTracker[g.CodeHelp]; exists {
				errorDetails = append(errorDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Id:      g.IdSeq,
					Key:     g.GroupCode,
					Field:   "CodeHelp",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã CodeHelp '%d' bị trùng với dòng %d trong mảng cập nhật", rowNum, g.CodeHelp, firstRow),
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

	// ── BƯỚC 2: CHỐNG DEADLOCK BẰNG CÁCH SẮP XẾP IDSEQ TĂNG DẦN ──
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].IdSeq < groups[j].IdSeq
	})

	// ── BƯỚC 3: MỞ TRANSACTION, PRE-CHECK UNIQUE DB & OCC ROWVERSION ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 3.1. Kiểm tra trùng GroupCode hoặc CodeHelp với các bản ghi KHÁC trong DB
	type ConflictCheck struct {
		IdSeq     string `db:"IdSeq"`
		GroupCode string `db:"GroupCode"`
		CodeHelp  int64  `db:"CodeHelp"`
	}
	var existingOthers []ConflictCheck
	queryConflict := `
		SELECT "IdSeq", "GroupCode", "CodeHelp"
		FROM "_ERPSysAttrGroups"
		WHERE ("GroupCode" = ANY($1) OR "CodeHelp" = ANY($2))
		  AND NOT ("IdSeq" = ANY($3))
	`
	err = tx.SelectContext(ctx, &existingOthers, queryConflict, pq.Array(codes), pq.Array(codeHelps), pq.Array(idSeqs))
	if err == nil && len(existingOthers) > 0 {
		var conflictDetails []domain.RowErrorDetail
		for _, other := range existingOthers {
			// Check GroupCode collision
			oCodeClean := strings.ToLower(strings.TrimSpace(other.GroupCode))
			if rowNum, exists := codeTracker[oCodeClean]; exists {
				conflictDetails = append(conflictDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     other.GroupCode,
					Field:   "GroupCode",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã nhóm thuộc tính '%s' đã tồn tại ở bản ghi khác trong cơ sở dữ liệu", rowNum, other.GroupCode),
				})
			}
			// Check CodeHelp collision
			if rowNum, exists := codeHelpTracker[other.CodeHelp]; exists {
				conflictDetails = append(conflictDetails, domain.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     other.GroupCode,
					Field:   "CodeHelp",
					Type:    "DUPLICATE_DB",
					Message: fmt.Sprintf("Dòng %d: Mã CodeHelp '%d' đã được sử dụng bởi nhóm thuộc tính '%s'", rowNum, other.CodeHelp, other.GroupCode),
				})
			}
		}
		if len(conflictDetails) > 0 {
			return nil, &domain.BatchSaveError{
				Message: "Phát hiện xung đột mã nhóm hoặc mã CodeHelp với dữ liệu hiện có",
				Details: conflictDetails,
			}
		}
	}

	// 3.2. Đọc dữ liệu hiện hành để kiểm tra Optimistic Concurrency Control (OCC RowVersion)
	type ExistingRecord struct {
		IdSeq         string     `db:"IdSeq"`
		GroupCode     string     `db:"GroupCode"`
		GroupName     *string    `db:"GroupName"`
		RowVersion    int64      `db:"RowVersion"`
		UpdatedAt     *time.Time `db:"UpdatedAt"`
		UpdatedByName string     `db:"UpdatedByName"`
	}

	var existingList []ExistingRecord
	queryCheck := `
		SELECT g."IdSeq", g."GroupCode", g."GroupName", COALESCE(g."RowVersion", 1) AS "RowVersion", g."UpdatedAt",
		       COALESCE(u."UserName", u."UserId", CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPSysAttrGroups" g
		LEFT JOIN "_ERPUsers" u ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE g."IdSeq" = ANY($1)
	`
	err = tx.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện hành SysAttrGroups: %w", err)
	}

	existingMap := make(map[string]ExistingRecord, len(existingList))
	for _, rec := range existingList {
		existingMap[rec.IdSeq] = rec
	}

	// Đối chiếu kiểm tra xung đột từng dòng (Row-level Concurrency via RowVersion)
	var conflictErrors []domain.RowErrorDetail
	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}
		existing, found := existingMap[g.IdSeq]
		if !found {
			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      g.IdSeq,
				IdxNo:   rowNum,
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại hoặc đã bị xóa", rowNum),
			})
			continue
		}

		if (existing.RowVersion != 0 || g.RowVersion != 0) && existing.RowVersion != g.RowVersion {
			updatedByName := existing.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			gName := ""
			if existing.GroupName != nil {
				gName = *existing.GroupName
			}

			msg := fmt.Sprintf("Dòng %d: Người dùng [%s] đã chỉnh sửa trước đó", rowNum, updatedByName)
			if existing.RowVersion > g.RowVersion {
				msg = fmt.Sprintf("Dòng %d: Người dùng [%s] đã cập nhật phiên bản mới hơn", rowNum, updatedByName)
			}

			if s.log != nil {
				s.log.Info("[SysAttrGroupsU OCC Conflict]",
					zap.String("idseq", g.IdSeq),
					zap.Int64("db_row_version", existing.RowVersion),
					zap.Int64("client_row_version", g.RowVersion),
				)
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      g.IdSeq,
				IdxNo:   rowNum,
				Key:     existing.GroupCode,
				Label:   gName,
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
		return nil, &domain.BatchSaveError{
			Message: errMsg,
			Details: conflictErrors,
		}
	}

	// ── BƯỚC 4: 1-QUERY ATOMIC BULK UPDATE BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(groups)
	arrIdSeqs := make([]string, n)
	arrGroupCodes := make([]string, n)
	arrGroupNames := make([]string, n)
	arrCodeHelps := make([]int64, n)
	arrLangKeys := make([]string, n)
	arrComments := make([]string, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrUpdatedBy := make([]string, n)

	for i, g := range groups {
		arrIdSeqs[i] = g.IdSeq
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
		arrRowVersions[i] = existingMap[g.IdSeq].RowVersion + 1
		if g.IdxNo != nil {
			arrIdxNos[i] = *g.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if g.UpdatedBy != nil {
			arrUpdatedBy[i] = *g.UpdatedBy
		}
	}

	bulkUpdateSQL := `
		WITH updated AS (
			UPDATE "_ERPSysAttrGroups" AS target
			SET 
				"GroupCode"  = data.gcode,
				"GroupName"  = data.gname,
				"CodeHelp"   = data.chelp,
				"LangKey"    = data.lkey,
				"Comment"    = data.cmt,
				"RowVersion" = data.ver,
				"IdxNo"      = data.idx,
				"UpdatedBy"  = data.ub,
				"UpdatedAt"  = NOW()
			FROM (
				SELECT * FROM UNNEST(
					$1::text[], $2::text[], $3::text[], $4::bigint[], $5::text[], $6::text[], $7::bigint[], $8::int[], $9::text[]
				) AS t(idseq, gcode, gname, chelp, lkey, cmt, ver, idx, ub)
			) AS data
			WHERE target."IdSeq" = data.idseq
			RETURNING target.*
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
		FROM updated g
		LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY g."IdxNo" ASC, g."CreatedAt" ASC
	`

	var updatedRecords []domain.ERPSysAttrGroups
	err = tx.SelectContext(ctx, &updatedRecords, bulkUpdateSQL,
		pq.Array(arrIdSeqs),
		pq.Array(arrGroupCodes),
		pq.Array(arrGroupNames),
		pq.Array(arrCodeHelps),
		pq.Array(arrLangKeys),
		pq.Array(arrComments),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Update SysAttrGroups: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "sys_attr_groups_q:")
	s.PublishKafkaEvent("SYS_ATTR_GROUP_UPDATED", updatedRecords)

	return updatedRecords, nil
}
