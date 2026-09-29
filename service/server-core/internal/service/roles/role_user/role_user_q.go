package role_user

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
)

// RoleUsersQ truy vấn phân quyền User / Menu / RootMenu
func (s *RoleUsersService) RoleUsersQ(ctx context.Context, opts RoleUsersQueryOptions) ([]map[string]interface{}, error) {
	optsBytes, _ := json.Marshal(opts)
	hash := md5.Sum(optsBytes)
	cacheKey := fmt.Sprintf("role_users_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if result, ok := val.([]map[string]interface{}); ok {
			return result, nil
		}
	}

	query := `
		SELECT 
			ru."Id" AS "Id",
			ru."GroupId" AS "GroupId",
			ru."UserId" AS "UserId",
			ru."UserSeq" AS "UserSeq",
			ru."MenuId" AS "MenuId",
			ru."RootMenuId" AS "RootMenuId",
			ru."Type" AS "Type",
			ru."View" AS "View",
			ru."Edit" AS "Edit",
			ru."Create" AS "Create",
			ru."Delete" AS "Delete",
			ru."IdxNo" AS "IdxNo",
			COALESCE(ru."RowVersion", 1) AS "RowVersion",
			COALESCE(ru."CreatedBy", '') AS "CreatedBy",
			COALESCE(CAST(ru."CreatedAt" AS VARCHAR), '') AS "CreatedAt",
			COALESCE(ru."UpdatedBy", '') AS "UpdatedBy",
			COALESCE(CAST(ru."UpdatedAt" AS VARCHAR), '') AS "UpdatedAt"
	`

	switch opts.Type {
	case "menu":
		query += `, m."Key" AS "MenuKey", m."Label" AS "MenuLabel", COALESCE(rm."Label", '') AS "MenuRootName", COALESCE(sm."Label", '') AS "MenuSubRootName"`
	case "user":
		query += `, COALESCE(u."UserName", '') AS "UserName"`
	case "rootmenu", "root":
		query += `, rm."Key" AS "RootMenuKey", rm."Label" AS "RootMenuLabel"`
	}

	query += `
		FROM "_ERPRolesUsers" ru
	`

	switch opts.Type {
	case "menu":
		query += ` LEFT JOIN "_ERPMenus" m ON CAST(ru."MenuId" AS VARCHAR) = CAST(m."Id" AS VARCHAR)
		           LEFT JOIN "_ERPRootMenus" rm ON CAST(m."MenuRootId" AS VARCHAR) = CAST(rm."Id" AS VARCHAR)
		           LEFT JOIN "_ERPMenus" sm ON CAST(m."MenuSubRootId" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)`
	case "user":
		query += ` LEFT JOIN "_ERPUsers" u ON CAST(ru."UserId" AS VARCHAR) = CAST(u."UserId" AS VARCHAR) OR CAST(ru."UserSeq" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR)`
	case "rootmenu", "root":
		query += ` LEFT JOIN "_ERPRootMenus" rm ON CAST(ru."RootMenuId" AS VARCHAR) = CAST(rm."Id" AS VARCHAR)`
	}

	query += ` WHERE 1=1`

	args := map[string]interface{}{}
	if opts.Type != "" {
		switch opts.Type {
		case "rootmenu", "root":
			query += ` AND (ru."Type" = 'root' OR ru."Type" = 'rootmenu') AND ru."RootMenuId" IS NOT NULL AND ru."RootMenuId" > 0`
		case "menu":
			query += ` AND ru."Type" = :type AND ru."MenuId" IS NOT NULL AND ru."MenuId" > 0`
			args["type"] = opts.Type
		case "user":
			query += ` AND ru."Type" = :type AND ((ru."UserId" IS NOT NULL AND ru."UserId" != '') OR (ru."UserSeq" IS NOT NULL AND ru."UserSeq" != ''))`
			args["type"] = opts.Type
		default:
			query += ` AND ru."Type" = :type`
			args["type"] = opts.Type
		}
	}
	if opts.GroupId > 0 {
		query += ` AND CAST(ru."GroupId" AS VARCHAR) = :groupId`
		args["groupId"] = fmt.Sprintf("%d", opts.GroupId)
	}
	if opts.UserId > 0 {
		query += ` AND CAST(ru."UserSeq" AS VARCHAR) = :userId`
		args["userId"] = fmt.Sprintf("%d", opts.UserId)
	}

	query += ` ORDER BY ru."IdxNo" ASC, ru."Id" ASC`

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, err
	}
	query = s.db.Rebind(query)

	rows, err := s.db.QueryxContext(ctx, query, argsList...)
	if err != nil {
		return nil, fmt.Errorf("failed to query role users: %w", err)
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	cache.GetCache().Set(ctx, cacheKey, result, 30*time.Minute)

	return result, nil
}
