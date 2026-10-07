package menu

import (
	"context"
	"strings"
)

func (s *MenuService) DeleteMenus(ctx context.Context, ids []string) error {
	for _, id := range ids {
		clean := strings.TrimSpace(id)
		if clean == "" {
			continue
		}
		_, _ = s.db.ExecContext(ctx, `DELETE FROM "_ERPMenus" WHERE "Id"::text = $1 OR "Key" = $1`, clean)
	}
	return nil
}
