package middleware

import (
	"context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	pbRole "server-core/proto/users/roles/role"
	"testing"
)

func TestPermissionPolicy(t *testing.T) {
	for _, tc := range []struct{ method, operation string }{
		{"RoleA", "Create"}, {"UserRoleU", "Edit"}, {"RoleD", "Delete"}, {"MenuRoleQ", "View"},
	} {
		_, op, protected := permissionPolicy("/users.roles.role.RoleService/" + tc.method)
		if !protected || op != tc.operation {
			t.Fatalf("wrong policy for %s", tc.method)
		}
	}
	keys, _, _ := permissionPolicy("/users.roles.role.RoleService/RoleA")
	for _, key := range keys {
		if key == "system_role_groups" || key == "role_group" {
			t.Fatal("group management must not grant permission assignment")
		}
	}
}

func TestPermissionLookupFailsClosed(t *testing.T) {
	called := false
	handler := func(context.Context, interface{}) (interface{}, error) { called = true; return nil, nil }
	info := &grpc.UnaryServerInfo{FullMethod: "/users.roles.role.RoleService/RoleU"}
	_, err := PermissionInterceptor(nil)(context.Background(), nil, info, handler)
	if status.Code(err) != codes.Unauthenticated || called {
		t.Fatal("missing identity reached handler")
	}
	ctx := context.WithValue(context.Background(), "user_seq", "user-1")
	_, err = PermissionInterceptor(nil)(ctx, nil, info, handler)
	if status.Code(err) != codes.Unavailable || called {
		t.Fatal("unavailable permission store reached handler")
	}
	info.FullMethod = "/users.roles.role.RoleService/Unknown"
	_, err = PermissionInterceptor(nil)(ctx, nil, info, handler)
	if status.Code(err) != codes.PermissionDenied || called {
		t.Fatal("unknown operation reached handler")
	}
}

func TestUnifiedRoleRequestsRequireTheirOwnResourcePermissions(t *testing.T) {
	groupQuery := &pbRole.RoleQRequest{Result: map[string]string{"Sheet": "group"}}
	policies := requestPermissionMenus(groupQuery, nil)
	if len(policies) != 1 || policies[0][0] != "system_role_groups" {
		t.Fatal("group query requires wrong menu")
	}
	mixed := &pbRole.RoleARequest{Result: []*pbRole.RoleAItem{{Sheet: "group"}, {Type: "action"}}}
	policies = requestPermissionMenus(mixed, nil)
	if len(policies) != 2 || policies[1][0] != "system_permissions" {
		t.Fatal("mixed batch does not require assignment permissions")
	}
	ambiguous := &pbRole.RoleQRequest{Result: map[string]string{"Sheet": "group"}, Metadata: map[string]string{"Type": "details"}}
	if len(requestPermissionMenus(ambiguous, nil)) != 2 {
		t.Fatal("ambiguous filters bypass permissions")
	}
}

func TestAccountAdministrationRequiresPermissions(t *testing.T) {
	for _, tc := range []struct{ method, operation string }{
		{"UsersAuthQ", "View"}, {"UsersAuthA", "Create"}, {"UsersAuthU", "Edit"}, {"UsersAuthD", "Delete"}, {"updatePasswords", "Edit"}, {"UsersAuthUStatusAcc", "Edit"},
	} {
		keys, op, protected := permissionPolicy("/users.auth.users.UsersService/" + tc.method)
		if !protected || op != tc.operation || len(keys) == 0 || keys[0] != "user_management" {
			t.Fatalf("account API bypass: %s", tc.method)
		}
	}
}
