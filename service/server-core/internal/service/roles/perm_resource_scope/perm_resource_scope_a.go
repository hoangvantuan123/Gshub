package perm_resource_scope

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

// PermResourceScopesA - Thêm mới hàng loạt phạm vi theo Menu (Batch Insert)
func (s *PermResourceScopesService) PermResourceScopesA(ctx context.Context, scopes []domainRoles.ERPPermResourceScopes) ([]domainRoles.ERPPermResourceScopes, error) {
	if len(scopes) == 0 {
		return []domainRoles.ERPPermResourceScopes{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(scopes) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi thêm mới vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	codeTracker := make(map[string]int)
	combos := make([]string, 0, len(scopes))

	for i, sc := range scopes {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(sc.ResourceSeq)
		scopeSeq := strings.TrimSpace(sc.ScopeSeq)

		if resourceSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     scopeSeq,
				Field:   "ResourceSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Menu (ResourceSeq) không được để trống", rowNum),
			})
		}

		if scopeSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     "",
				Field:   "ScopeSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Phạm vi dữ liệu (ScopeSeq) không được để trống", rowNum),
			})
		}

		if resourceSeq != "" && scopeSeq != "" {
			comboKey := fmt.Sprintf("%s|%s", resourceSeq, scopeSeq)
			if firstIdx, exists := codeTracker[comboKey]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     comboKey,
					Field:   "ScopeSeq",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Phạm vi dữ liệu đã bị trùng lặp với dòng %d trong cùng Menu", rowNum, firstIdx),
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
		var resourceSeqs, scopeSeqs []string
		for _, c := range combos {
			parts := strings.Split(c, "|")
			resourceSeqs = append(resourceSeqs, parts[0])
			scopeSeqs = append(scopeSeqs, parts[1])
		}

		checkQuery := `
			SELECT "ResourceSeq", "ScopeSeq"
			FROM "_ERPPermResourceScopes"
			WHERE "ResourceSeq" = ANY($1) AND "ScopeSeq" = ANY($2)
		`
		type ExistingPair struct {
			ResourceSeq string `db:"ResourceSeq"`
			ScopeSeq    string `db:"ScopeSeq"`
		}
		var existingPairs []ExistingPair
		err := s.db.SelectContext(ctx, &existingPairs, checkQuery, pq.Array(resourceSeqs), pq.Array(scopeSeqs))
		if err == nil && len(existingPairs) > 0 {
			for _, ep := range existingPairs {
				comboKey := fmt.Sprintf("%s|%s", ep.ResourceSeq, ep.ScopeSeq)
				if rowIdx, ok := codeTracker[comboKey]; ok {
					errorDetails = append(errorDetails, domainSys.RowErrorDetail{
						IdxNo:   rowIdx,
						Key:     comboKey,
						Field:   "ScopeSeq",
						Type:    "EXISTS",
						Message: fmt.Sprintf("Dòng %d: Phạm vi dữ liệu này đã được gán vào menu trong hệ thống", rowIdx),
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
		INSERT INTO "_ERPPermResourceScopes" (
			"IdSeq", "ResourceSeq", "ScopeSeq", "CustomScopeName",
			"OrderNo", "Comment",
			"RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
		) VALUES (
			:IdSeq, :ResourceSeq, :ScopeSeq, :CustomScopeName,
			:OrderNo, :Comment,
			1, :IdxNo, :CreatedBy, NOW(), :UpdatedBy, NOW()
		) RETURNING "IdSeq", "RowVersion"
	`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("chuẩn bị query insert thất bại: %w", err)
	}
	defer stmt.Close()

	insertedScopes := make([]domainRoles.ERPPermResourceScopes, len(scopes))
	for i, sc := range scopes {
		if strings.TrimSpace(sc.IdSeq) == "" {
			newUUID, _ := uuid.NewV7()
			sc.IdSeq = newUUID.String()
		}
		sc.RowVersion = 1

		var ret struct {
			IdSeq      string `db:"IdSeq"`
			RowVersion int64  `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, sc); err != nil {
			return nil, fmt.Errorf("lỗi thêm mới dòng %d: %w", i+1, err)
		}
		sc.IdSeq = ret.IdSeq
		sc.RowVersion = ret.RowVersion
		insertedScopes[i] = sc
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transaction thất bại: %w", err)
	}

	s.PublishKafkaEvent("CREATED_BATCH", insertedScopes)
	if s.log != nil {
		s.log.Info("Batch insert ERPPermResourceScopes thành công", zap.Int("count", len(insertedScopes)))
	}

	return insertedScopes, nil
}
