package role_perm

import (
	"context"
	"strings"
)

// Gán người dùng vào vai trò (A - Insert)
func (s *RolePermService) AssignUsersToRole(ctx context.Context, groupId string, userIds []string, createdBy string) error {
	if groupId == "" || len(userIds) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	delStmt, err := tx.PrepareContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "Type" = 'user' AND LOWER("UserId") = LOWER($1)
	`)
	if err != nil {
		return err
	}
	defer delStmt.Close()

	insStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRolesUsers" ("GroupId", "UserId", "Type", "Name", "View", "Create", "Edit", "Delete", "CreatedBy", "CreatedAt")
		VALUES ($1::bigint, $2, 'user', $2, true, true, true, true, $3, CURRENT_TIMESTAMP)
	`)
	if err != nil {
		return err
	}
	defer insStmt.Close()

	for _, uid := range userIds {
		clean := strings.TrimSpace(uid)
		if clean == "" {
			continue
		}
		_, _ = delStmt.ExecContext(ctx, clean)
		_, _ = insStmt.ExecContext(ctx, groupId, clean, createdBy)
	}

	return tx.Commit()
}
