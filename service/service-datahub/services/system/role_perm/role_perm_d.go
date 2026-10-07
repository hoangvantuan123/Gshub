package role_perm

import (
	"context"
	"encoding/json"
	"strings"
)

// Xóa người dùng khỏi vai trò (D - Delete)
func (s *RolePermService) RemoveUsersFromRole(ctx context.Context, groupId string, userIds []string) error {
	if groupId == "" || len(userIds) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "GroupId"::text = $1 AND "UserId" = $2 AND "Type" = 'user'
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, uid := range userIds {
		clean := strings.TrimSpace(uid)
		if clean == "" {
			continue
		}
		_, _ = stmt.ExecContext(ctx, groupId, clean)
	}

	// Ghi nhận Audit Log gỡ người dùng khỏi nhóm
	payloadJSON, _ := json.Marshal(userIds)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO "_ERPRolePermLogs" ("GroupId", "TargetType", "ActionType", "Details", "ChangedBy", "CreatedAt")
		VALUES ($1::bigint, 'USER_ASSIGNMENT', 'REMOVE_USER', $2, 'SYSTEM', CURRENT_TIMESTAMP)
	`, groupId, string(payloadJSON))

	return tx.Commit()
}
