package role_group

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *RoleGroupService) UpdateRoleGroups(ctx context.Context, groups []RoleGroupItem) ([]RoleGroupItem, error) {
	if len(groups) == 0 {
		return []RoleGroupItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		UPDATE "_ERPGroups" SET
			"Name" = COALESCE(NULLIF($1, ''), "Name"),
			"Comment" = COALESCE(NULLIF($2, ''), "Comment"),
			"IdxNo" = $3,
			"UpdatedBy" = $4,
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = COALESCE("RowVersion", 0) + 1
		WHERE "Id"::text = $5 AND ("RowVersion" = $6 OR $6 = 0 OR "RowVersion" IS NULL)
		RETURNING "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var updated []RoleGroupItem
	for _, g := range groups {
		if strings.TrimSpace(g.Id) == "" {
			continue
		}
		expectedRv := g.Rowversion
		if expectedRv == 0 {
			expectedRv = g.RowVersion
		}

		var newRv int64
		err := stmt.QueryRowContext(ctx, g.Name, g.Comment, g.IdxNo, g.UpdatedBy, g.Id, expectedRv).Scan(&newRv)
		if err != nil {
			s.logger.Warn("UpdateRoleGroups concurrency conflict or record not found",
				zap.String("id", g.Id),
				zap.Int64("expectedRowversion", expectedRv),
				zap.Error(err),
			)
			return nil, fmt.Errorf("Dữ liệu nhóm vai trò ID '%s' đã bị thay đổi bởi người dùng khác hoặc không tồn tại (RowVersion mismatch)", g.Id)
		}
		g.Rowversion = newRv
		g.RowVersion = newRv
		updated = append(updated, g)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return updated, nil
}
