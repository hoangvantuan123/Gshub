package tbl_grp_perm_role

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/technique"

	"github.com/google/uuid"
)

// TblGrpPermRoleA handles batch insertion with NULL handling for foreign keys
func (s *TblGrpPermRoleService) TblGrpPermRoleA(ctx context.Context, roles []domain.ERPTblGrpPermRole) (any, error) {
	if len(roles) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
	}
	if err := config.ValidateBatchLimit(len(roles), "thêm mới", "TBL_GRP_PERM"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPTblGrpPermRole" ("IdSeq", "TblGrpPermSeq", "TblGrpSeq", "TblGrpItemSeq", "UserSeq", "TypeRole", "View", "Edit", "CreatedBy", "CreatedAt") 
	          VALUES (:IdSeq, :TblGrpPermSeq, :TblGrpSeq, :TblGrpItemSeq, :UserSeq, :TypeRole, :View, :Edit, :CreatedBy, :CreatedAt)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for i := range roles {
		if roles[i].IdSeq == "" {
			roles[i].IdSeq = uuid.Must(uuid.NewV7()).String()
		}
		_, err := stmt.ExecContext(ctx, roles[i])
		if err != nil {
			return nil, fmt.Errorf("failed to insert role permission record: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	return roles, nil
}
