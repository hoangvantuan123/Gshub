package auth

import "testing"

func TestGrantsAllow(t *testing.T) {
	view := PermissionGrant{MenuID: 401, Type: "menu", View: true}
	write := PermissionGrant{MenuID: 401, Type: "menu", View: true, Create: true, Edit: true, Delete: true}
	cases := []struct {
		name, operation string
		rows            []PermissionGrant
		want            bool
	}{
		{"missing menu", "Search", nil, false},
		{"legacy view permits search", "Search", []PermissionGrant{view}, true},
		{"view alone cannot create", "Create", []PermissionGrant{view}, false},
		{"search denied", "Search", []PermissionGrant{view, {MenuID: 401, Type: "action", Name: "BTN_SEARCH"}}, false},
		{"save denied blocks create", "Create", []PermissionGrant{write, {MenuID: 401, Type: "action", Name: "BTN_SAVE"}}, false},
		{"save denied blocks edit", "Edit", []PermissionGrant{write, {MenuID: 401, Type: "action", Name: "BTN_SAVE"}}, false},
		{"save deny does not block delete", "Delete", []PermissionGrant{write, {MenuID: 401, Type: "action", Name: "BTN_SAVE"}}, true},
		{"group grants combine", "Search", []PermissionGrant{view, {MenuID: 401, Type: "action", Name: "BTN_SEARCH"}, {MenuID: 401, Type: "action", Name: "SEARCH", View: true}}, true},
		{"cannot combine view on one menu with write on another", "Create", []PermissionGrant{view, {MenuID: 402, Type: "action", Name: "BTN_CREATE", View: true}}, false},
		{"action grant enables create", "Create", []PermissionGrant{view, {MenuID: 401, Type: "action", Name: "BTN_CREATE", View: true}}, true},
		{"unknown operation fails closed", "Anything", []PermissionGrant{write}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := GrantsAllow(tc.rows, tc.operation); got != tc.want {
				t.Fatalf("got %v want %v", got, tc.want)
			}
		})
	}
}
