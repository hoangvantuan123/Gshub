package tbl_grp_perm

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/technique"

	"github.com/google/uuid"
)

// TblGrpPermA handles batch insertion of table group permissions
func (s *TblGrpPermService) TblGrpPermA(ctx context.Context, perms []domain.ERPTblGrpPerm) (any, error) {
	if len(perms) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
	}
	if err := config.ValidateBatchLimit(len(perms), "thêm mới", "TBL_GRP_PERM"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPTblGrpPerm" ("IdSeq", "TblGrpPermName", "CreatedBy", "CreatedAt") 
	          VALUES (:IdSeq, :TblGrpPermName, :CreatedBy, :CreatedAt)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for i := range perms {
		if perms[i].IdSeq == "" {
			perms[i].IdSeq = uuid.Must(uuid.NewV7()).String()
		}
		_, err := stmt.ExecContext(ctx, perms[i])
		if err != nil {
			return nil, fmt.Errorf("failed to insert permission record: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	return perms, nil
}
