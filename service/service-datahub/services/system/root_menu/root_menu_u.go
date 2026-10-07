package root_menu

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *RootMenuService) UpdateRootMenus(ctx context.Context, items []RootMenuItem) ([]RootMenuItem, error) {
	if len(items) == 0 {
		return []RootMenuItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		UPDATE "_ERPRootMenus" SET
			"Key" = COALESCE(NULLIF($1, ''), "Key"),
			"Label" = COALESCE(NULLIF($2, ''), "Label"),
			"Link" = $3,
			"Icon" = COALESCE(NULLIF($4, ''), "Icon"),
			"IdxNo" = $5,
			"Utilities" = $6,
			"UpdatedBy" = $7,
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = COALESCE("RowVersion", 0) + 1
		WHERE "Id"::text = $8 AND ("RowVersion" = $9 OR $9 = 0 OR "RowVersion" IS NULL)
		RETURNING "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var updated []RootMenuItem
	for _, item := range items {
		targetId := strings.TrimSpace(item.Id)
		if targetId == "" {
			targetId = strings.TrimSpace(item.RootMenuId)
		}
		if targetId == "" {
			continue
		}

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

		link := item.Link
		icon := item.Icon
		if icon == "" {
			icon = "AppWindow"
		}
		orderSeq := item.OrderSeq
		if orderSeq == 0 {
			orderSeq = item.IdxNo
		}
		if orderSeq == 0 {
			orderSeq = 1
		}
		isUtilities := item.Utilities || item.View

		expectedRv := item.Rowversion
		if expectedRv == 0 {
			expectedRv = item.RowVersion
		}

		var newRv int64
		err := stmt.QueryRowContext(ctx,
			key,
			label,
			link,
			icon,
			orderSeq,
			isUtilities,
			item.UpdatedBy,
			targetId,
			expectedRv,
		).Scan(&newRv)

		if err != nil {
			s.logger.Warn("UpdateRootMenus concurrency conflict or not found",
				zap.String("id", targetId),
				zap.Int64("expectedRowversion", expectedRv),
				zap.Error(err),
			)
			return nil, fmt.Errorf("Dữ liệu Module gốc ID '%s' đã bị thay đổi bởi người dùng khác hoặc không tồn tại", targetId)
		}

		item.Rowversion = newRv
		item.RowVersion = newRv
		updated = append(updated, item)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return updated, nil
}
