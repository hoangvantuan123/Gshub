package role_group

import (
	"context"
	"strings"
)

func (s *RoleGroupService) DeleteRoleGroups(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	for _, id := range ids {
		clean := strings.TrimSpace(id)
		if clean == "" {
			continue
		}
		_, _ = s.db.ExecContext(ctx, `DELETE FROM "_ERPGroups" WHERE "Id"::text = $1`, clean)
	}
	return nil
}
