package perm_resource_field

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermResourceFieldsA - Thêm mới hàng loạt trường phân quyền theo Menu (Batch Insert)
func (s *PermResourceFieldsService) PermResourceFieldsA(ctx context.Context, fields []domainRoles.ERPPermResourceFields) ([]domainRoles.ERPPermResourceFields, error) {
	if len(fields) == 0 {
		return []domainRoles.ERPPermResourceFields{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(fields) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi thêm mới vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	codeTracker := make(map[string]int)
	combos := make([]string, 0, len(fields))

	for i, f := range fields {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(f.ResourceSeq)
		fieldSeq := strings.TrimSpace(f.FieldSeq)

		if resourceSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     fieldSeq,
				Field:   "ResourceSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Menu (ResourceSeq) không được để trống", rowNum),
			})
		}

		if fieldSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     "",
				Field:   "FieldSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Trường dữ liệu (FieldSeq) không được để trống", rowNum),
			})
		}

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
				combos = append(combos, comboKey)
			}
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Kiểm tra trùng lặp trong DB
	if len(combos) > 0 {
		var resourceSeqs, fieldSeqs []string
		for _, c := range combos {
			parts := strings.Split(c, "|")
			resourceSeqs = append(resourceSeqs, parts[0])
			fieldSeqs = append(fieldSeqs, parts[1])
		}

		checkQuery := `
			SELECT "ResourceSeq", "FieldSeq"
			FROM "_ERPPermResourceFields"
			WHERE "ResourceSeq" = ANY($1) AND "FieldSeq" = ANY($2)
		`
		type ExistingPair struct {
			ResourceSeq string `db:"ResourceSeq"`
			FieldSeq    string `db:"FieldSeq"`
		}
		var existingPairs []ExistingPair
		err := s.db.SelectContext(ctx, &existingPairs, checkQuery, pq.Array(resourceSeqs), pq.Array(fieldSeqs))
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

		if len(errorDetails) > 0 {
			return nil, &domainSys.BatchSaveError{
				Message: fmt.Sprintf("Có %d lỗi trùng lặp dữ liệu trong cơ sở dữ liệu", len(errorDetails)),
				Details: errorDetails,
			}
		}
	}

	// Thực hiện Batch Insert
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("khởi tạo transaction thất bại: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO "_ERPPermResourceFields" (
			"IdSeq", "ResourceSeq", "FieldSeq", "CustomFieldName",
			"IsMaskable", "IsSensitive", "OrderNo", "Comment",
			"RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
		) VALUES (
			:IdSeq, :ResourceSeq, :FieldSeq, :CustomFieldName,
			:IsMaskable, :IsSensitive, :OrderNo, :Comment,
			1, :IdxNo, :CreatedBy, NOW(), :UpdatedBy, NOW()
		) RETURNING "IdSeq", "RowVersion"
	`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("chuẩn bị query insert thất bại: %w", err)
	}
	defer stmt.Close()

	insertedFields := make([]domainRoles.ERPPermResourceFields, len(fields))
	for i, f := range fields {
		if strings.TrimSpace(f.IdSeq) == "" {
			newUUID, _ := uuid.NewV7()
			f.IdSeq = newUUID.String()
		}
		f.RowVersion = 1

		var ret struct {
			IdSeq      string `db:"IdSeq"`
			RowVersion int64  `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, f); err != nil {
			return nil, fmt.Errorf("lỗi thêm mới dòng %d: %w", i+1, err)
		}
		f.IdSeq = ret.IdSeq
		f.RowVersion = ret.RowVersion
		insertedFields[i] = f
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transaction thất bại: %w", err)
	}

	s.PublishKafkaEvent("CREATED_BATCH", insertedFields)
	if s.log != nil {
		s.log.Info("Batch insert ERPPermResourceFields thành công", zap.Int("count", len(insertedFields)))
	}

	return insertedFields, nil
}
