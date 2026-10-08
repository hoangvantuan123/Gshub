package perm_resource_scope

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermResourceScopesU - Cập nhật hàng loạt phạm vi theo Menu (Batch Update with OCC)
func (s *PermResourceScopesService) PermResourceScopesU(ctx context.Context, scopes []domainRoles.ERPPermResourceScopes) ([]domainRoles.ERPPermResourceScopes, error) {
	if len(scopes) == 0 {
		return []domainRoles.ERPPermResourceScopes{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(scopes) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi cập nhật vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	idSeqs := make([]string, 0, len(scopes))

	for i, sc := range scopes {
		rowNum := i + 1
		idSeq := strings.TrimSpace(sc.IdSeq)
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

	// Kiểm tra OCC
	type RowCheck struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var existingRows []RowCheck
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermResourceScopes" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("kiểm tra phiên bản dữ liệu thất bại: %w", err)
	}

	rowVersionMap := make(map[string]int64, len(existingRows))
	for _, r := range existingRows {
		rowVersionMap[r.IdSeq] = r.RowVersion
	}

	for i, sc := range scopes {
		rowNum := i + 1
		idSeq := strings.TrimSpace(sc.IdSeq)
		currVersion, exists := rowVersionMap[idSeq]
		if !exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại trong hệ thống", rowNum),
			})
		} else if sc.RowVersion > 0 && currVersion != sc.RowVersion {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "OCC_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị người khác thay đổi (phiên bản hiện tại: %d, phiên bản gửi lên: %d)", rowNum, currVersion, sc.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi phiên bản/tồn tại dữ liệu", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Kiểm tra trùng lặp (ResourceSeq, ScopeSeq) khi cập nhật
	codeTracker := make(map[string]int)
	var resourceSeqs, scopeSeqs []string
	for i, sc := range scopes {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(sc.ResourceSeq)
		scopeSeq := strings.TrimSpace(sc.ScopeSeq)
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
				resourceSeqs = append(resourceSeqs, resourceSeq)
				scopeSeqs = append(scopeSeqs, scopeSeq)
			}
		}
	}

	if len(resourceSeqs) > 0 {
		type ExistingPair struct {
			IdSeq       string `db:"IdSeq"`
			ResourceSeq string `db:"ResourceSeq"`
			ScopeSeq    string `db:"ScopeSeq"`
		}
		var existingPairs []ExistingPair
		checkDupQuery := `
			SELECT "IdSeq", "ResourceSeq", "ScopeSeq"
			FROM "_ERPPermResourceScopes"
			WHERE "ResourceSeq" = ANY($1) AND "ScopeSeq" = ANY($2) AND "IdSeq" != ALL($3)
		`
		err := s.db.SelectContext(ctx, &existingPairs, checkDupQuery, pq.Array(resourceSeqs), pq.Array(scopeSeqs), pq.Array(idSeqs))
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
		UPDATE "_ERPPermResourceScopes" SET
			"ResourceSeq" = COALESCE(NULLIF(:ResourceSeq, ''), "ResourceSeq"),
			"ScopeSeq" = COALESCE(NULLIF(:ScopeSeq, ''), "ScopeSeq"),
			"CustomScopeName" = :CustomScopeName,
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

	updatedScopes := make([]domainRoles.ERPPermResourceScopes, len(scopes))
	for i, sc := range scopes {
		var ret struct {
			RowVersion int64 `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, sc); err != nil {
			return nil, fmt.Errorf("cập nhật thất bại tại dòng %d: %w", i+1, err)
		}
		sc.RowVersion = ret.RowVersion
		updatedScopes[i] = sc
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit cập nhật thất bại: %w", err)
	}

	s.PublishKafkaEvent("UPDATED_BATCH", updatedScopes)
	if s.log != nil {
		s.log.Info("Batch update ERPPermResourceScopes thành công", zap.Int("count", len(updatedScopes)))
	}

	return updatedScopes, nil
}
