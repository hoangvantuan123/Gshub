package tbl_grp_perm_role

import (
	"context"
)

// TblGrpPermRoleQ handles complex multi-table joins for permission queries
func (s *TblGrpPermRoleService) TblGrpPermRoleQ(ctx context.Context, filters map[string]interface{}) (any, error) {
	query := `
		SELECT 
			q.*,
			s1."KeyCode" as "TblGrpCode",
			s2."UserName" as "UserName",
			s2."UserId" as "UserId",
			s3."KeyCode" as "TblGrpItemCode"
		FROM "_ERPTblGrpPermRole" q
		LEFT JOIN "_ERPTblGrp" s1 ON q."TblGrpSeq" = s1."IdSeq"
		LEFT JOIN "_ERPUsers" s2 ON q."UserSeq" = s2."UserSeq"
		LEFT JOIN "_ERPTblGrpItem" s3 ON q."TblGrpItemSeq" = s3."IdSeq"
		WHERE 1=1
	`
	args := map[string]interface{}{}
	if v, ok := filters["KeyItem1"]; ok && v != "" {
		query += ` AND q."TblGrpPermSeq" = :permSeq`
		args["permSeq"] = v
	}
	if v, ok := filters["KeyItem3"]; ok && v != "" {
		query += ` AND q."TblGrpSeq" = :grpSeq`
		args["grpSeq"] = v
	}

	query += ` ORDER BY q."IdSeq" ASC`

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
