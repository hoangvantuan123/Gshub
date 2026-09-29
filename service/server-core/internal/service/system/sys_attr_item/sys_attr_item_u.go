package sys_attr_item

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

// SysAttrItemsU - Cập nhật chi tiết giá trị thuộc tính (Chống Deadlock + OCC RowVersion + CTE Bulk Update JOIN Audit User Info)
func (s *SysAttrItemsService) SysAttrItemsU(ctx context.Context, items []domain.ERPSysAttrItems) ([]domain.ERPSysAttrItems, error) {
	if len(items) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if len(items) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng cập nhật vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(items))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N)) ──
	codeTracker := make(map[string]int, len(items))
	idTracker := make(map[string]int, len(items))
	var errorDetails []domain.RowErrorDetail

	for idx, it := range items {
		rowNum := idx + 1
		if it.IdxNo != nil && *it.IdxNo > 0 {
			rowNum = *it.IdxNo
		}
		if strings.TrimSpace(it.IdSeq) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu IdSeq định danh bản ghi", rowNum),
			})
			continue
		}
		if strings.TrimSpace(it.AttrValueCode) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "AttrValueCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã giá trị (AttrValueCode) không được để trống", rowNum),
			})
			continue
		}

		gSeq := ""
		if it.AttrGroupSeq != nil {
			gSeq = *it.AttrGroupSeq
		}
		uniqueKey := strings.ToLower(strings.TrimSpace(gSeq)) + "_" + strings.ToLower(strings.TrimSpace(it.AttrValueCode))
		if firstRow, exists := codeTracker[uniqueKey]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     it.AttrValueCode,
				Field:   "AttrValueCode",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: Mã giá trị '%s' bị trùng với dòng %d", rowNum, it.AttrValueCode, firstRow),
			})
			continue
		}
		codeTracker[uniqueKey] = rowNum

		idClean := strings.ToLower(strings.TrimSpace(it.IdSeq))
		if firstRow, exists := idTracker[idClean]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      it.IdSeq,
				Field:   "IdSeq",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: IdSeq '%s' bị trùng lặp với dòng %d", rowNum, it.IdSeq, firstRow),
			})
			continue
		}
		idTracker[idClean] = rowNum
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d dòng dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: CHỐNG DEADLOCK BẰNG CÁCH SẮP XẾP IDSEQ TĂNG DẦN ──
	sort.Slice(items, func(i, j int) bool {
		return items[i].IdSeq < items[j].IdSeq
	})

	// ── BƯỚC 3: MỞ TRANSACTION & BATCH PRE-CHECK OPTIMISTIC LOCKING BẰNG ROWVERSION ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	idSeqs := make([]string, 0, len(items))
	for _, it := range items {
		idSeqs = append(idSeqs, it.IdSeq)
	}

	type ExistingRecord struct {
		IdSeq         string     `db:"IdSeq"`
		AttrValueCode string     `db:"AttrValueCode"`
		AttrValueName *string    `db:"AttrValueName"`
		RowVersion    int64      `db:"RowVersion"`
		UpdatedAt     *time.Time `db:"UpdatedAt"`
		UpdatedByName string     `db:"UpdatedByName"`
	}

	var existingList []ExistingRecord
	queryCheck := `
		SELECT i."IdSeq", i."AttrValueCode", i."AttrValueName", COALESCE(i."RowVersion", 1) AS "RowVersion", i."UpdatedAt",
		       COALESCE(u."UserName", u."UserId", CAST(i."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPSysAttrItems" i
		LEFT JOIN "_ERPUsers" u ON CAST(i."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(i."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE i."IdSeq" = ANY($1)
	`
	err = tx.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện hành SysAttrItems: %w", err)
	}

	existingMap := make(map[string]ExistingRecord, len(existingList))
	for _, rec := range existingList {
		existingMap[rec.IdSeq] = rec
	}

	// Đối chiếu kiểm tra xung đột từng dòng (Row-level Concurrency via RowVersion)
	var conflictErrors []domain.RowErrorDetail
	for idx, it := range items {
		rowNum := idx + 1
		if it.IdxNo != nil && *it.IdxNo > 0 {
			rowNum = *it.IdxNo
		}
		existing, found := existingMap[it.IdSeq]
		if !found {
			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      it.IdSeq,
				IdxNo:   rowNum,
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại hoặc đã bị xóa", rowNum),
			})
			continue
		}

		if (existing.RowVersion != 0 || it.RowVersion != 0) && existing.RowVersion != it.RowVersion {
			updatedByName := existing.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			vName := ""
			if existing.AttrValueName != nil {
				vName = *existing.AttrValueName
			}

			msg := fmt.Sprintf("Dòng %d: Người dùng [%s] đã chỉnh sửa trước đó", rowNum, updatedByName)
			if existing.RowVersion > it.RowVersion {
				msg = fmt.Sprintf("Dòng %d: Người dùng [%s] đã cập nhật phiên bản mới hơn", rowNum, updatedByName)
			}

			if s.log != nil {
				s.log.Info("[SysAttrItemsU OCC Conflict]",
					zap.String("idseq", it.IdSeq),
					zap.Int64("db_row_version", existing.RowVersion),
					zap.Int64("client_row_version", it.RowVersion),
				)
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      it.IdSeq,
				IdxNo:   rowNum,
				Key:     existing.AttrValueCode,
				Label:   vName,
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
	n := len(items)
	arrIdSeqs := make([]string, n)
	arrAttrGroupSeqs := make([]string, n)
	arrAttrValueCodes := make([]string, n)
	arrAttrValueNames := make([]string, n)
	arrLangKeys := make([]string, n)
	arrExtraValues := make([]string, n)
	arrComments := make([]string, n)
	arrIsActives := make([]bool, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrUpdatedBy := make([]string, n)

	for i, it := range items {
		arrIdSeqs[i] = it.IdSeq
		if it.AttrGroupSeq != nil {
			arrAttrGroupSeqs[i] = *it.AttrGroupSeq
		}
		arrAttrValueCodes[i] = it.AttrValueCode
		if it.AttrValueName != nil {
			arrAttrValueNames[i] = *it.AttrValueName
		}
		if it.LangKey != nil {
			arrLangKeys[i] = *it.LangKey
		}
		if it.ExtraValue != nil {
			arrExtraValues[i] = *it.ExtraValue
		}
		if it.Comment != nil {
			arrComments[i] = *it.Comment
		}
		arrIsActives[i] = it.IsActive
		arrRowVersions[i] = existingMap[it.IdSeq].RowVersion + 1
		if it.IdxNo != nil {
			arrIdxNos[i] = *it.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if it.UpdatedBy != nil {
			arrUpdatedBy[i] = *it.UpdatedBy
		}
	}

	bulkUpdateSQL := `
		WITH updated AS (
			UPDATE "_ERPSysAttrItems" AS target
			SET 
				"AttrGroupSeq"  = data.gseq,
				"AttrValueCode" = data.vcode,
				"AttrValueName" = data.vname,
				"LangKey"       = data.lkey,
				"ExtraValue"    = data.extra,
				"Comment"       = data.cmt,
				"IsActive"      = data.act,
				"RowVersion"    = data.ver,
				"IdxNo"         = data.idx,
				"UpdatedBy"     = data.ub,
				"UpdatedAt"     = NOW()
			FROM (
				SELECT * FROM UNNEST(
					$1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::boolean[], $9::bigint[], $10::int[], $11::text[]
				) AS t(idseq, gseq, vcode, vname, lkey, extra, cmt, act, ver, idx, ub)
			) AS data
			WHERE target."IdSeq" = data.idseq
			RETURNING target.*
		)
		SELECT 
			i."IdSeq", 
			i."AttrGroupSeq", 
			COALESCE(g."GroupCode", '') AS "GroupCode",
			COALESCE(g."GroupName", '') AS "GroupName",
			COALESCE(g."CodeHelp", 0) AS "CodeHelp",
			COALESCE(g."LangKey", '') AS "GroupLangKey",
			i."AttrValueCode", 
			i."AttrValueName", 
			i."LangKey", 
			i."ExtraValue", 
			i."Comment", 
			i."IsActive", 
			COALESCE(i."RowVersion", 1) AS "RowVersion", 
			i."IdxNo", 
			i."CreatedBy",
			COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(i."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			i."CreatedAt",
			i."UpdatedBy",
			COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(i."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			i."UpdatedAt"
		FROM updated i
		LEFT JOIN "_ERPSysAttrGroups" g ON i."AttrGroupSeq" = g."IdSeq"
		LEFT JOIN "_ERPUsers" uc ON CAST(i."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(i."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(i."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(i."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY i."IdxNo" ASC, i."CreatedAt" ASC
	`

	var updatedRecords []domain.ERPSysAttrItems
	err = tx.SelectContext(ctx, &updatedRecords, bulkUpdateSQL,
		pq.Array(arrIdSeqs),
		pq.Array(arrAttrGroupSeqs),
		pq.Array(arrAttrValueCodes),
		pq.Array(arrAttrValueNames),
		pq.Array(arrLangKeys),
		pq.Array(arrExtraValues),
		pq.Array(arrComments),
		pq.Array(arrIsActives),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Update SysAttrItems: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "sys_attr_items_q:")
	s.PublishKafkaEvent("SYS_ATTR_ITEM_UPDATED", updatedRecords)

	return updatedRecords, nil
}
