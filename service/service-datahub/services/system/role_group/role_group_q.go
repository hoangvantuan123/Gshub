package role_group

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *RoleGroupService) QueryRoleGroups(ctx context.Context, keyword string) ([]RoleGroupItem, error) {
	where := "1=1"
	var args []interface{}
	if strings.TrimSpace(keyword) != "" {
		where += " AND (\"Name\" ILIKE $1 OR \"Comment\" ILIKE $1)"
		args = append(args, "%"+strings.TrimSpace(keyword)+"%")
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE("Id"::text, ''),
			COALESCE("Name", ''),
			COALESCE("Comment", ''),
			COALESCE("CreatedBy", ''),
			COALESCE("IdxNo", 1),
			'ACTIVE',
			COALESCE("CreatedBy", ''),
			COALESCE(TO_CHAR("CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("UpdatedBy", ''),
			COALESCE(TO_CHAR("UpdatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("RowVersion", 1)
		FROM "_ERPGroups"
		WHERE %s
		ORDER BY "IdxNo" ASC, "Id" ASC
	`, where)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.logger.Error("QueryRoleGroups error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []RoleGroupItem
	for rows.Next() {
		var item RoleGroupItem
		var rv int64
		if err := rows.Scan(
			&item.Id,
			&item.Name,
			&item.Comment,
			&item.CreatedByName,
			&item.IdxNo,
			&item.Status,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedBy,
			&item.UpdatedAt,
			&rv,
		); err != nil {
			continue
		}
		item.Rowversion = rv
		item.RowVersion = rv
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryRoleGroups rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}
