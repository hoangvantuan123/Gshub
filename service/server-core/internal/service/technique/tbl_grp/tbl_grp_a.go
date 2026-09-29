package tbl_grp

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/technique"

	"github.com/google/uuid"
)

// TblGrpA handles batch insertion of table groups
func (s *TblGrpService) TblGrpA(ctx context.Context, groups []domain.ERPTblGrp) (any, error) {
	if len(groups) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
	}
	if err := config.ValidateBatchLimit(len(groups), "thêm mới", "TBL_GRP"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPTblGrp" ("IdSeq", "IdxNo", "KeyCode", "TableName", "CreatedBy", "CreatedAt") 
	          VALUES (:IdSeq, :IdxNo, :KeyCode, :TableName, :CreatedBy, :CreatedAt)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for i := range groups {
		if groups[i].IdSeq == "" {
			groups[i].IdSeq = uuid.Must(uuid.NewV7()).String()
		}

		_, err := stmt.ExecContext(ctx, groups[i])
		if err != nil {
			return nil, fmt.Errorf("failed to insert record at index %d: %w", i, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	return groups, nil
}
