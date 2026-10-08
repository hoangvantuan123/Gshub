package tbl_grp

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
)

// TblGrpD handles deletion with integrity checks
func (s *TblGrpService) TblGrpD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "TBL_GRP"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Check constraints
	var exists bool
	err = tx.GetContext(ctx, &exists, `SELECT EXISTS (SELECT 1 FROM "_ERPTblGrpItem" WHERE "TblGrpSeq" = ANY($1))`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to check constraints: %w", err)
	}
	if exists {
		return nil, constants.NewError(constants.CodeDeleteConflict, constants.MsgDeleteConflictGeneric)
	}

	res, err := tx.ExecContext(ctx, `DELETE FROM "_ERPTblGrp" WHERE "IdSeq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete records: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit delete transaction: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
