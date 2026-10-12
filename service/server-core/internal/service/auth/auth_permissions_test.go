package auth

import "testing"

func TestMergeActionGrantsRegardlessOfRowOrder(t *testing.T) {
	s := &authService{}
	menu := map[string]interface{}{"Type": "menu", "MenuId": 703, "View": true, "Edit": false}
	action := map[string]interface{}{"Type": "action", "MenuId": 703, "Name": "BTN_EDIT", "View": true}
	for _, rows := range [][]map[string]interface{}{{action, menu}, {menu, action}} {
		merged := s.mergePermissions(rows)["menu"].([]map[string]interface{})
		if len(merged) != 1 || !s.asBool(merged[0]["Edit"]) || !s.asBool(merged[0]["BTN_EDIT"]) {
			t.Fatalf("Edit grant was lost: %#v", merged)
		}
	}
}

func TestMergeActionGrantsFromMultipleGroups(t *testing.T) {
	s := &authService{}
	merged := s.mergePermissions([]map[string]interface{}{
		{"Type": "menu", "MenuId": 703, "View": true, "Edit": false},
		{"Type": "action", "MenuId": 703, "Name": "BTN_EDIT", "View": true},
		{"Type": "action", "MenuId": 703, "Name": "btn_edit", "View": false},
	})["menu"].([]map[string]interface{})
	if !s.asBool(merged[0]["Edit"]) || !merged[0]["actions"].(map[string]bool)["BTN_EDIT"] {
		t.Fatal("a denied action from another group replaced an allowed action")
	}
}

func TestMergeKeepsLegacyOperationGrant(t *testing.T) {
	s := &authService{}
	merged := s.mergePermissions([]map[string]interface{}{
		{"Type": "menu", "MenuId": 703, "View": true, "Edit": true},
		{"Type": "action", "MenuId": 703, "Name": "Edit", "View": false},
	})["menu"].([]map[string]interface{})
	if !s.asBool(merged[0]["Edit"]) {
		t.Fatal("denied action replaced legacy Edit=true")
	}
}

func TestMergeDoesNotGrantEditWithoutBEPermission(t *testing.T) {
	s := &authService{}
	merged := s.mergePermissions([]map[string]interface{}{
		{"Type": "menu", "MenuId": 703, "View": true, "Edit": false, "Name": "Super Administrators"},
		{"Type": "action", "MenuId": 703, "Name": "BTN_EDIT", "View": false},
	})["menu"].([]map[string]interface{})
	if s.asBool(merged[0]["Edit"]) {
		t.Fatal("Edit must come from BE grants, not the name of a group")
	}
}
