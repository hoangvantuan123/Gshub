package role_user

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"server-core/internal/platform/cache"
)

// PermResourceTreeData cấu trúc dữ liệu cây phân hệ & menu phân quyền
type PermResourceTreeData struct {
	RootMenus []map[string]interface{} `json:"rootMenus"`
	FlatMenus []map[string]interface{} `json:"flatMenus"`
}

// PermResourceTreeQ truy vấn toàn bộ RootMenus và FlatMenus phục vụ dựng cây phân cấp cho permResource & roleManagement
func (s *RoleUsersService) PermResourceTreeQ(ctx context.Context, filters map[string]string) (*PermResourceTreeData, error) {
	filtersBytes, _ := json.Marshal(filters)
	hash := md5.Sum(filtersBytes)
	cacheKey := fmt.Sprintf("perm_resource_tree_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if result, ok := val.(*PermResourceTreeData); ok {
			return result, nil
		}
	}

	// 1. Truy vấn danh sách phân hệ gốc (Root Modules)
	rootQuery := `
		SELECT 
			rm."Id" AS "Id",
			rm."Id" AS "RootMenuId",
			COALESCE(rm."Key", '') AS "RootMenuKey",
			COALESCE(rm."Label", '') AS "RootMenuLabel",
			COALESCE(rm."Link", '') AS "Link",
			COALESCE(rm."Icon", '') AS "Icon",
			COALESCE(rm."IdxNo", 0) AS "IdxNo",
			COALESCE(rm."RowVersion", 1) AS "RowVersion"
		FROM "_ERPRootMenus" rm
		ORDER BY rm."IdxNo" ASC, rm."Id" ASC
	`
	rootRows, err := s.db.QueryxContext(ctx, rootQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query root menus: %w", err)
	}
	defer rootRows.Close()

	var rootMenus []map[string]interface{}
	for rootRows.Next() {
		row := make(map[string]interface{})
		if err := rootRows.MapScan(row); err == nil {
			rootMenus = append(rootMenus, row)
		}
	}

	// 2. Truy vấn danh sách phẳng tất cả Submenus, Menus, MenuItems (Flat Menus)
	menuQuery := `
		SELECT 
			m."Id" AS "Id",
			COALESCE(m."MenuSubRootId", 0) AS "ParentId",
			COALESCE(m."MenuRootId", 0) AS "RootMenuId",
			COALESCE(rm."Label", '') AS "RootMenuName",
			COALESCE(rm."Key", '') AS "RootMenuKey",
			COALESCE(sm."Key", '') AS "SubmenuKey",
			COALESCE(sm."Label", '') AS "SubmenuName",
			COALESCE(m."Key", '') AS "Key",
			COALESCE(m."Label", '') AS "Label",
			COALESCE(m."Link", '') AS "Link",
			COALESCE(m."Type", 'menu') AS "Type",
			COALESCE(m."OrderSeq", 0) AS "OrderNo",
			COALESCE(m."IdxNo", 0) AS "IdxNo",
			COALESCE(m."RowVersion", 1) AS "RowVersion",
			CASE 
				WHEN m."MenuSubRootId" IS NULL OR m."MenuSubRootId" = 0 THEN 0
				WHEN sm."MenuSubRootId" IS NULL OR sm."MenuSubRootId" = 0 THEN 1
				ELSE 2 
			END AS "Level"
		FROM "_ERPMenus" m
		LEFT JOIN "_ERPRootMenus" rm ON CAST(m."MenuRootId" AS VARCHAR) = CAST(rm."Id" AS VARCHAR)
		LEFT JOIN "_ERPMenus" sm ON CAST(m."MenuSubRootId" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		ORDER BY m."MenuRootId" ASC, m."OrderSeq" ASC, m."Id" ASC
	`
	menuRows, err := s.db.QueryxContext(ctx, menuQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query flat menus: %w", err)
	}
	defer menuRows.Close()

	var flatMenus []map[string]interface{}
	for menuRows.Next() {
		row := make(map[string]interface{})
		if err := menuRows.MapScan(row); err == nil {
			flatMenus = append(flatMenus, row)
		}
	}

	result := &PermResourceTreeData{
		RootMenus: rootMenus,
		FlatMenus: flatMenus,
	}

	cache.GetCache().Set(ctx, cacheKey, result, 15*time.Minute)

	return result, nil
}
