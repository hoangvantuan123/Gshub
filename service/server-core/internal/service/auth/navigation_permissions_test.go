package auth

import "testing"

func TestSubmenuAndImportExportAreReturned(t *testing.T) {
	s := &authService{}
	rows := []map[string]interface{}{
		{"Type": "submenu", "MenuId": 700, "MenuType": "submenu", "MenuKey": "system_users_roles_group", "View": true},
		{"Type": "menu", "MenuId": 703, "MenuSubRootId": 700, "MenuRootId": 2, "MenuKey": "system_permissions", "View": true, "Import": true, "Export": true},
	}
	result := s.mergePermissions(rows)
	menus := result["menu"].([]map[string]interface{})
	if len(menus) != 2 || menus[0]["MenuType"] != "submenu" {
		t.Fatalf("missing folder: %#v", menus)
	}
	if !s.asBool(menus[1]["Import"]) || !s.asBool(menus[1]["Export"]) {
		t.Fatal("lost import/export")
	}
	actions := menus[1]["actions"].(map[string]bool)
	if !actions["BTN_IMPORT"] || !actions["BTN_EXPORT"] || actions["BTN_DELETE"] {
		t.Fatalf("incorrect actions: %#v", actions)
	}
}

func TestCustomActionsAndMenuItemGrants(t *testing.T) {
	s := &authService{}
	result := s.mergePermissions([]map[string]interface{}{
		{"Type": "action", "MenuId": 302, "Name": "BTN_PRINT", "View": true},
		{"Type": "action", "MenuId": 302, "Name": "CUSTOM_APPROVE", "View": true},
		{"Type": "menuitem", "MenuId": 302, "MenuKey": "detail", "MenuType": "menuitem", "View": true},
		{"Type": "action", "MenuId": 1, "Name": "BTN_EDIT", "View": true},
	})
	menu := result["menuItem"].([]map[string]interface{})[0]
	actions := menu["actions"].(map[string]bool)
	if !actions["BTN_PRINT"] || !actions["CUSTOM_APPROVE"] {
		t.Fatal("lost nested actions")
	}
	for _, action := range result["action"].([]map[string]interface{}) {
		if s.asInt(action["MenuId"]) == 1 {
			t.Fatal("orphan action was attached to another menu")
		}
	}
}

func TestActionOnlyDoesNotGrantView(t *testing.T) {
	s := &authService{}
	menu := s.mergePermissions([]map[string]interface{}{{"Type": "action", "MenuId": 302, "MenuKey": "detail", "Name": "BTN_EDIT", "View": true}})["menu"].([]map[string]interface{})[0]
	if s.asBool(menu["View"]) || !s.asBool(menu["Edit"]) {
		t.Fatalf("incorrect action-only rights: %#v", menu)
	}
}

func TestMissingNavigationAncestorsDoNotGainOperations(t *testing.T) {
	s := &authService{}
	merged := s.mergePermissions([]map[string]interface{}{{"Type": "menu", "MenuId": 703, "MenuKey": "system_permissions", "MenuSubRootId": 700, "MenuRootId": 2, "View": true, "Edit": true}})
	s.completeNavigation(merged, []map[string]interface{}{
		{"MenuId": 703, "MenuSubRootId": 700, "MenuRootId": 2, "RootMenuId": 2, "RootMenuKey": "ROOT_SYSTEM", "RootMenuUtilities": true},
		{"MenuId": 700, "MenuKey": "system_users_roles_group", "MenuType": "submenu", "MenuRootId": 2, "RootMenuId": 2},
	})
	menus := merged["menu"].([]map[string]interface{})
	roots := merged["rootMenu"].([]map[string]interface{})
	if len(menus) != 2 || len(roots) != 1 || !s.asBool(menus[0]["NavigationOnly"]) {
		t.Fatalf("missing ancestors: %#v", merged)
	}
	for _, row := range []map[string]interface{}{menus[0], roots[0]} {
		if !s.asBool(row["View"]) || s.asBool(row["Edit"]) || s.asBool(row["Create"]) || row["MenuLink"] != nil && row["MenuLink"] != "" {
			t.Fatal("container gained business rights")
		}
	}
}

func TestNavigationDoesNotOverrideDeniedFolder(t *testing.T) {
	s := &authService{}
	merged := s.mergePermissions([]map[string]interface{}{
		{"Type": "submenu", "MenuId": 600, "View": false},
		{"Type": "menu", "MenuId": 601, "MenuSubRootId": 600, "View": true},
	})
	s.completeNavigation(merged, []map[string]interface{}{{"MenuId": 601, "MenuSubRootId": 600}, {"MenuId": 600, "MenuType": "submenu"}})
	if s.asBool(merged["menu"].([]map[string]interface{})[0]["View"]) {
		t.Fatal("explicit denial was overridden")
	}
}
