package action_perm

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"
)

// ActionGroupPermsU cập nhật quyền hạn action
func (s *ActionLevelPermsService) ActionGroupPermsU(ctx context.Context, records []domain.ERPGroupActionPerms) ([]domain.ERPGroupActionPerms, error) {
	if len(records) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsUpdate)
	}
	if err := config.ValidateBatchLimit(len(records), "cập nhật", "ACTION_PERM"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPGroupActionPerms" SET 
				"Name" = :Name, 
				"ScreenName" = :ScreenName, 
				"Comment" = :Comment, 
				"UpdatedBy" = :UpdatedBy, 
				"UpdatedAt" = NOW() 
			  WHERE "Idseq" = :Idseq
			  RETURNING *`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare update statement: %w", err)
	}
	defer stmt.Close()

	updatedRecords := make([]domain.ERPGroupActionPerms, 0, len(records))
	for _, r := range records {
		if r.Idseq == "" {
			return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, r.Idseq)
		}

		var updatedRecord domain.ERPGroupActionPerms
		err = stmt.GetContext(ctx, &updatedRecord, r)
		if err != nil {
			return nil, fmt.Errorf("failed to update record ID %v: %w", r.Idseq, err)
		}
		updatedRecords = append(updatedRecords, updatedRecord)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit update transaction: %w", err)
	}

	cache.GetCache().DeletePrefix(ctx, "action_group_perms_q:")
	s.publishKafkaEvent("ACTION_PERM_UPDATED", updatedRecords)

	return updatedRecords, nil
}
