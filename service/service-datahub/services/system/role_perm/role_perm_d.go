package role_perm

import (
	"context"
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
		WHERE "GroupId"::text = $1 AND "UserId" = $2
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

	return tx.Commit()
}
