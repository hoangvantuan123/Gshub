package perm_resource_field

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermResourceFieldsU - Cập nhật hàng loạt trường phân quyền theo Menu (Batch Update with OCC)
func (s *PermResourceFieldsService) PermResourceFieldsU(ctx context.Context, fields []domainRoles.ERPPermResourceFields) ([]domainRoles.ERPPermResourceFields, error) {
	if len(fields) == 0 {
		return []domainRoles.ERPPermResourceFields{}, nil
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
				Key:     "",
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã IdSeq không được để trống khi cập nhật", rowNum),
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

	// Kiểm tra Optimistic Concurrency Control (RowVersion)
	type RowCheck struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var existingRows []RowCheck
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermResourceFields" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("kiểm tra phiên bản dữ liệu thất bại: %w", err)
	}

	rowVersionMap := make(map[string]int64, len(existingRows))
	for _, r := range existingRows {
		rowVersionMap[r.IdSeq] = r.RowVersion
	}

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		currVersion, exists := rowVersionMap[idSeq]
		if !exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại trong hệ thống", rowNum),
			})
		} else if f.RowVersion > 0 && currVersion != f.RowVersion {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "OCC_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị người khác thay đổi (phiên bản hiện tại: %d, phiên bản gửi lên: %d)", rowNum, currVersion, f.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi phiên bản/tồn tại dữ liệu", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Kiểm tra trùng lặp (ResourceSeq, FieldSeq) khi cập nhật
	codeTracker := make(map[string]int)
	var resourceSeqs, fieldSeqs []string
	for i, f := range fields {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(f.ResourceSeq)
		fieldSeq := strings.TrimSpace(f.FieldSeq)
		if resourceSeq != "" && fieldSeq != "" {
			comboKey := fmt.Sprintf("%s|%s", resourceSeq, fieldSeq)
			if firstIdx, exists := codeTracker[comboKey]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     comboKey,
					Field:   "FieldSeq",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Trường dữ liệu đã bị trùng lặp với dòng %d trong cùng Menu", rowNum, firstIdx),
				})
			} else {
				codeTracker[comboKey] = rowNum
				resourceSeqs = append(resourceSeqs, resourceSeq)
				fieldSeqs = append(fieldSeqs, fieldSeq)
			}
		}
	}

	if len(resourceSeqs) > 0 {
		type ExistingPair struct {
			IdSeq       string `db:"IdSeq"`
			ResourceSeq string `db:"ResourceSeq"`
			FieldSeq    string `db:"FieldSeq"`
		}
		var existingPairs []ExistingPair
		checkDupQuery := `
			SELECT "IdSeq", "ResourceSeq", "FieldSeq"
			FROM "_ERPPermResourceFields"
			WHERE "ResourceSeq" = ANY($1) AND "FieldSeq" = ANY($2) AND "IdSeq" != ALL($3)
		`
		err := s.db.SelectContext(ctx, &existingPairs, checkDupQuery, pq.Array(resourceSeqs), pq.Array(fieldSeqs), pq.Array(idSeqs))
		if err == nil && len(existingPairs) > 0 {
			for _, ep := range existingPairs {
				comboKey := fmt.Sprintf("%s|%s", ep.ResourceSeq, ep.FieldSeq)
				if rowIdx, ok := codeTracker[comboKey]; ok {
					errorDetails = append(errorDetails, domainSys.RowErrorDetail{
						IdxNo:   rowIdx,
						Key:     comboKey,
						Field:   "FieldSeq",
						Type:    "EXISTS",
						Message: fmt.Sprintf("Dòng %d: Trường dữ liệu đã được gán vào menu này trong hệ thống", rowIdx),
					})
				}
			}
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Thực hiện cập nhật
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("khởi tạo transaction cập nhật thất bại: %w", err)
	}
	defer tx.Rollback()

	updateQuery := `
		UPDATE "_ERPPermResourceFields" SET
			"ResourceSeq" = COALESCE(NULLIF(:ResourceSeq, ''), "ResourceSeq"),
			"FieldSeq" = COALESCE(NULLIF(:FieldSeq, ''), "FieldSeq"),
			"CustomFieldName" = :CustomFieldName,
			"IsMaskable" = :IsMaskable,
			"IsSensitive" = :IsSensitive,
			"OrderNo" = :OrderNo,
			"Comment" = :Comment,
			"RowVersion" = "RowVersion" + 1,
			"IdxNo" = :IdxNo,
			"UpdatedBy" = :UpdatedBy,
			"UpdatedAt" = NOW()
		WHERE "IdSeq" = :IdSeq
		RETURNING "RowVersion"
	`

	stmt, err := tx.PrepareNamedContext(ctx, updateQuery)
	if err != nil {
		return nil, fmt.Errorf("chuẩn bị truy vấn cập nhật thất bại: %w", err)
	}
	defer stmt.Close()

	updatedFields := make([]domainRoles.ERPPermResourceFields, len(fields))
	for i, f := range fields {
		var ret struct {
			RowVersion int64 `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, f); err != nil {
			return nil, fmt.Errorf("cập nhật thất bại tại dòng %d: %w", i+1, err)
		}
		f.RowVersion = ret.RowVersion
		updatedFields[i] = f
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit cập nhật thất bại: %w", err)
	}

	s.PublishKafkaEvent("UPDATED_BATCH", updatedFields)
	if s.log != nil {
		s.log.Info("Batch update ERPPermResourceFields thành công", zap.Int("count", len(updatedFields)))
	}

	return updatedFields, nil
}
