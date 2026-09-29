package tbl_grp

import (
	"context"
)

// TblGrpQ handles querying table groups
func (s *TblGrpService) TblGrpQ(ctx context.Context, filters map[string]string) (any, error) {
	query := `SELECT "IdSeq", "KeyCode", "TableName" FROM "_ERPTblGrp" WHERE 1=1`
	args := map[string]interface{}{}

	if val, ok := filters["KeyItem1"]; ok && val != "" {
		query += ` AND "KeyCode" ILIKE :keyCode`
		args["keyCode"] = "%" + val + "%"
	}
	if val, ok := filters["KeyItem2"]; ok && val != "" {
		query += ` AND "TableName" ILIKE :tableName`
		args["tableName"] = "%" + val + "%"
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
