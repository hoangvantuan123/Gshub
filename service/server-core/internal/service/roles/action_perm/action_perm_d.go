package action_perm

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"
)

// ActionGroupPermsD xóa quyền hạn action theo danh sách Id
func (s *ActionLevelPermsService) ActionGroupPermsD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "ACTION_PERM"); err != nil {
		return nil, err
	}

	for _, id := range ids {
		var count int
		err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM "_ERPGroupActionPermsItems" WHERE "GroupSeq" = $1`, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check constraints for ID %v: %w", id, err)
		}
		if count > 0 {
			return nil, constants.NewError(constants.CodeDeleteConflict, constants.MsgDeleteConflictActionPerms, count)
		}
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPGroupActionPerms" WHERE "Idseq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete records: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	cache.GetCache().DeletePrefix(ctx, "action_group_perms_q:")
	s.publishKafkaEvent("ACTION_PERM_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
