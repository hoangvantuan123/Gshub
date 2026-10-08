package tbl_grp_perm

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
)

// TblGrpPermD handles deletion with association checks
func (s *TblGrpPermService) TblGrpPermD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "TBL_GRP_PERM"); err != nil {
		return nil, err
	}
	var count int
	err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM "_ERPTblGrpPermRole" WHERE "TblGrpPermSeq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to check role references: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("cannot delete permissions because they are assigned to roles")
	}

	_, err = s.db.ExecContext(ctx, `DELETE FROM "_ERPTblGrpPerm" WHERE "IdSeq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete records: %w", err)
	}
	return nil, nil
}
