package role_perm

import (
	"context"
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
		WHERE "GroupId"::text = $1 AND "MenuId"::text = $2
	`)
	if err != nil {
		return err
	}
	defer delStmt.Close()

	insStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRolesUsers" (
			"GroupId", "MenuId", "RootMenuId", "Type", "Name",
			"View", "Create", "Edit", "Delete", "Import", "Export",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1::bigint, $2::bigint, NULLIF($3, '')::bigint, 'menu', $4,
			$5, $6, $7, $8, $9, $10,
			$11, CURRENT_TIMESTAMP, $11, CURRENT_TIMESTAMP, 1
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
		label := p.MenuLabel
		if label == "" {
			label = p.Label
		}

		canView := p.CanView || p.View
		canCreate := p.CanCreate || p.Create
		canEdit := p.CanEdit || p.Edit
		canDelete := p.CanDelete || p.Delete
		canImport := p.CanImport || p.Import
		canExport := p.CanExport || p.Export

		_, _ = delStmt.ExecContext(ctx, groupId, menuId)
		_, err := insStmt.ExecContext(ctx,
			groupId,
			menuId,
			p.RootMenuId,
			label,
			canView,
			canCreate,
			canEdit,
			canDelete,
			canImport,
			canExport,
			updatedBy,
		)
		if err != nil {
			s.logger.Error("SaveMenuRoles exec error", zap.Error(err))
			return err
		}
	}

	return tx.Commit()
}
