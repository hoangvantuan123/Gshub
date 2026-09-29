package tbl_grp_perm

import (
	"context"
)

// TblGrpPermQ handles querying permissions
func (s *TblGrpPermService) TblGrpPermQ(ctx context.Context) (any, error) {
	query := `SELECT "IdSeq", "TblGrpPermName" FROM "_ERPTblGrpPerm" ORDER BY "IdSeq" ASC`

	var result []map[string]interface{}
	rows, err := s.db.QueryxContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		row := make(map[string]interface{})
		rows.MapScan(row)
		result = append(result, row)
	}
	return result, nil
}
