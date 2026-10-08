package role_group

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"
)

// RoleGroupD xóa nhóm quyền theo danh sách Id
func (s *RoleGroupService) RoleGroupD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "ROLE_GROUP"); err != nil {
		return nil, err
	}

	for _, id := range ids {
		var count int
		err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM "_ERPRolesUsers" WHERE "GroupId" = $1`, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check constraint for ID %v: %w", id, err)
		}
		if count > 0 {
			return nil, constants.NewError(constants.CodeDeleteConflict, constants.MsgDeleteConflictGroups, count)
		}
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPGroups" WHERE "Id" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete groups: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	cache.GetCache().DeletePrefix(ctx, "role_group_q:")
	s.publishKafkaEvent("ROLE_GROUP_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
