package action

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *ActionService) DeleteAction(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("ID hành động không được để trống")
	}

	// Xóa các liên kết trong _ERPMenuActions trước nếu có
	_, _ = s.db.ExecContext(ctx, `DELETE FROM "_ERPMenuActions" WHERE "ActionKey" IN (SELECT "ActionKey" FROM "_ERPActions" WHERE "Id"::text = $1)`, id)

	query := `DELETE FROM "_ERPActions" WHERE "Id"::text = $1`
	res, err := s.db.ExecContext(ctx, query, id)
	if err != nil {
		s.logger.Error("DeleteAction error", zap.Error(err))
		return fmt.Errorf("không thể xóa hành động: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("không tìm thấy bản ghi hành động để xóa")
	}

	return nil
}
