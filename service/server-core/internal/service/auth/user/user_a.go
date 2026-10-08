package user

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/auth"
	sysDomain "server-core/internal/models/system"
	"server-core/internal/utils"

	"github.com/google/uuid"
)

// UsersAuthA tạo mới người dùng
func (s *UserAuthService) UsersAuthA(ctx context.Context, users []domain.ERPUsers) (any, error) {
	if len(users) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPUsers" (
				"UserSeq", "UserId", "UserName", "Password2", "CheckPass1", "StatusAcc", "Active", 
				"Email", "EmpID", "EmpCode", "EmpName", "DeptName", "ManagerName", "Remark", "IdxNo", 
				"CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
			  ) 
	          VALUES (
				:UserSeq, :UserId, :UserName, :Password2, :CheckPass1, :StatusAcc, :Active, 
				:Email, :EmpID, :EmpCode, :EmpName, :DeptName, :ManagerName, :Remark, :IdxNo, 
				:CreatedBy, NOW(), :UpdatedBy, NOW()
			  )
			  RETURNING "UserSeq", "IdxNo", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy"`

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
		if users[i].UserSeq == "" {
			users[i].UserSeq = uuid.Must(uuid.NewV7()).String()
		}

		recordId := users[i].UserSeq
		if users[i].UserId != nil && *users[i].UserId != "" {
			normalizedID := strings.ToLower(strings.ReplaceAll(*users[i].UserId, "_", ""))
			var count int
			err := tx.GetContext(ctx, &count, `SELECT COUNT(*) FROM "_ERPUsers" WHERE LOWER(REPLACE("UserId", '_', '')) = $1`, normalizedID)
			if err != nil {
				failCnt++
				submittedJSON, _ := json.Marshal(users[i])
				logRows = append(logRows, sysDomain.RowChangeItem{
					RowLog: sysDomain.SysDataChangeRowLog{
						TableName:     "_ERPUsers",
						RecordId:      recordId,
						RowIdx:        i + 1,
						ActionType:    "A",
						Status:        "FAILED",
						ErrorCode:     "DB_ERROR",
						ErrorMsg:      err.Error(),
						SubmittedData: string(submittedJSON),
					},
				})
				return nil, err
			}
			if count > 0 {
				failCnt++
				errMsg := constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgDuplicateID, *users[i].UserId)
				submittedJSON, _ := json.Marshal(users[i])
				logRows = append(logRows, sysDomain.RowChangeItem{
					RowLog: sysDomain.SysDataChangeRowLog{
						TableName:     "_ERPUsers",
						RecordId:      recordId,
						RowIdx:        i + 1,
						ActionType:    "A",
						Status:        "FAILED",
						ErrorCode:     "ERR_DUPLICATE_ID",
						ErrorMsg:      errMsg,
						SubmittedData: string(submittedJSON),
					},
				})
				return nil, errors.New(errMsg)
			}

			defaultPass := "@" + *users[i].UserId
			hashed, _ := s.hashPassword(defaultPass)
			users[i].Password2 = &hashed
		}

		users[i].CheckPass1 = false

		rows, err := stmt.QueryxContext(ctx, users[i])
		if err != nil {
			failCnt++
			submittedJSON, _ := json.Marshal(users[i])
			logRows = append(logRows, sysDomain.RowChangeItem{
				RowLog: sysDomain.SysDataChangeRowLog{
					TableName:     "_ERPUsers",
					RecordId:      recordId,
					RowIdx:        i + 1,
					ActionType:    "A",
					Status:        "FAILED",
					ErrorCode:     "INSERT_ERROR",
					ErrorMsg:      err.Error(),
					SubmittedData: string(submittedJSON),
				},
			})
			return nil, err
		}

		res := make(map[string]interface{})
		if rows.Next() {
			rows.MapScan(res)
		}
		rows.Close()
		results = append(results, res)
		successCnt++

		submittedJSON, _ := json.Marshal(users[i])
		diffs := utils.ComputeFieldDiffs(nil, users[i])
		logRows = append(logRows, sysDomain.RowChangeItem{
			RowLog: sysDomain.SysDataChangeRowLog{
				TableName:     "_ERPUsers",
				RecordId:      recordId,
				RowIdx:        i + 1,
				ActionType:    "A",
				Status:        "SUCCESS",
				SubmittedData: string(submittedJSON),
			},
			Details: diffs,
		})
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(successCnt))
	s.publishKafkaEvent("AUTH_USER_CREATED", results)
	go s.logBatchDataChange(ctx, "UsersAuthA", "_ERPUsers", logRows, len(users), successCnt, failCnt, "SUCCESS")

	return results, nil
}
