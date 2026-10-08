package role_user

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"
)

// RoleUsersD xóa phân quyền User / Menu / RootMenu theo danh sách Id
func (s *RoleUsersService) RoleUsersD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "ROLE_USER"); err != nil {
		return nil, err
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPRolesUsers" WHERE "Id" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete role users: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	cache.GetCache().DeletePrefix(ctx, "role_users_q:")
	s.publishKafkaEvent("ROLE_USER_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
