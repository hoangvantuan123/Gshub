package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"server-core/internal/constants"
	domain "server-core/internal/models/auth"
	sysDomain "server-core/internal/models/system"
	"server-core/internal/utils"
)

// UsersAuthU cập nhật thông tin người dùng
func (s *UserAuthService) UsersAuthU(ctx context.Context, users []domain.ERPUsers) (any, error) {
	if len(users) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPUsers" SET 
				"UserName" = :UserName, 
				"Email" = :Email, 
				"EmpID" = :EmpID, 
				"EmpCode" = :EmpCode, 
				"EmpName" = :EmpName, 
				"DeptName" = :DeptName, 
				"ManagerName" = :ManagerName, 
				"Remark" = :Remark, 
				"IdxNo" = :IdxNo, 
				"Active" = :Active, 
				"UpdatedBy" = :UpdatedBy, 
				"UpdatedAt" = NOW() 
			  WHERE "UserSeq" = :UserSeq
			  RETURNING "UserSeq", "IdxNo", "UserId", "UpdatedAt", "UpdatedBy"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	results := make([]map[string]interface{}, 0, len(users))
	logRows := make([]sysDomain.RowChangeItem, 0, len(users))
	successCnt := 0
	failCnt := 0

	for i := range users {
		recordId := users[i].UserSeq
		if recordId == "" && users[i].UserId != nil {
			recordId = *users[i].UserId
		}

		// Read old record state before update
		var oldUser domain.ERPUsers
		if recordId != "" {
			_ = tx.GetContext(ctx, &oldUser, `SELECT * FROM "_ERPUsers" WHERE "UserSeq" = $1 OR "UserId" = $1 LIMIT 1`, recordId)
		}

		rows, err := stmt.QueryxContext(ctx, users[i])
		if err != nil {
			failCnt++
			submittedJSON, _ := json.Marshal(users[i])
			logRows = append(logRows, sysDomain.RowChangeItem{
				RowLog: sysDomain.SysDataChangeRowLog{
					TableName:     "_ERPUsers",
					RecordId:      recordId,
					RowIdx:        i + 1,
					ActionType:    "U",
					Status:        "FAILED",
					ErrorCode:     "UPDATE_ERROR",
					ErrorMsg:      err.Error(),
					SubmittedData: string(submittedJSON),
				},
			})
			continue
		}

		res := make(map[string]interface{})
		if rows.Next() {
			rows.MapScan(res)
		}
		rows.Close()
		results = append(results, res)
		successCnt++

		// Calculate field diffs (Old vs New)
		diffs := utils.ComputeFieldDiffs(oldUser, users[i])
		submittedJSON, _ := json.Marshal(users[i])

		logRows = append(logRows, sysDomain.RowChangeItem{
			RowLog: sysDomain.SysDataChangeRowLog{
				TableName:     "_ERPUsers",
				RecordId:      recordId,
				RowIdx:        i + 1,
				ActionType:    "U",
				Status:        "SUCCESS",
				SubmittedData: string(submittedJSON),
			},
			Details: diffs,
		})
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.publishKafkaEvent("AUTH_USER_UPDATED", results)

	overallStatus := "SUCCESS"
	if failCnt > 0 {
		if successCnt > 0 {
			overallStatus = "PARTIAL_SUCCESS"
		} else {
			overallStatus = "FAILED"
		}
	}

	go s.logBatchDataChange(ctx, "UsersAuthU", "_ERPUsers", logRows, len(users), successCnt, failCnt, overallStatus)

	return results, nil
}

// UPasswordForUsers đặt lại mật khẩu cho danh sách người dùng
func (s *UserAuthService) UPasswordForUsers(ctx context.Context, users []domain.ERPUsers) (any, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var updatedCount int64
	for _, u := range users {
		defaultPass := "@" + *u.UserId
		hashed, _ := s.hashPassword(defaultPass)

		res, err := tx.ExecContext(ctx, `UPDATE "_ERPUsers" SET "Password2" = $1, "CheckPass1" = false WHERE "UserSeq" = $2`, hashed, u.UserSeq)
		if err != nil {
			return nil, err
		}
		n, _ := res.RowsAffected()
		updatedCount += n
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.publishKafkaEvent("AUTH_PASSWORD_RESET", map[string]interface{}{"updated_count": updatedCount})

	return map[string]interface{}{
		"Message":      fmt.Sprintf("Đã đặt lại mật khẩu thành công cho %d người dùng", updatedCount),
		"UpdatedCount": updatedCount,
	}, nil
}

// UsersAuthUStatusAcc cập nhật trạng thái tài khoản (StatusAcc)
func (s *UserAuthService) UsersAuthUStatusAcc(ctx context.Context, users []domain.ERPUsers) (any, error) {
	if len(users) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPUsers" SET 
				"StatusAcc" = :StatusAcc,
				"UpdatedBy" = :UpdatedBy
			  WHERE "UserSeq" = :UserSeq
			  RETURNING "UserSeq", "IdxNo", "StatusAcc"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	results := make([]map[string]interface{}, 0, len(users))
	for i := range users {
		rows, err := stmt.QueryxContext(ctx, users[i])
		if err != nil {
			return nil, err
		}
		res := make(map[string]interface{})
		if rows.Next() {
			rows.MapScan(res)
		}
		rows.Close()
		results = append(results, res)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.publishKafkaEvent("AUTH_USER_STATUS_UPDATED", results)

	return results, nil
}
