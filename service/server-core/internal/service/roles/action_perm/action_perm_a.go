package action_perm

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"
)

// ActionGroupPermsA thêm mới quyền hạn action
func (s *ActionLevelPermsService) ActionGroupPermsA(ctx context.Context, records []domain.ERPGroupActionPerms) ([]domain.ERPGroupActionPerms, error) {
	if len(records) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
	}
	if err := config.ValidateBatchLimit(len(records), "thêm mới", "ACTION_PERM"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPGroupActionPerms" ("Name", "ScreenName", "Comment", "CreatedBy", "CreatedAt") 
	          VALUES (:Name, :ScreenName, :Comment, :CreatedBy, NOW()) 
	          RETURNING *`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	newRecords := make([]domain.ERPGroupActionPerms, 0, len(records))
	for _, r := range records {
		var newRecord domain.ERPGroupActionPerms
		err = stmt.GetContext(ctx, &newRecord, r)
		if err != nil {
			return nil, fmt.Errorf("failed to insert record %v: %w", r.Name, err)
		}
		newRecords = append(newRecords, newRecord)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	cache.GetCache().DeletePrefix(ctx, "action_group_perms_q:")
	s.publishKafkaEvent("ACTION_PERM_CREATED", newRecords)

	return newRecords, nil
}
