package root_menu

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *RootMenuService) AddRootMenus(ctx context.Context, items []RootMenuItem) ([]RootMenuItem, error) {
	if len(items) == 0 {
		return []RootMenuItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPRootMenus" ("Key", "Label", "Link", "Icon", "IdxNo", "Utilities", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion")
		VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP, 1)
		RETURNING "Id", "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var inserted []RootMenuItem
	for _, item := range items {
		key := strings.TrimSpace(item.RootMenuKey)
		if key == "" {
			key = strings.TrimSpace(item.Key)
		}
		label := strings.TrimSpace(item.RootMenuLabel)
		if label == "" {
			label = strings.TrimSpace(item.Label)
		}
		if label == "" {
			label = strings.TrimSpace(item.RootMenuName)
		}
		if label == "" {
			label = strings.TrimSpace(item.Name)
		}
		if key == "" || label == "" {
			continue
		}

		icon := item.Icon
		if icon == "" {
			icon = "AppWindow"
		}
		link := item.Link
		isUtilities := item.Utilities || item.View
		orderSeq := item.OrderSeq
		if orderSeq == 0 {
			orderSeq = item.IdxNo
		}
		if orderSeq == 0 {
			orderSeq = 1
		}

		var newId int64
		var newRv int64
		err := stmt.QueryRowContext(ctx, key, label, link, icon, orderSeq, isUtilities, item.CreatedBy, item.UpdatedBy).Scan(&newId, &newRv)
		if err != nil {
			s.logger.Error("AddRootMenus insert error", zap.Error(err))
			return nil, err
		}
		item.Id = fmt.Sprintf("%d", newId)
		item.RootMenuId = item.Id
		item.Key = key
		item.Label = label
		item.Rowversion = newRv
		item.RowVersion = newRv
		inserted = append(inserted, item)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return inserted, nil
}
