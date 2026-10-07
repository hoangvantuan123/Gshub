package user_auth

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (s *UserAuthService) AddUsers(ctx context.Context, users []UserItem) ([]UserItem, error) {
	if len(users) == 0 {
		return []UserItem{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO "_ERPUsers" (
			"UserSeq", "CompanySeq", "IdxNo", "EmpID", "EmpCode", "EmpName",
			"DeptName", "ManagerName", "UserId", "UserType", "UserName",
			"Email", "CheckPass1", "StatusAcc", "Status", "Active", "LanguageSeq",
			"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "RowVersion"
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17,
			$18, CURRENT_TIMESTAMP, $19, CURRENT_TIMESTAMP, 1
		)
		ON CONFLICT ("UserId") DO UPDATE SET
			"UserName" = EXCLUDED."UserName",
			"EmpName" = EXCLUDED."EmpName",
			"EmpCode" = EXCLUDED."EmpCode",
			"DeptName" = EXCLUDED."DeptName",
			"Email" = EXCLUDED."Email",
			"StatusAcc" = EXCLUDED."StatusAcc",
			"Active" = EXCLUDED."Active",
			"UpdatedBy" = EXCLUDED."UpdatedBy",
			"UpdatedAt" = CURRENT_TIMESTAMP,
			"RowVersion" = COALESCE("_ERPUsers"."RowVersion", 0) + 1
		RETURNING "RowVersion"
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var inserted []UserItem
	for _, u := range users {
		if strings.TrimSpace(u.UserId) == "" {
			continue
		}
		userSeq := u.UserSeq
		if userSeq == "" {
			userSeq = uuid.New().String()
		}

		var rv int64
		err := stmt.QueryRowContext(ctx,
			userSeq,
			1,
			u.IdxNo,
			u.EmpID,
			u.EmpCode,
			u.EmpName,
			u.DeptName,
			u.ManagerName,
			u.UserId,
			u.UserType,
			u.UserName,
			u.Email,
			u.CheckPass1,
			u.StatusAcc,
			"ACTIVE",
			u.Active,
			6,
			u.CreatedBy,
			u.UpdatedBy,
		).Scan(&rv)
		if err != nil {
			s.logger.Error("AddUsers insert error", zap.Error(err), zap.String("UserId", u.UserId))
			return nil, err
		}
		u.UserSeq = userSeq
		u.Rowversion = rv
		u.RowVersion = rv
		inserted = append(inserted, u)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return inserted, nil
}
