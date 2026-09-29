package role_group

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"
)

// RoleGroupA tạo mới nhóm quyền
func (s *RoleGroupService) RoleGroupA(ctx context.Context, groups []domain.ERPGroups) ([]domain.ERPGroups, error) {
	if len(groups) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if err := config.ValidateBatchLimit(len(groups), "thêm mới", "ROLE_GROUP"); err != nil {
		return nil, err
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY ──
	nameTracker := make(map[string]int, len(groups))
	var errorDetails []domain.RowErrorDetail

	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}
		if g.Name == nil || strings.TrimSpace(*g.Name) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Name",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên nhóm quyền không được để trống", rowNum),
			})
			continue
		}

		nameClean := strings.ToLower(strings.TrimSpace(*g.Name))
		if firstRow, exists := nameTracker[nameClean]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Name",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: Tên nhóm '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, *g.Name, firstRow),
			})
			continue
		}
		nameTracker[nameClean] = rowNum
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d dòng dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `WITH inserted AS (
		INSERT INTO "_ERPGroups" ("Name", "Comment", "IdxNo", "RowVersion", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt") 
		VALUES (:Name, :Comment, :IdxNo, 1, :CreatedBy, NOW(), :CreatedBy, NOW()) 
		RETURNING *
	)
	SELECT 
		g."Id", g."Name", g."Comment", g."IdxNo", 
		COALESCE(CAST(NULLIF(CAST(g."RowVersion" AS VARCHAR), '') AS BIGINT), 1) AS "RowVersion",
		g."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		g."CreatedAt",
		g."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		g."UpdatedAt"
	FROM inserted g
	LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	newGroups := make([]domain.ERPGroups, 0, len(groups))
	for _, g := range groups {
		var newGroup domain.ERPGroups
		err = stmt.GetContext(ctx, &newGroup, g)
		if err != nil {
			return nil, fmt.Errorf("failed to insert group: %w", err)
		}
		newGroups = append(newGroups, newGroup)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "role_group_q:")
	s.publishKafkaEvent("ROLE_GROUP_CREATED", newGroups)

	return newGroups, nil
}
