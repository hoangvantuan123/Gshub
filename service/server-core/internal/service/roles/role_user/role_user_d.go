package role_user

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// RoleUsersD xóa phân quyền User / Menu / RootMenu theo danh sách Id hoặc UserCode
func (s *RoleUsersService) RoleUsersD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "ROLE_USER"); err != nil {
		return nil, err
	}

	var numericIds []int64
	var userCodes []string

	for _, idStr := range ids {
		trimmed := strings.TrimSpace(idStr)
		if trimmed == "" {
			continue
		}
		if num, err := strconv.ParseInt(trimmed, 10, 64); err == nil {
			numericIds = append(numericIds, num)
		} else {
			userCodes = append(userCodes, trimmed)
		}
	}

	var totalDeleted int64 = 0

	if len(numericIds) > 0 {
		res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPRolesUsers" WHERE "Id" = ANY($1)`, pq.Array(numericIds))
		if err != nil {
			return nil, fmt.Errorf("failed to delete role users by id: %w", err)
		}
		affected, _ := res.RowsAffected()
		totalDeleted += affected
	}

	if len(userCodes) > 0 {
		res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPRolesUsers" WHERE "Type" = 'user' AND ("UserId" = ANY($1) OR "UserSeq" = ANY($1))`, pq.Array(userCodes))
		if err != nil {
			return nil, fmt.Errorf("failed to delete role users by code: %w", err)
		}
		affected, _ := res.RowsAffected()
		totalDeleted += affected
	}

	cache.GetCache().DeletePrefix(ctx, "role_users_q:")
	s.publishKafkaEvent("ROLE_USER_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, totalDeleted),
		"DeletedCount": totalDeleted,
		"DeletedIds":   ids,
	}, nil
}
