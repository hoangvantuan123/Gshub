package tbl_grp_item

import (
	"context"
)

// TblGrpItemQ handles querying items with parent filter
func (s *TblGrpItemService) TblGrpItemQ(ctx context.Context, filters map[string]string) (any, error) {
	query := `SELECT "IdSeq", "TblGrpSeq", "KeyCode" FROM "_ERPTblGrpItem" WHERE 1=1`
	args := map[string]interface{}{}

	if val, ok := filters["KeyItem1"]; ok && val != "" {
		query += ` AND "TblGrpSeq" = :tblGrpSeq`
		args["tblGrpSeq"] = val
	}

	query += ` ORDER BY "IdSeq" ASC`

	rows, err := s.db.NamedQueryContext(ctx, query, args)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		rows.MapScan(row)
		result = append(result, row)
	}

	return result, nil
}
