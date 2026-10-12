package auth

import (
	"context"
	"github.com/jmoiron/sqlx"
	"strings"
)

// Ancestors are navigation containers from the catalogue, never role grants.
func (s *authService) addNavigationAncestors(ctx context.Context, merged map[string]interface{}) error {
	ids := make([]int, 0)
	for _, section := range []string{"menu", "menuItem"} {
		for _, menu := range merged[section].([]map[string]interface{}) {
			ids = append(ids, s.asInt(menu["MenuId"]))
		}
	}
	if len(ids) == 0 {
		return nil
	}
	query, args, err := sqlx.In(`WITH RECURSIVE ancestors AS (
  SELECT m.* FROM "_ERPMenus" m WHERE m."Id" IN (?)
  UNION
  SELECT parent.* FROM "_ERPMenus" parent JOIN ancestors child ON parent."Id"=child."MenuSubRootId"
 ) SELECT a."Id" AS "MenuId", a."Key" AS "MenuKey", a."Label" AS "MenuLabel",
  a."Type" AS "MenuType", a."MenuRootId", a."MenuSubRootId", a."OrderSeq",
  rm."Id" AS "RootMenuId", rm."Key" AS "RootMenuKey", rm."Label" AS "RootMenuLabel",
  rm."Icon" AS "RootMenuIcon", rm."Utilities" AS "RootMenuUtilities", rm."IdxNo" AS "RootMenuOrderSeq"
 FROM ancestors a LEFT JOIN "_ERPRootMenus" rm ON rm."Id"=a."MenuRootId"`, ids)
	if err != nil {
		return err
	}
	rows, err := s.db.QueryxContext(ctx, s.db.Rebind(query), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	catalog := make([]map[string]interface{}, 0)
	for rows.Next() {
		row := make(map[string]interface{})
		if err := rows.MapScan(row); err != nil {
			return err
		}
		catalog = append(catalog, row)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	s.completeNavigation(merged, catalog)
	return nil
}

func navigationFlags(row map[string]interface{}) {
	row["NavigationOnly"] = true
	row["View"] = true
	for _, operation := range []string{"Create", "Edit", "Delete", "Import", "Export", "Copy", "Print", "Save", "Search"} {
		row[operation] = false
	}
	row["actions"] = map[string]bool{}
}

func (s *authService) completeNavigation(merged map[string]interface{}, catalog []map[string]interface{}) {
	metadata := make(map[int]map[string]interface{})
	for _, row := range catalog {
		norm := normalizePermissionRow(row)
		metadata[s.asInt(norm["menuid"])] = norm
	}
	menus := make(map[int]map[string]interface{})
	roots := make(map[int]map[string]interface{})
	for _, menu := range merged["menu"].([]map[string]interface{}) {
		menus[s.asInt(menu["MenuId"])] = menu
	}
	for _, root := range merged["rootMenu"].([]map[string]interface{}) {
		roots[s.asInt(root["RootMenuId"])] = root
	}
	visible := append([]map[string]interface{}{}, merged["menu"].([]map[string]interface{})...)
	visible = append(visible, merged["menuItem"].([]map[string]interface{})...)
	for _, menu := range visible {
		if !s.asBool(menu["View"]) {
			continue
		}
		row := metadata[s.asInt(menu["MenuId"])]
		if row == nil {
			continue
		}
		parentID := s.asInt(row["menusubrootid"])
		seen := map[int]bool{s.asInt(menu["MenuId"]): true}
		for parentID > 0 && !seen[parentID] {
			seen[parentID] = true
			parentMeta := metadata[parentID]
			if parentMeta == nil {
				break
			}
			if parent, exists := menus[parentID]; exists {
				// Explicitly denied folders remain denied; no inferred grant overrides them.
				if !s.asBool(parent["View"]) {
					break
				}
			} else {
				kind := strings.ToLower(strings.TrimSpace(toPermissionString(parentMeta["menutype"])))
				parent := map[string]interface{}{"Id": parentID, "MenuId": parentID, "MenuKey": parentMeta["menukey"], "MenuLabel": parentMeta["menulabel"], "MenuType": kind, "Type": kind, "MenuLink": "", "MenuRootId": s.asInt(parentMeta["menurootid"]), "MenuSubRootId": s.asInt(parentMeta["menusubrootid"]), "OrderSeq": s.asInt(parentMeta["orderseq"])}
				navigationFlags(parent)
				menus[parentID] = parent
			}
			parentID = s.asInt(parentMeta["menusubrootid"])
		}
		rootID := s.asInt(row["rootmenuid"])
		if rootID > 0 && roots[rootID] == nil {
			root := map[string]interface{}{"Id": rootID, "RootMenuId": rootID, "RootMenuKey": row["rootmenukey"], "RootMenuLabel": row["rootmenulabel"], "RootMenuIcon": row["rootmenuicon"], "RootMenuUtilities": s.asBool(row["rootmenuutilities"]), "RootMenuLink": "", "Type": "rootmenu", "OrderSeq": s.asInt(row["rootmenuorderseq"])}
			navigationFlags(root)
			roots[rootID] = root
		}
	}
	merged["menu"] = sortedPermissionRows(menus)
	merged["rootMenu"] = sortedPermissionRows(roots)
}

func toPermissionString(value interface{}) string { text, _ := value.(string); return text }
