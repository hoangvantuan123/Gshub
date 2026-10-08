package sys_attr_item

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// SysAttrItemsA - Thêm mới chi tiết giá trị thuộc tính chuẩn hóa theo chuẩn RootMenu
func (s *SysAttrItemsService) SysAttrItemsA(ctx context.Context, items []domain.ERPSysAttrItems) ([]domain.ERPSysAttrItems, error) {
	if len(items) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if len(items) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng thêm mới vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(items))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N) - 0% I/O DB) ──
	codeTracker := make(map[string]int, len(items))
	codes := make([]string, 0, len(items))
	var errorDetails []domain.RowErrorDetail

	for idx, it := range items {
		rowNum := idx + 1
		if it.IdxNo != nil && *it.IdxNo > 0 {
			rowNum = *it.IdxNo
		}
		if it.AttrGroupSeq == nil || strings.TrimSpace(*it.AttrGroupSeq) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "AttrGroupSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu IdSeq nhóm thuộc tính (AttrGroupSeq)", rowNum),
			})
			continue
		}
		if strings.TrimSpace(it.AttrValueCode) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "AttrValueCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã giá trị thuộc tính (AttrValueCode) không được để trống", rowNum),
			})
			continue
		}

		uniqueKey := strings.ToLower(strings.TrimSpace(*it.AttrGroupSeq)) + "_" + strings.ToLower(strings.TrimSpace(it.AttrValueCode))
		if firstRow, exists := codeTracker[uniqueKey]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     it.AttrValueCode,
				Field:   "AttrValueCode",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: Mã giá trị '%s' bị trùng với dòng %d trong cùng nhóm thuộc tính", rowNum, it.AttrValueCode, firstRow),
			})
			continue
		}
		codeTracker[uniqueKey] = rowNum
		codes = append(codes, strings.TrimSpace(it.AttrValueCode))
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

	// ── BƯỚC 3: 1-QUERY ATOMIC BULK INSERT BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
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
	arrCreatedBy := make([]string, n)
	arrUpdatedBy := make([]string, n)

	for i, it := range items {
		if it.IdSeq != "" {
			arrIdSeqs[i] = it.IdSeq
		} else {
			arrIdSeqs[i] = uuid.New().String()
		}
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
		arrRowVersions[i] = 1
		if it.IdxNo != nil {
			arrIdxNos[i] = *it.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if it.CreatedBy != nil {
			arrCreatedBy[i] = *it.CreatedBy
		}
		if it.UpdatedBy != nil {
			arrUpdatedBy[i] = *it.UpdatedBy
		} else if it.CreatedBy != nil {
			arrUpdatedBy[i] = *it.CreatedBy
		}
	}

	bulkInsertSQL := `
		WITH inserted AS (
			INSERT INTO "_ERPSysAttrItems" (
				"IdSeq", "AttrGroupSeq", "AttrValueCode", "AttrValueName", "LangKey", "ExtraValue", "Comment", "IsActive", "RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			)
			SELECT 
				t.idseq, t.gseq, t.vcode, t.vname, t.lkey, t.extra, t.cmt, t.act, t.ver, t.idx, t.cb, NOW(), t.ub, NOW()
			FROM UNNEST(
				$1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::boolean[], $9::bigint[], $10::int[], $11::text[], $12::text[]
			) AS t(idseq, gseq, vcode, vname, lkey, extra, cmt, act, ver, idx, cb, ub)
			RETURNING *
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
		FROM inserted i
		LEFT JOIN "_ERPSysAttrGroups" g ON i."AttrGroupSeq" = g."IdSeq"
		LEFT JOIN "_ERPUsers" uc ON CAST(i."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(i."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(i."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(i."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY i."IdxNo" ASC, i."CreatedAt" ASC
	`

	var createdRecords []domain.ERPSysAttrItems
	err = tx.SelectContext(ctx, &createdRecords, bulkInsertSQL,
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
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Insert SysAttrItems: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(createdRecords)))
	cache.GetCache().DeletePrefix(ctx, "sys_attr_items_q:")
	s.PublishKafkaEvent("SYS_ATTR_ITEM_CREATED", createdRecords)

	return createdRecords, nil
}
