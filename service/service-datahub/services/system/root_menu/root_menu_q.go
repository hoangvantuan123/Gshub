package root_menu

import (
	"context"

	"go.uber.org/zap"
)

func (s *RootMenuService) QueryRootMenus(ctx context.Context) ([]RootMenuItem, error) {
	query := `
		SELECT 
			COALESCE("Id"::text, ''),
			COALESCE("Key", ''),
			COALESCE("Label", ''),
			COALESCE("Link", ''),
			COALESCE("Icon", 'Settings'),
			COALESCE("IdxNo", 1),
			COALESCE("Utilities", true),
			COALESCE("CreatedBy", ''),
			COALESCE(TO_CHAR("CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("UpdatedBy", ''),
			COALESCE(TO_CHAR("UpdatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("RowVersion", 1)
		FROM "_ERPRootMenus"
		ORDER BY "IdxNo" ASC, "Id" ASC
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		s.logger.Error("QueryRootMenus error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []RootMenuItem
	for rows.Next() {
		var item RootMenuItem
		var rv int64
		if err := rows.Scan(
			&item.Id,
			&item.RootMenuKey,
			&item.RootMenuLabel,
			&item.Link,
			&item.Icon,
			&item.OrderSeq,
			&item.View,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedBy,
			&item.UpdatedAt,
			&rv,
		); err != nil {
			continue
		}
		item.RootMenuId = item.Id
		item.Key = item.RootMenuKey
		item.Label = item.RootMenuLabel
		item.Name = item.RootMenuLabel
		item.RootMenuName = item.RootMenuLabel
		item.IdxNo = item.OrderSeq
		item.Utilities = item.View
		item.CreatedByName = item.CreatedBy
		item.UpdatedByName = item.UpdatedBy
		item.Rowversion = rv
		item.RowVersion = rv
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryRootMenus rows iteration error", zap.Error(err))
		return nil, err
	}

	return list, nil
}
