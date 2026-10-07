package role_perm

import (
	"context"
	"encoding/json"
	"strings"
)

// Gán và đồng bộ danh sách người dùng vào nhóm vai trò (A - Sync Members)
func (s *RolePermService) AssignUsersToRole(ctx context.Context, groupId string, userIds []string, createdBy string) error {
	if groupId == "" {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Xóa toàn bộ thành viên cũ trong Group này để đồng bộ chính xác
	_, err = tx.ExecContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "GroupId"::text = $1 AND "Type" = 'user'
	`, groupId)
	if err != nil {
		return err
	}

	// 2. Thêm lại danh sách thành viên mới (nếu có)
	if len(userIds) > 0 {
		insStmt, err := tx.PrepareContext(ctx, `
			INSERT INTO "_ERPRolesUsers" (
				"GroupId", "UserId", "Type", "Name",
				"View", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
			)
			SELECT 
				$1::bigint, COALESCE(u."UserId", $2), 'user', '',
				true, $3, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP, 1
			FROM (SELECT $2::text AS in_uid) param
			LEFT JOIN "_ERPUsers" u ON LOWER(u."UserId") = LOWER(param.in_uid) OR u."UserSeq" = param.in_uid
			LIMIT 1
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
			_, _ = insStmt.ExecContext(ctx, groupId, clean, createdBy)
		}
	}

	// Ghi nhận Audit Log gán người dùng vào nhóm
	payloadJSON, _ := json.Marshal(userIds)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO "_ERPRolePermLogs" ("GroupId", "TargetType", "ActionType", "Details", "ChangedBy", "CreatedAt")
		VALUES ($1::bigint, 'USER_ASSIGNMENT', 'ASSIGN_USER', $2, $3, CURRENT_TIMESTAMP)
	`, groupId, string(payloadJSON), createdBy)

	return tx.Commit()
}
