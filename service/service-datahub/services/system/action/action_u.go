package action

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *ActionService) UpdateAction(ctx context.Context, item ActionItem, user string) error {
	id := strings.TrimSpace(item.Id)
	if id == "" {
		return errors.New("ID hành động không được để trống")
	}

	actionKey := strings.TrimSpace(item.ActionKey)
	if actionKey == "" {
		actionKey = strings.TrimSpace(item.Key)
	}
	actionName := strings.TrimSpace(item.ActionName)
	if actionName == "" {
		actionName = strings.TrimSpace(item.Name)
	}

	if actionKey == "" {
		return errors.New("Mã hành động (ActionKey) không được để trống")
	}
	if actionName == "" {
		return errors.New("Tên hành động (ActionName) không được để trống")
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
		UPDATE "_ERPActions"
		SET 
			"ActionKey" = $1,
			"ActionName" = $2,
			"Description" = $3,
			"Icon" = $4,
			"IdxNo" = $5,
			"Active" = $6,
			"UpdatedBy" = $7,
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = "RowVersion" + 1
		WHERE "Id"::text = $8
	`

	res, err := s.db.ExecContext(ctx, query,
		actionKey,
		actionName,
		item.Description,
		icon,
		idxNo,
		item.Active,
		user,
		id,
	)

	if err != nil {
		s.logger.Error("UpdateAction error", zap.Error(err))
		return fmt.Errorf("không thể cập nhật hành động: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("không tìm thấy bản ghi hành động để cập nhật")
	}

	return nil
}
