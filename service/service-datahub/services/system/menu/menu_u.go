package menu

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *MenuService) UpdateMenus(ctx context.Context, items []MenuItem) ([]MenuItem, error) {
	if len(items) == 0 {
		return []MenuItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		UPDATE "_ERPMenus" SET
			"Key" = COALESCE(NULLIF($1, ''), "Key"),
			"MenuSubRootId" = NULLIF($2, '')::bigint,
			"MenuRootId" = NULLIF($3, '')::bigint,
			"Label" = COALESCE(NULLIF($4, ''), "Label"),
			"Link" = $5,
			"Type" = COALESCE(NULLIF($6, ''), "Type"),
			"Icon" = COALESCE(NULLIF($7, ''), "Icon"),
			"OrderSeq" = $8,
			"View" = $9,
			"Create" = $10,
			"Edit" = $11,
			"Delete" = $12,
			"Import" = $13,
			"Export" = $14,
			"UpdatedBy" = $15,
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = COALESCE("RowVersion", 0) + 1
		WHERE "Id"::text = $16 AND ("RowVersion" = $17 OR $17 = 0 OR "RowVersion" IS NULL)
		RETURNING "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var updated []MenuItem
	for _, m := range items {
		if strings.TrimSpace(m.Id) == "" {
			continue
		}

		key := strings.TrimSpace(m.MenuKey)
		if key == "" {
			key = strings.TrimSpace(m.Key)
		}
		label := strings.TrimSpace(m.MenuLabel)
		if label == "" {
			label = strings.TrimSpace(m.Label)
		}
		link := m.MenuLink
		if link == "" {
			link = m.Link
		}
		mType := m.MenuType
		if mType == "" {
			mType = m.Type
		}
		icon := m.MenuIcon
		if icon == "" {
			icon = m.Icon
		}

		expectedRv := m.Rowversion
		if expectedRv == 0 {
			expectedRv = m.RowVersion
		}

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
			m.Create,
			m.Edit,
			m.Delete,
			m.Import,
			m.Export,
			m.UpdatedBy,
			m.Id,
			expectedRv,
		).Scan(&newRv)

		if err != nil {
			s.logger.Warn("UpdateMenus concurrency conflict or not found",
				zap.String("id", m.Id),
				zap.Int64("expectedRowversion", expectedRv),
				zap.Error(err),
			)
			return nil, fmt.Errorf("Dữ liệu Menu ID '%s' đã bị thay đổi bởi người dùng khác hoặc không tồn tại (RowVersion mismatch)", m.Id)
		}

		m.Rowversion = newRv
		m.RowVersion = newRv
		updated = append(updated, m)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return updated, nil
}
