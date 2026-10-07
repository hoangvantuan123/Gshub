package role_perm

import (
	"context"
	"strings"

	"go.uber.org/zap"
)

// 1. Lấy danh sách người dùng trong nhóm vai trò (Q - Query Users In Role)
func (s *RolePermService) QueryUsersInRole(ctx context.Context, groupId string) ([]UserRoleAssignment, error) {
	query := `
		SELECT 
			COALESCE(ru."Id"::text, ''),
			COALESCE(u."UserId", ru."UserId", ''),
			COALESCE(u."UserName", u."EmpName", ru."UserId", ''),
			COALESCE(g."Id"::text, ''),
			COALESCE(g."Name", ''),
			COALESCE(TO_CHAR(ru."CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), '')
		FROM "_ERPRolesUsers" ru
		LEFT JOIN "_ERPGroups" g ON ru."GroupId" = g."Id"
		LEFT JOIN "_ERPUsers" u ON LOWER(ru."UserId") = LOWER(u."UserId")
		WHERE ru."GroupId"::text = $1 AND ru."UserId" IS NOT NULL AND ru."UserId" != ''
		ORDER BY ru."Id" ASC
	`
	rows, err := s.db.QueryContext(ctx, query, groupId)
	if err != nil {
		s.logger.Error("QueryUsersInRole error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []UserRoleAssignment
	for rows.Next() {
		var item UserRoleAssignment
		if err := rows.Scan(&item.Id, &item.UserId, &item.UserName, &item.GroupId, &item.GroupName, &item.CreatedAt); err != nil {
			continue
		}
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryUsersInRole rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}

// 2. Lấy danh sách Root Menus theo nhóm vai trò (Q - Query Root Menu Roles)
func (s *RolePermService) QueryRootMenuRoles(ctx context.Context, groupId string) ([]RootMenuRoleAssignment, error) {
	query := `
		SELECT 
			COALESCE(rm."Id"::text, ''),
			$1::text,
			COALESCE(rm."Id"::text, ''),
			COALESCE(rm."Key", ''),
			COALESCE(rm."Label", ''),
			COALESCE(rm."Icon", 'AppWindow'),
			COALESCE(rm."IdxNo", 1),
			COALESCE(ru."View", rm."View", true),
			COALESCE(ru."RowVersion", rm."RowVersion", 1)
		FROM "_ERPRootMenus" rm
		LEFT JOIN (
			SELECT DISTINCT ON ("RootMenuId") "RootMenuId", "View", "RowVersion"
			FROM "_ERPRolesUsers"
			WHERE "GroupId"::text = $1 AND "Type" = 'rootmenu'
			ORDER BY "RootMenuId", "Id" DESC
		) ru ON ru."RootMenuId" = rm."Id"
		ORDER BY rm."IdxNo" ASC, rm."Id" ASC
	`
	rows, err := s.db.QueryContext(ctx, query, groupId)
	if err != nil {
		s.logger.Error("QueryRootMenuRoles error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []RootMenuRoleAssignment
	for rows.Next() {
		var item RootMenuRoleAssignment
		var rv int64
		if err := rows.Scan(
			&item.Id,
			&item.GroupId,
			&item.RootMenuId,
			&item.Key,
			&item.Label,
			&item.Icon,
			&item.OrderSeq,
			&item.View,
			&rv,
		); err != nil {
			continue
		}
		item.RootMenuKey = item.Key
		item.RootMenuName = item.Label
		item.CanView = item.View
		item.Rowversion = rv
		item.RowVersion = rv
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryRootMenuRoles rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}

// 3. Lấy ma trận quyền Menu theo nhóm vai trò (Q - Query Menu Roles)
func (s *RolePermService) QueryMenuRoles(ctx context.Context, groupId string, rootMenuId string) ([]MenuRoleAssignment, error) {
	query := `
		SELECT 
			COALESCE(m."Id"::text, ''),
			$1::text,
			COALESCE(m."MenuRootId"::text, ''),
			COALESCE(m."Id"::text, ''),
			COALESCE(m."MenuSubRootId", 0),
			COALESCE(m."Key", ''),
			COALESCE(m."Label", ''),
			COALESCE(m."Type", 'menu'),
			COALESCE(m."OrderSeq", 1),
			COALESCE(ru."View", m."View", true),
			COALESCE(ru."Create", m."Create", true),
			COALESCE(ru."Edit", m."Edit", true),
			COALESCE(ru."Delete", m."Delete", true),
			COALESCE(ru."Import", m."Import", true),
			COALESCE(ru."Export", m."Export", true),
			COALESCE(ru."RowVersion", m."RowVersion", 1)
		FROM "_ERPMenus" m
		LEFT JOIN (
			SELECT DISTINCT ON ("MenuId") "MenuId", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
			FROM "_ERPRolesUsers"
			WHERE "GroupId"::text = $1
			ORDER BY "MenuId", "Id" DESC
		) ru ON ru."MenuId" = m."Id"
		WHERE ($2 = '' OR m."MenuRootId"::text = $2)
		ORDER BY m."MenuRootId" ASC, COALESCE(m."MenuSubRootId", 0) ASC, m."OrderSeq" ASC, m."Id" ASC
	`

	rows, err := s.db.QueryContext(ctx, query, groupId, strings.TrimSpace(rootMenuId))
	if err != nil {
		s.logger.Error("QueryMenuRoles error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []MenuRoleAssignment
	for rows.Next() {
		var item MenuRoleAssignment
		var rv int64
		if err := rows.Scan(
			&item.Id,
			&item.GroupId,
			&item.RootMenuId,
			&item.MenuId,
			&item.MenuSubRootId,
			&item.MenuKey,
			&item.MenuLabel,
			&item.MenuType,
			&item.OrderSeq,
			&item.CanView,
			&item.CanCreate,
			&item.CanEdit,
			&item.CanDelete,
			&item.CanImport,
			&item.CanExport,
			&rv,
		); err != nil {
			continue
		}
		item.ParentId = item.MenuSubRootId
		item.Key = item.MenuKey
		item.Label = item.MenuLabel
		item.Type = item.MenuType
		item.View = item.CanView
		item.Create = item.CanCreate
		item.Edit = item.CanEdit
		item.Delete = item.CanDelete
		item.Import = item.CanImport
		item.Export = item.CanExport
		item.CanPrint = item.CanExport
		item.DataScope = "ALL"
		item.Rowversion = rv
		item.RowVersion = rv
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryMenuRoles rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}
