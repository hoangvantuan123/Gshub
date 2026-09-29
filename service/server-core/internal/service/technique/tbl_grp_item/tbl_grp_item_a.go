package tbl_grp_item

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/technique"

	"github.com/google/uuid"
)

// TblGrpItemA handles batch insertion of table group items
func (s *TblGrpItemService) TblGrpItemA(ctx context.Context, items []domain.ERPTblGrpItem) (any, error) {
	if len(items) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
	}
	if err := config.ValidateBatchLimit(len(items), "thêm mới", "TBL_GRP_ITEM"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPTblGrpItem" ("IdSeq", "IdxNo", "TblGrpSeq", "KeyCode", "CreatedBy", "CreatedAt") 
	          VALUES (:IdSeq, :IdxNo, :TblGrpSeq, :KeyCode, :CreatedBy, :CreatedAt)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for i := range items {
		if items[i].IdSeq == "" {
			items[i].IdSeq = uuid.Must(uuid.NewV7()).String()
		}

		_, err := stmt.ExecContext(ctx, items[i])
		if err != nil {
			return nil, fmt.Errorf("failed to insert record at index %d: %w", i, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	return items, nil
}
