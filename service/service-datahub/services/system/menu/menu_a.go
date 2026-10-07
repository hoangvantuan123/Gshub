package menu

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *MenuService) AddMenus(ctx context.Context, items []MenuItem) ([]MenuItem, error) {
	if len(items) == 0 {
		return []MenuItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPMenus" (
			"Key", "MenuSubRootId", "MenuRootId", "Label", "Link", "Type", "Icon",
			"OrderSeq", "View",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1, NULLIF($2, '')::bigint, NULLIF($3, '')::bigint, $4, $5, $6, $7,
			$8, $9,
			$10, CURRENT_TIMESTAMP, $11, CURRENT_TIMESTAMP, 1
		)
		RETURNING "Id", "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var inserted []MenuItem
	for _, m := range items {
		key := strings.TrimSpace(m.MenuKey)
		if key == "" {
			key = strings.TrimSpace(m.Key)
		}
		label := strings.TrimSpace(m.MenuLabel)
		if label == "" {
			label = strings.TrimSpace(m.Label)
		}
		if key == "" || label == "" {
			continue
		}

		link := m.MenuLink
		if link == "" {
			link = m.Link
		}
		mType := m.MenuType
		if mType == "" {
			mType = m.Type
		}
		if mType == "" {
			mType = "menu"
		}
		icon := m.MenuIcon
		if icon == "" {
			icon = m.Icon
		}
		if icon == "" {
			icon = "FileText"
		}

		var newId int64
		var newRv int64
		err := stmt.QueryRowContext(ctx,
			key,
			m.MenuSubRootId,
			m.MenuRootId,
			label,
			link,
			mType,
			icon,
			m.OrderSeq,
			m.View,
			m.CreatedBy,
			m.UpdatedBy,
		).Scan(&newId, &newRv)


		if err != nil {
			s.logger.Error("AddMenus insert error", zap.Error(err))
			return nil, err
		}

		m.Id = fmt.Sprintf("%d", newId)
		m.Key = key
		m.MenuKey = key
		m.Label = label
		m.MenuLabel = label
		m.Rowversion = newRv
		m.RowVersion = newRv
		inserted = append(inserted, m)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return inserted, nil
}
