package role_perm

import (
	"context"
	"encoding/json"
	"strings"

	"go.uber.org/zap"
)

// Lưu và cập nhật phân quyền Menu cho nhóm vai trò (U - Upsert)
func (s *RolePermService) SaveMenuRoles(ctx context.Context, groupId string, permissions []MenuRoleAssignment, updatedBy string) error {
	if groupId == "" || len(permissions) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	delStmt, err := tx.PrepareContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "GroupId"::text = $1 AND "MenuId"::text = $2 AND ("Type" = 'menu' OR "Type" IS NULL)
	`)
	if err != nil {
		return err
	}
	defer delStmt.Close()

	insStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRolesUsers" (
			"GroupId", "MenuId", "RootMenuId", "Type", "Name",
			"View",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1::bigint, $2::bigint, NULLIF($3, '')::bigint, 'menu', '',
			$4,
			$5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP, 1
		)
	`)
	if err != nil {
		return err
	}
	defer insStmt.Close()

	for _, p := range permissions {
		menuId := strings.TrimSpace(p.MenuId)
		if menuId == "" {
			menuId = strings.TrimSpace(p.Id)
		}
		if menuId == "" {
			continue
		}

		canView := p.View

		_, _ = delStmt.ExecContext(ctx, groupId, menuId)
		_, err := insStmt.ExecContext(ctx,
			groupId,
			menuId,
			p.RootMenuId,
			canView,
			updatedBy,
		)
		if err != nil {
			s.logger.Error("SaveMenuRoles exec error", zap.Error(err))
			return err
		}
	}

	// Ghi nhận Audit Log lịch sử phân quyền
	payloadJSON, _ := json.Marshal(permissions)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO "_ERPRolePermLogs" ("GroupId", "TargetType", "ActionType", "Details", "ChangedBy", "CreatedAt")
		VALUES ($1::bigint, 'MENU', 'SAVE_MENU', $2, $3, CURRENT_TIMESTAMP)
	`, groupId, string(payloadJSON), updatedBy)

	return tx.Commit()
}

// Lưu và cập nhật phân quyền Action / Nút Lệnh cho nhóm vai trò và Menu (U - Upsert)
func (s *RolePermService) SaveActionRoles(ctx context.Context, groupId string, menuId string, actions []ActionRoleAssignment, updatedBy string) error {
	if groupId == "" || menuId == "" {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	delStmt, err := tx.PrepareContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "GroupId"::text = $1 AND "MenuId"::text = $2 AND "Type" = 'action'
	`)
	if err != nil {
		return err
	}
	defer delStmt.Close()

	if _, err := delStmt.ExecContext(ctx, groupId, menuId); err != nil {
		return err
	}

	insStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRolesUsers" (
			"GroupId", "MenuId", "Type", "Name",
			"View",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1::bigint, $2::bigint, 'action', $3,
			$4,
			$5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP, 1
		)
	`)
	if err != nil {
		return err
	}
	defer insStmt.Close()

	for _, a := range actions {
		actionKey := a.ActionKey
		if actionKey == "" {
			actionKey = a.Key
		}
		if actionKey == "" {
			continue
		}
		allow := a.Allow
		if _, err := insStmt.ExecContext(ctx, groupId, menuId, actionKey, allow, updatedBy); err != nil {
			s.logger.Error("SaveActionRoles exec error", zap.Error(err))
			return err
		}
	}

	// Ghi nhận Audit Log lịch sử phân quyền Action
	payloadJSON, _ := json.Marshal(actions)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO "_ERPRolePermLogs" ("GroupId", "MenuId", "TargetType", "ActionType", "Details", "ChangedBy", "CreatedAt")
		VALUES ($1::bigint, $2::bigint, 'ACTION', 'SAVE_ACTION', $3, $4, CURRENT_TIMESTAMP)
	`, groupId, menuId, string(payloadJSON), updatedBy)

	return tx.Commit()
}

// Lưu và cập nhật phân quyền Root Menu cho nhóm vai trò (U - Upsert)
func (s *RolePermService) SaveRootMenuRoles(ctx context.Context, groupId string, rootMenus []RootMenuRoleAssignment, updatedBy string) error {
	if groupId == "" || len(rootMenus) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	delStmt, err := tx.PrepareContext(ctx, `
		DELETE FROM "_ERPRolesUsers"
		WHERE "GroupId"::text = $1 AND "RootMenuId"::text = $2 AND "Type" = 'rootmenu'
	`)
	if err != nil {
		return err
	}
	defer delStmt.Close()

	insStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRolesUsers" (
			"GroupId", "RootMenuId", "Type", "Name",
			"View",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1::bigint, $2::bigint, 'rootmenu', '',
			$3,
			$4, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP, 1
		)
	`)
	if err != nil {
		return err
	}
	defer insStmt.Close()

	for _, rm := range rootMenus {
		rmId := strings.TrimSpace(rm.RootMenuId)
		if rmId == "" {
			rmId = strings.TrimSpace(rm.Id)
		}
		if rmId == "" {
			continue
		}
		canView := rm.View

		_, _ = delStmt.ExecContext(ctx, groupId, rmId)
		if _, err := insStmt.ExecContext(ctx, groupId, rmId, canView, updatedBy); err != nil {
			s.logger.Error("SaveRootMenuRoles exec error", zap.Error(err))
			return err
		}
	}

	// Ghi nhận Audit Log lịch sử phân quyền RootMenu
	payloadJSON, _ := json.Marshal(rootMenus)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO "_ERPRolePermLogs" ("GroupId", "TargetType", "ActionType", "Details", "ChangedBy", "CreatedAt")
		VALUES ($1::bigint, 'ROOTMENU', 'SAVE_ROOTMENU', $2, $3, CURRENT_TIMESTAMP)
	`, groupId, string(payloadJSON), updatedBy)

	return tx.Commit()
}


