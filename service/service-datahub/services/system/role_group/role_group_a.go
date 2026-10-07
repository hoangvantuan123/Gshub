package role_group

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *RoleGroupService) AddRoleGroups(ctx context.Context, groups []RoleGroupItem) ([]RoleGroupItem, error) {
	if len(groups) == 0 {
		return []RoleGroupItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPGroups" ("Name", "Comment", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion")
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP, 1)
		RETURNING "Id", "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var inserted []RoleGroupItem
	for _, g := range groups {
		if strings.TrimSpace(g.Name) == "" {
			continue
		}
		var newId int64
		var newRv int64
		err := stmt.QueryRowContext(ctx, g.Name, g.Comment, g.IdxNo, g.CreatedBy, g.UpdatedBy).Scan(&newId, &newRv)
		if err != nil {
			s.logger.Error("AddRoleGroups insert error", zap.Error(err))
			return nil, err
		}
		g.Id = fmt.Sprintf("%d", newId)
		g.Rowversion = newRv
		g.RowVersion = newRv
		inserted = append(inserted, g)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return inserted, nil
}
