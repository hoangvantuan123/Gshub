package perm_field

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermFieldsU - Cập nhật hàng loạt trường phân quyền dữ liệu (Batch Update CTE O(1))
func (s *PermFieldsService) PermFieldsU(ctx context.Context, fields []domainRoles.ERPPermFields) ([]domainRoles.ERPPermFields, error) {
	if len(fields) == 0 {
		return []domainRoles.ERPPermFields{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(fields) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi cập nhật vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	idSeqs := make([]string, 0, len(fields))

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		if idSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã định danh IdSeq không được để trống khi cập nhật", rowNum),
			})
		} else {
			idSeqs = append(idSeqs, idSeq)
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// 1. Kiểm tra tồn tại và xung đột phiên bản (OCC)
	type RowCheck struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var existingRows []RowCheck
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermFields" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện tại trong cơ sở dữ liệu: %w", err)
	}

	dbRowMap := make(map[string]int64, len(existingRows))
	for _, row := range existingRows {
		dbRowMap[row.IdSeq] = row.RowVersion
	}

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		expectedVer, exists := dbRowMap[idSeq]
		if !exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại trong cơ sở dữ liệu hoặc đã bị xóa", rowNum),
			})
			continue
		}

		if f.RowVersion > 0 && f.RowVersion != expectedVer {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "CONCURRENCY_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị thay đổi bởi người dùng khác (Phiên bản DB: %d, Phiên bản gửi lên: %d). Vui lòng tải lại!", rowNum, expectedVer, f.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi xung đột dữ liệu hoặc không tìm thấy", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// 2. Chuẩn bị mảng Batch Update
	n := len(fields)
	paramIdSeqs := make([]string, n)
	resourceSeqs := make([]*string, n)
	fieldCodes := make([]string, n)
	fieldNames := make([]string, n)
	dictSeqs := make([]*int64, n)
	langKeys := make([]*string, n)
	isMaskables := make([]bool, n)
	isSensitives := make([]bool, n)
	orderNos := make([]int, n)
	comments := make([]*string, n)
	idxNos := make([]*int, n)
	updatedBys := make([]*string, n)

	for i, f := range fields {
		paramIdSeqs[i] = strings.TrimSpace(f.IdSeq)
		resourceSeqs[i] = f.ResourceSeq
		if f.FieldCode != nil {
			fieldCodes[i] = strings.TrimSpace(*f.FieldCode)
		}
		if f.FieldName != nil {
			fieldNames[i] = strings.TrimSpace(*f.FieldName)
		}
		dictSeqs[i] = f.DictSeq
		langKeys[i] = f.LangKey
		isMaskables[i] = f.IsMaskable
		isSensitives[i] = f.IsSensitive
		orderNos[i] = f.OrderNo
		comments[i] = f.Comment
		idxNos[i] = f.IdxNo
		updatedBys[i] = f.UpdatedBy
	}

	query := `
		WITH data AS (
			SELECT
				UNNEST($1::VARCHAR[]) AS "IdSeq",
				UNNEST($2::VARCHAR[]) AS "ResourceSeq",
				UNNEST($3::VARCHAR[]) AS "FieldCode",
				UNNEST($4::VARCHAR[]) AS "FieldName",
				UNNEST($5::BIGINT[]) AS "DictSeq",
				UNNEST($6::VARCHAR[]) AS "LangKey",
				UNNEST($7::BOOLEAN[]) AS "IsMaskable",
				UNNEST($8::BOOLEAN[]) AS "IsSensitive",
				UNNEST($9::INTEGER[]) AS "OrderNo",
				UNNEST($10::TEXT[]) AS "Comment",
				UNNEST($11::INTEGER[]) AS "IdxNo",
				UNNEST($12::VARCHAR[]) AS "UpdatedBy"
		),
		updated AS (
			UPDATE "_ERPPermFields" AS a
			SET
				"ResourceSeq"  = CASE WHEN d."ResourceSeq" IS NOT NULL AND d."ResourceSeq" <> '' THEN d."ResourceSeq" ELSE a."ResourceSeq" END,
				"FieldCode"    = CASE WHEN d."FieldCode" <> '' THEN d."FieldCode" ELSE a."FieldCode" END,
				"FieldName"    = CASE WHEN d."FieldName" <> '' THEN d."FieldName" ELSE a."FieldName" END,
				"DictSeq"      = d."DictSeq",
				"LangKey"      = d."LangKey",
				"IsMaskable"   = d."IsMaskable",
				"IsSensitive"  = d."IsSensitive",
				"OrderNo"      = d."OrderNo",
				"Comment"      = d."Comment",
				"IdxNo"        = d."IdxNo",
				"RowVersion"   = a."RowVersion" + 1,
				"UpdatedBy"    = d."UpdatedBy",
				"UpdatedAt"    = NOW()
			FROM data d
			WHERE a."IdSeq" = d."IdSeq"
			RETURNING
				a."IdSeq",
				a."ResourceSeq",
				a."FieldCode",
				a."FieldName",
				a."DictSeq",
				a."LangKey",
				a."IsMaskable",
				a."IsSensitive",
				a."OrderNo",
				a."Comment",
				a."RowVersion",
				a."IdxNo",
				a."CreatedBy",
				a."CreatedAt",
				a."UpdatedBy",
				a."UpdatedAt"
		)
		SELECT
			up."IdSeq",
			up."ResourceSeq",
			COALESCE(sm."Key", '') AS "ResourceCode",
			COALESCE(sm."Label", '') AS "ResourceName",
			up."FieldCode",
			up."FieldName",
			up."DictSeq",
			up."LangKey",
			up."IsMaskable",
			up."IsSensitive",
			up."OrderNo",
			up."Comment",
			up."RowVersion",
			up."IdxNo",
			up."CreatedBy",
			COALESCE(uc."UserName", uc."UserId", CAST(up."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			up."CreatedAt",
			up."UpdatedBy",
			COALESCE(uu."UserName", uu."UserId", CAST(up."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			up."UpdatedAt"
		FROM updated up
		LEFT JOIN "_ERPMenus" sm ON CAST(up."ResourceSeq" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uc ON CAST(up."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(up."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(up."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(up."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY up."IdxNo" ASC NULLS LAST
	`

	result := make([]domainRoles.ERPPermFields, 0)
	err = s.db.SelectContext(
		ctx,
		&result,
		query,
		pq.Array(paramIdSeqs),
		pq.Array(resourceSeqs),
		pq.Array(fieldCodes),
		pq.Array(fieldNames),
		pq.Array(dictSeqs),
		pq.Array(langKeys),
		pq.Array(isMaskables),
		pq.Array(isSensitives),
		pq.Array(orderNos),
		pq.Array(comments),
		pq.Array(idxNos),
		pq.Array(updatedBys),
	)

	if err != nil {
		if s.log != nil {
			s.log.Error("[PermFieldsU] Batch update CTE failed", zap.Error(err))
		}
		return nil, fmt.Errorf("cập nhật danh sách trường phân quyền thất bại: %w", err)
	}

	s.PublishKafkaEvent("PERM_FIELDS_U", result)

	return result, nil
}
