package action

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *ActionService) CreateAction(ctx context.Context, item ActionItem, user string) (*ActionItem, error) {
	actionKey := strings.TrimSpace(item.ActionKey)
	if actionKey == "" {
		actionKey = strings.TrimSpace(item.Key)
	}
	actionName := strings.TrimSpace(item.ActionName)
	if actionName == "" {
		actionName = strings.TrimSpace(item.Name)
	}

	if actionKey == "" {
		return nil, errors.New("Mã hành động (ActionKey) không được để trống")
	}
	if actionName == "" {
		return nil, errors.New("Tên hành động (ActionName) không được để trống")
	}

	icon := strings.TrimSpace(item.Icon)
	if icon == "" {
		icon = "Activity"
	}
	idxNo := item.IdxNo
	if idxNo <= 0 {
		idxNo = 1
	}

	query := `
		INSERT INTO "_ERPActions" ("ActionKey", "ActionName", "Description", "Icon", "IdxNo", "Active", "CreatedBy", "UpdatedBy")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		RETURNING "Id", "CreatedAt", "UpdatedAt", "RowVersion"
	`

	var id int64
	var createdAt, updatedAt string
	var rv int64

	err := s.db.QueryRowContext(ctx, query,
		actionKey,
		actionName,
		item.Description,
		icon,
		idxNo,
		item.Active,
		user,
	).Scan(&id, &createdAt, &updatedAt, &rv)

	if err != nil {
		s.logger.Error("CreateAction error", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo hành động: %w", err)
	}

	item.Id = fmt.Sprintf("%d", id)
	item.ActionKey = actionKey
	item.Key = actionKey
	item.ActionName = actionName
	item.Name = actionName
	item.Icon = icon
	item.IdxNo = idxNo
	item.CreatedBy = user
	item.CreatedByName = user
	item.CreatedAt = createdAt
	item.UpdatedBy = user
	item.UpdatedByName = user
	item.UpdatedAt = updatedAt
	item.Rowversion = rv
	item.RowVersion = rv

	return &item, nil
}
