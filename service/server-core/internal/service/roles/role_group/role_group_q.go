package role_group

import (
	"context"
	"fmt"

	domain "server-core/internal/models/roles"

	"github.com/jmoiron/sqlx"
)

// RoleGroupQ truy vấn danh sách nhóm quyền
func (s *RoleGroupService) RoleGroupQ(ctx context.Context, filters ...map[string]string) ([]domain.ERPGroups, error) {
	query := `SELECT 
		g."Id", g."Name", g."Comment", g."IdxNo", 
		COALESCE(CAST(NULLIF(CAST(g."RowVersion" AS VARCHAR), '') AS BIGINT), 0) AS "RowVersion",
		g."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		COALESCE(g."CreatedAt", NOW()) AS "CreatedAt",
		g."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		COALESCE(g."UpdatedAt", NOW()) AS "UpdatedAt"
	FROM "_ERPGroups" g
	LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
	WHERE 1=1`
	args := map[string]interface{}{}

	if len(filters) > 0 && filters[0] != nil {
		f := filters[0]
		if name, ok := f["Name"]; ok && name != "" {
			query += ` AND LOWER(g."Name") LIKE LOWER(:name)`
			args["name"] = "%" + name + "%"
		} else if name, ok := f["name"]; ok && name != "" {
			query += ` AND LOWER(g."Name") LIKE LOWER(:name)`
			args["name"] = "%" + name + "%"
		}
		if id, ok := f["Id"]; ok && id != "" {
			query += ` AND CAST(g."Id" AS VARCHAR) = :id`
			args["id"] = id
		} else if id, ok := f["id"]; ok && id != "" {
			query += ` AND CAST(g."Id" AS VARCHAR) = :id`
			args["id"] = id
		}
		if comment, ok := f["Comment"]; ok && comment != "" {
			query += ` AND LOWER(g."Comment") LIKE LOWER(:comment)`
			args["comment"] = "%" + comment + "%"
		} else if comment, ok := f["comment"]; ok && comment != "" {
			query += ` AND LOWER(g."Comment") LIKE LOWER(:comment)`
			args["comment"] = "%" + comment + "%"
		}
		if cb, ok := f["CreatedByName"]; ok && cb != "" {
			query += ` AND (LOWER(COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '')) LIKE LOWER(:created_by_name))`
			args["created_by_name"] = "%" + cb + "%"
		} else if cb, ok := f["createdbyname"]; ok && cb != "" {
			query += ` AND (LOWER(COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '')) LIKE LOWER(:created_by_name))`
			args["created_by_name"] = "%" + cb + "%"
		}
		if ub, ok := f["UpdatedByName"]; ok && ub != "" {
			query += ` AND (LOWER(COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '')) LIKE LOWER(:updated_by_name))`
			args["updated_by_name"] = "%" + ub + "%"
		} else if ub, ok := f["updatedbyname"]; ok && ub != "" {
			query += ` AND (LOWER(COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '')) LIKE LOWER(:updated_by_name))`
			args["updated_by_name"] = "%" + ub + "%"
		}
	}

	query += ` ORDER BY g."IdxNo" ASC, g."Id" ASC`

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, err
	}
	query = s.db.Rebind(query)

	var groups []domain.ERPGroups
	err = s.db.SelectContext(ctx, &groups, query, argsList...)
	if err != nil {
		return nil, fmt.Errorf("failed to query groups: %w", err)
	}

	return groups, nil
}
