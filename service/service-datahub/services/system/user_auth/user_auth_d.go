package user_auth

import (
	"context"
	"strings"

	"go.uber.org/zap"
)

func (s *UserAuthService) DeleteUsers(ctx context.Context, userIds []string) error {
	if len(userIds) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `DELETE FROM "_ERPUsers" WHERE "UserId" = $1 OR "UserSeq" = $1`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, uid := range userIds {
		clean := strings.TrimSpace(uid)
		if clean == "" {
			continue
		}
		if _, err := stmt.ExecContext(ctx, clean); err != nil {
			s.logger.Error("DeleteUsers execute error", zap.Error(err), zap.String("UserId", clean))
			return err
		}
	}

	return tx.Commit()
}
