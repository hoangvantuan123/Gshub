package menu

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *MenuService) QueryMenus(ctx context.Context, rootId string, menuType string) ([]MenuItem, error) {
	where := "1=1"
	var args []interface{}
	idx := 1

	if strings.TrimSpace(rootId) != "" {
		where += fmt.Sprintf(` AND "MenuRootId"::text = $%d`, idx)
		args = append(args, rootId)
		idx++
	}
	if strings.TrimSpace(menuType) != "" {
		where += fmt.Sprintf(` AND "Type" = $%d`, idx)
		args = append(args, menuType)
		idx++
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE(m."Id"::text, ''),
			COALESCE(m."Key", ''),
			COALESCE(m."MenuSubRootId"::text, ''),
			COALESCE(m."MenuRootId"::text, ''),
			COALESCE(m."Label", ''),
			COALESCE(m."Link", ''),
			COALESCE(m."Type", 'menu'),
			COALESCE(m."Icon", 'FileText'),
			COALESCE(m."OrderSeq", 1),
			COALESCE(m."View", true),
			COALESCE(m."Create", true),
			COALESCE(m."Edit", true),
			COALESCE(m."Delete", true),
			COALESCE(m."Import", true),
			COALESCE(m."Export", true),
			COALESCE(m."CreatedBy", ''),
			COALESCE(TO_CHAR(m."CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE(m."UpdatedBy", ''),
			COALESCE(TO_CHAR(m."UpdatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE(m."RowVersion", 1),
			COALESCE(rm."Label", ''),
			COALESCE(sm."Label", '')
		FROM "_ERPMenus" m
		LEFT JOIN "_ERPRootMenus" rm ON m."MenuRootId" = rm."Id"
		LEFT JOIN "_ERPMenus" sm ON m."MenuSubRootId" = sm."Id"
		WHERE %s
		ORDER BY m."MenuRootId" ASC, COALESCE(m."MenuSubRootId", 0) ASC, m."OrderSeq" ASC, m."Id" ASC
	`, where)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.logger.Error("QueryMenus error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []MenuItem
	for rows.Next() {
		var m MenuItem
		var rv int64
		var rootName, subName string
		if err := rows.Scan(
			&m.Id,
			&m.MenuKey,
			&m.MenuSubRootId,
			&m.MenuRootId,
			&m.MenuLabel,
			&m.MenuLink,
			&m.MenuType,
			&m.MenuIcon,
			&m.OrderSeq,
			&m.View,
			&m.Create,
			&m.Edit,
			&m.Delete,
			&m.Import,
			&m.Export,
			&m.CreatedBy,
			&m.CreatedAt,
			&m.UpdatedBy,
			&m.UpdatedAt,
			&rv,
			&rootName,
			&subName,
		); err != nil {
			continue
		}
		m.Key = m.MenuKey
		m.Label = m.MenuLabel
		m.Link = m.MenuLink
		m.Type = m.MenuType
		m.Icon = m.MenuIcon
		m.CreatedByName = m.CreatedBy
		m.UpdatedByName = m.UpdatedBy
		m.Rowversion = rv
		m.RowVersion = rv
		m.MenuRootName = rootName
		m.RootMenuName = rootName
		m.MenuSubRootName = subName
		m.SubMenuName = subName
		list = append(list, m)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryMenus rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}
