package root_menu

import (
	"context"
	"strings"
)

func (s *RootMenuService) DeleteRootMenus(ctx context.Context, ids []string) error {
	for _, id := range ids {
		clean := strings.TrimSpace(id)
		if clean == "" {
			continue
		}
		_, _ = s.db.ExecContext(ctx, `DELETE FROM "_ERPRootMenus" WHERE "Id"::text = $1 OR "Key" = $1`, clean)
	}
	return nil
}
