package middleware

import (
	"context"
	pbRole "server-core/proto/users/roles/role"
	"strings"

	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Explicit service-to-menu mapping. Client-supplied menu IDs and cached grants
// are never authorization inputs. Unmapped business services need separate policy.
var permissionMenus = map[string][]string{
	"users.auth.users.UsersService":                                {"user_management", "role_user_mgmt", "user_access", "user_mgmt", "system_users"},
	"users.roles.role.RoleService":                                 {"system_permissions", "perm_assign", "permission_assignment", "role_perm", "role_permission"},
	"roles.menu.MenuService":                                       {"system_menus", "menu_registry", "sys_menu", "tech_menu_items"},
	"roles.root_menu.RootMenuService":                              {"system_modules", "system_root_modules", "module_registry", "tech_root"},
	"users.roles.perm_actions.PermActionsService":                  {"system_actions", "permission_action_registry", "perm_action"},
	"users.roles.perm_fields.PermFieldsService":                    {"permission_field_registry", "perm_field"},
	"users.roles.perm_scopes.PermScopesService":                    {"permission_scope_registry", "perm_scope"},
	"users.roles.perm_resource_fields.PermResourceFieldsService":   {"permission_resource_registry", "perm_resource"},
	"users.roles.perm_resource_actions.PermResourceActionsService": {"permission_resource_registry", "perm_resource"},
	"users.roles.perm_resource_scopes.PermResourceScopesService":   {"permission_resource_registry", "perm_resource"},
}

func permissionPolicy(method string) ([]string, string, bool) {
	parts := strings.Split(strings.TrimPrefix(method, "/"), "/")
	if len(parts) != 2 {
		return nil, "", false
	}
	keys, protected := permissionMenus[parts[0]]
	if !protected {
		return nil, "", false
	}
	if parts[0] == "users.roles.role.RoleService" && strings.HasPrefix(parts[1], "RoleGroup") {
		keys = []string{"system_role_groups", "role_group", "role_management", "role_mgmt"}
	}
	operation := ""
	switch {
	case parts[0] == "users.auth.users.UsersService" && (parts[1] == "updatePasswords" || parts[1] == "UsersAuthUStatusAcc"):
		operation = "Edit"
	case strings.HasSuffix(parts[1], "Q"):
		operation = "View"
	case strings.HasSuffix(parts[1], "A"):
		operation = "Create"
	case strings.HasSuffix(parts[1], "U"):
		operation = "Edit"
	case strings.HasSuffix(parts[1], "D"):
		operation = "Delete"
	}
	if parts[0] == "users.roles.perm_actions.PermActionsService" && operation == "View" {
		keys = append(append([]string{}, keys...), permissionMenus["users.roles.role.RoleService"]...)
	}
	return keys, operation, true
}

func PermissionInterceptor(db *sqlx.DB) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		keys, operation, protected := permissionPolicy(info.FullMethod)
		if !protected {
			return handler(ctx, req)
		}
		if operation == "" {
			return nil, status.Error(codes.PermissionDenied, "no permission policy for operation")
		}
		userSeq := ctx.Value("user_seq")
		if userSeq == nil {
			return nil, status.Error(codes.Unauthenticated, "missing user identity")
		}
		if db == nil {
			return nil, status.Error(codes.Unavailable, "permission store unavailable")
		}
		// Compound actions are enforced as well as CRUD: explicit Search/Save
		// grants control querying/saving, with legacy fallback when undeclared.
		gate := ""
		if operation == "View" {
			gate = "SEARCH"
		}
		if operation == "Create" || operation == "Edit" {
			gate = "SAVE"
		}
		for _, menuKeys := range requestPermissionMenus(req, keys) {
			query := `WITH memberships AS (
				SELECT "GroupId" FROM "_ERPRolesUsers" WHERE "Type"='user' AND "UserSeq"=?
			) SELECT EXISTS (
				SELECT 1 FROM "_ERPRolesUsers" r JOIN "_ERPMenus" m ON m."Id"=r."MenuId"
				WHERE LOWER(TRIM(m."Key")) IN (?) AND r."GroupId" IN (SELECT "GroupId" FROM memberships)
				AND ((r."Type" IN ('menu','submenu','menuitem') AND r."` + operation + `"=TRUE)
					OR (r."Type"='action' AND UPPER(TRIM(r."Name")) IN (?,?) AND r."View"=TRUE))
				AND (NOT ? OR COALESCE((
					SELECT BOOL_OR(COALESCE(s."View",FALSE)) FROM "_ERPRolesUsers" s
					WHERE s."MenuId"=r."MenuId" AND s."GroupId" IN (SELECT "GroupId" FROM memberships)
					AND s."Type"='action' AND UPPER(TRIM(s."Name")) IN (?,?)
				), TRUE))
			)`
			query, args, err := sqlx.In(query, userSeq, menuKeys, strings.ToUpper(operation), "BTN_"+strings.ToUpper(operation), gate != "", gate, "BTN_"+gate)
			if err != nil {
				return nil, status.Error(codes.Internal, "permission query failed")
			}
			var allowed bool
			if err := db.GetContext(ctx, &allowed, db.Rebind(query), args...); err != nil {
				return nil, status.Error(codes.Unavailable, "permission lookup failed")
			}
			if !allowed {
				return nil, status.Error(codes.PermissionDenied, "operation is not permitted")
			}
		}
		return handler(ctx, req)
	}
}

// Unified Role APIs accept different sheets. Authorize every sheet in a mixed
// batch rather than letting a group-management grant modify user permissions.
func requestPermissionMenus(req interface{}, fallback []string) [][]string {
	group, assignment := false, false
	classify := func(sheet, kind string) {
		if strings.EqualFold(sheet, "group") || strings.EqualFold(sheet, "groups") || strings.EqualFold(kind, "group") {
			group = true
		} else {
			assignment = true
		}
	}
	switch request := req.(type) {
	case *pbRole.RoleARequest:
		for _, item := range request.GetResult() {
			classify(item.GetSheet(), item.GetType())
		}
	case *pbRole.RoleURequest:
		for _, item := range request.GetResult() {
			classify(item.GetSheet(), item.GetType())
		}
	case *pbRole.RoleDRequest:
		for _, item := range request.GetResult() {
			classify(item.GetSheet(), item.GetType())
		}
	case *pbRole.RoleQRequest:
		for _, filters := range []map[string]string{request.GetResult(), request.GetMetadata()} {
			for key, value := range filters {
				if !strings.EqualFold(key, "Sheet") && !strings.EqualFold(key, "Type") && !strings.EqualFold(key, "Target") {
					continue
				}
				if value == "" {
					continue
				}
				switch strings.ToLower(value) {
				case "group", "groups", "rolegroup":
					group = true
				default:
					assignment = true
				}
			}
		}
	default:
		return [][]string{fallback}
	}
	if !group && !assignment {
		return [][]string{fallback}
	}
	policies := make([][]string, 0, 2)
	if group {
		policies = append(policies, []string{"system_role_groups", "role_group", "role_management", "role_mgmt"})
	}
	if assignment || !group {
		policies = append(policies, permissionMenus["users.roles.role.RoleService"])
	}
	return policies
}
