package user

import (
	"context"
	"errors"
	"fmt"

	"server-core/internal/constants"
	sysDomain "server-core/internal/models/system"
)

// UsersAuthD xóa người dùng theo UserSeq
func (s *UserAuthService) UsersAuthD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsDelete))
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPUsers" WHERE "UserSeq" = ANY($1)`, ids)
	if err != nil {
		logRows := make([]sysDomain.RowChangeItem, 0, len(ids))
		for i, id := range ids {
			logRows = append(logRows, sysDomain.RowChangeItem{
				RowLog: sysDomain.SysDataChangeRowLog{
					TableName:  "_ERPUsers",
					RecordId:   id,
					RowIdx:     i + 1,
					ActionType: "D",
					Status:     "FAILED",
					ErrorCode:  "DELETE_ERROR",
					ErrorMsg:   err.Error(),
				},
			})
		}
		go s.logBatchDataChange(ctx, "UsersAuthD", "_ERPUsers", logRows, len(ids), 0, len(ids), "FAILED")
		return nil, err
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected > 0 {
		s.totalAllCount.Add(-rowsAffected)
	}

	s.publishKafkaEvent("AUTH_USER_DELETED", ids)

	logRows := make([]sysDomain.RowChangeItem, 0, len(ids))
	for i, id := range ids {
		logRows = append(logRows, sysDomain.RowChangeItem{
			RowLog: sysDomain.SysDataChangeRowLog{
				TableName:  "_ERPUsers",
				RecordId:   id,
				RowIdx:     i + 1,
				ActionType: "D",
				Status:     "SUCCESS",
			},
		})
	}
	go s.logBatchDataChange(ctx, "UsersAuthD", "_ERPUsers", logRows, len(ids), int(rowsAffected), len(ids)-int(rowsAffected), "SUCCESS")

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
