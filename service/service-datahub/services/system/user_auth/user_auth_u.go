package user_auth

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func (s *UserAuthService) UpdateUsers(ctx context.Context, users []UserItem) ([]UserItem, error) {
	if len(users) == 0 {
		return []UserItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		UPDATE "_ERPUsers" SET
			"EmpID" = COALESCE(NULLIF($1, ''), "EmpID"),
			"EmpCode" = COALESCE(NULLIF($2, ''), "EmpCode"),
			"EmpName" = COALESCE(NULLIF($3, ''), "EmpName"),
			"DeptName" = COALESCE(NULLIF($4, ''), "DeptName"),
			"ManagerName" = COALESCE(NULLIF($5, ''), "ManagerName"),
			"UserName" = COALESCE(NULLIF($6, ''), "UserName"),
			"Email" = COALESCE(NULLIF($7, ''), "Email"),
			"CheckPass1" = $8,
			"StatusAcc" = $9,
			"Active" = $10,
			"UpdatedBy" = $11,
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = COALESCE("RowVersion", 0) + 1
		WHERE ("UserId" = $12 OR "UserSeq" = $13) AND ("RowVersion" = $14 OR $14 = 0 OR "RowVersion" IS NULL)
		RETURNING "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var updated []UserItem
	for _, u := range users {
		if strings.TrimSpace(u.UserId) == "" && strings.TrimSpace(u.UserSeq) == "" {
			continue
		}

		expectedRv := u.Rowversion
		if expectedRv == 0 {
			expectedRv = u.RowVersion
		}

		var newRv int64
		err := stmt.QueryRowContext(ctx,
			u.EmpID,
			u.EmpCode,
			u.EmpName,
			u.DeptName,
			u.ManagerName,
			u.UserName,
			u.Email,
			u.CheckPass1,
			u.StatusAcc,
			u.Active,
			u.UpdatedBy,
			u.UserId,
			u.UserSeq,
			expectedRv,
		).Scan(&newRv)

		if err != nil {
			s.logger.Warn("UpdateUsers concurrency conflict or not found",
				zap.String("UserId", u.UserId),
				zap.Int64("expectedRowversion", expectedRv),
				zap.Error(err),
			)
			return nil, fmt.Errorf("Dữ liệu tài khoản '%s' đã bị thay đổi bởi người dùng khác hoặc không tồn tại (RowVersion mismatch)", u.UserId)
		}

		u.Rowversion = newRv
		u.RowVersion = newRv
		updated = append(updated, u)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return updated, nil
}

func (s *UserAuthService) UpdateUserStatusAcc(ctx context.Context, userId string, statusAcc bool, updatedBy string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE "_ERPUsers" 
		SET "StatusAcc" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP, "RowVersion" = COALESCE("RowVersion", 0) + 1
		WHERE "UserId" = $3 OR "UserSeq" = $3
	`, statusAcc, updatedBy, userId)
	return err
}
