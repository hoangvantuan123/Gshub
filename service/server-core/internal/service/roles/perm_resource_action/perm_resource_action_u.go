package perm_resource_action

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermResourceActionsU - Cập nhật hàng loạt hành động theo Menu (Batch Update with OCC)
func (s *PermResourceActionsService) PermResourceActionsU(ctx context.Context, actions []domainRoles.ERPPermResourceActions) ([]domainRoles.ERPPermResourceActions, error) {
	if len(actions) == 0 {
		return []domainRoles.ERPPermResourceActions{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(actions) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi cập nhật vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	idSeqs := make([]string, 0, len(actions))

	for i, a := range actions {
		rowNum := i + 1
		idSeq := strings.TrimSpace(a.IdSeq)
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
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermResourceActions" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("kiểm tra phiên bản dữ liệu thất bại: %w", err)
	}

	rowVersionMap := make(map[string]int64, len(existingRows))
	for _, r := range existingRows {
		rowVersionMap[r.IdSeq] = r.RowVersion
	}

	for i, a := range actions {
		rowNum := i + 1
		idSeq := strings.TrimSpace(a.IdSeq)
		currVersion, exists := rowVersionMap[idSeq]
		if !exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại trong hệ thống", rowNum),
			})
		} else if a.RowVersion > 0 && currVersion != a.RowVersion {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "OCC_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị người khác thay đổi (phiên bản hiện tại: %d, phiên bản gửi lên: %d)", rowNum, currVersion, a.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi phiên bản/tồn tại dữ liệu", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Kiểm tra trùng lặp (ResourceSeq, ActionSeq) khi cập nhật
	codeTracker := make(map[string]int)
	var resourceSeqs, actionSeqs []string
	for i, a := range actions {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(a.ResourceSeq)
		actionSeq := strings.TrimSpace(a.ActionSeq)
		if resourceSeq != "" && actionSeq != "" {
			comboKey := fmt.Sprintf("%s|%s", resourceSeq, actionSeq)
			if firstIdx, exists := codeTracker[comboKey]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     comboKey,
					Field:   "ActionSeq",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Hành động đã bị trùng lặp với dòng %d trong cùng Menu", rowNum, firstIdx),
				})
			} else {
				codeTracker[comboKey] = rowNum
				resourceSeqs = append(resourceSeqs, resourceSeq)
				actionSeqs = append(actionSeqs, actionSeq)
			}
		}
	}

	if len(resourceSeqs) > 0 {
		type ExistingPair struct {
			IdSeq       string `db:"IdSeq"`
			ResourceSeq string `db:"ResourceSeq"`
			ActionSeq   string `db:"ActionSeq"`
		}
		var existingPairs []ExistingPair
		checkDupQuery := `
			SELECT "IdSeq", "ResourceSeq", "ActionSeq"
			FROM "_ERPPermResourceActions"
			WHERE "ResourceSeq" = ANY($1) AND "ActionSeq" = ANY($2) AND "IdSeq" != ALL($3)
		`
		err := s.db.SelectContext(ctx, &existingPairs, checkDupQuery, pq.Array(resourceSeqs), pq.Array(actionSeqs), pq.Array(idSeqs))
		if err == nil && len(existingPairs) > 0 {
			for _, ep := range existingPairs {
				comboKey := fmt.Sprintf("%s|%s", ep.ResourceSeq, ep.ActionSeq)
				if rowIdx, ok := codeTracker[comboKey]; ok {
					errorDetails = append(errorDetails, domainSys.RowErrorDetail{
						IdxNo:   rowIdx,
						Key:     comboKey,
						Field:   "ActionSeq",
						Type:    "EXISTS",
						Message: fmt.Sprintf("Dòng %d: Hành động này đã được gán vào menu trong hệ thống", rowIdx),
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
		UPDATE "_ERPPermResourceActions" SET
			"ResourceSeq" = COALESCE(NULLIF(:ResourceSeq, ''), "ResourceSeq"),
			"ActionSeq" = COALESCE(NULLIF(:ActionSeq, ''), "ActionSeq"),
			"CustomActionName" = :CustomActionName,
			"IsDefaultAllow" = :IsDefaultAllow,
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

	updatedActions := make([]domainRoles.ERPPermResourceActions, len(actions))
	for i, a := range actions {
		var ret struct {
			RowVersion int64 `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, a); err != nil {
			return nil, fmt.Errorf("cập nhật thất bại tại dòng %d: %w", i+1, err)
		}
		a.RowVersion = ret.RowVersion
		updatedActions[i] = a
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit cập nhật thất bại: %w", err)
	}

	s.PublishKafkaEvent("UPDATED_BATCH", updatedActions)
	if s.log != nil {
		s.log.Info("Batch update ERPPermResourceActions thành công", zap.Int("count", len(updatedActions)))
	}

	return updatedActions, nil
}
