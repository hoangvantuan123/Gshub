package perm_resource_action

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

// PermResourceActionsA - Thêm mới hàng loạt hành động theo Menu (Batch Insert)
func (s *PermResourceActionsService) PermResourceActionsA(ctx context.Context, actions []domainRoles.ERPPermResourceActions) ([]domainRoles.ERPPermResourceActions, error) {
	if len(actions) == 0 {
		return []domainRoles.ERPPermResourceActions{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(actions) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi thêm mới vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	codeTracker := make(map[string]int)
	combos := make([]string, 0, len(actions))

	for i, a := range actions {
		rowNum := i + 1
		resourceSeq := strings.TrimSpace(a.ResourceSeq)
		actionSeq := strings.TrimSpace(a.ActionSeq)

		if resourceSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     actionSeq,
				Field:   "ResourceSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Menu (ResourceSeq) không được để trống", rowNum),
			})
		}

		if actionSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     "",
				Field:   "ActionSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Hành động (ActionSeq) không được để trống", rowNum),
			})
		}

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
		var resourceSeqs, actionSeqs []string
		for _, c := range combos {
			parts := strings.Split(c, "|")
			resourceSeqs = append(resourceSeqs, parts[0])
			actionSeqs = append(actionSeqs, parts[1])
		}

		checkQuery := `
			SELECT "ResourceSeq", "ActionSeq"
			FROM "_ERPPermResourceActions"
			WHERE "ResourceSeq" = ANY($1) AND "ActionSeq" = ANY($2)
		`
		type ExistingPair struct {
			ResourceSeq string `db:"ResourceSeq"`
			ActionSeq   string `db:"ActionSeq"`
		}
		var existingPairs []ExistingPair
		err := s.db.SelectContext(ctx, &existingPairs, checkQuery, pq.Array(resourceSeqs), pq.Array(actionSeqs))
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
		INSERT INTO "_ERPPermResourceActions" (
			"IdSeq", "ResourceSeq", "ActionSeq", "CustomActionName",
			"IsDefaultAllow", "OrderNo", "Comment",
			"RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
		) VALUES (
			:IdSeq, :ResourceSeq, :ActionSeq, :CustomActionName,
			:IsDefaultAllow, :OrderNo, :Comment,
			1, :IdxNo, :CreatedBy, NOW(), :UpdatedBy, NOW()
		) RETURNING "IdSeq", "RowVersion"
	`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("chuẩn bị query insert thất bại: %w", err)
	}
	defer stmt.Close()

	insertedActions := make([]domainRoles.ERPPermResourceActions, len(actions))
	for i, a := range actions {
		if strings.TrimSpace(a.IdSeq) == "" {
			newUUID, _ := uuid.NewV7()
			a.IdSeq = newUUID.String()
		}
		a.RowVersion = 1

		var ret struct {
			IdSeq      string `db:"IdSeq"`
			RowVersion int64  `db:"RowVersion"`
		}
		if err := stmt.GetContext(ctx, &ret, a); err != nil {
			return nil, fmt.Errorf("lỗi thêm mới dòng %d: %w", i+1, err)
		}
		a.IdSeq = ret.IdSeq
		a.RowVersion = ret.RowVersion
		insertedActions[i] = a
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transaction thất bại: %w", err)
	}

	s.PublishKafkaEvent("CREATED_BATCH", insertedActions)
	if s.log != nil {
		s.log.Info("Batch insert ERPPermResourceActions thành công", zap.Int("count", len(insertedActions)))
	}

	return insertedActions, nil
}
