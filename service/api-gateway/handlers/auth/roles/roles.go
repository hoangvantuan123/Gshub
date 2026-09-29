package auth_roles

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// Menus - proto package: roles.menu, service: MenuService
func MenuA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuA")
}
func MenuU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuU")
}
func MenuD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuD")
}
func MenuQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuQ")
}

// Unified Role - proto package: users.roles.role, service: RoleService
func RoleA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleA")
}
func RoleU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleU")
}
func RoleD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleD")
}
func RoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleQ")
}

// RoleUser - proto package: users.roles.role, service: RoleService
func RoleUserA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleA")
}
func RoleUserU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleU")
}
func RoleUserD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleD")
}
func RoleUserQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleQ")
}
func MenuRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/MenuRoleQ")
}
func RootMenuRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RootMenuRoleQ")
}

// RootMenu - proto package: roles.root_menu, service: RootMenuService
func RootMenuA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuA")
}
func RootMenuU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuU")
}
func RootMenuD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuD")
}
func RootMenuQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuQ")
}

// RoleGroup - proto package: users.roles.role, service: RoleService
func RoleGroupA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupA")
}
func RoleGroupU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupU")
}
func RoleGroupD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupD")
}
func RoleGroupQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupQ")
}

// PermActions - proto package: users.roles.perm_actions, service: PermActionsService
func PermActionsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsA")
}
func PermActionsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsU")
}
func PermActionsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsD")
}
func PermActionsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsQ")
}

// PermScopes - proto package: users.roles.perm_scopes, service: PermScopesService
func PermScopesA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesA")
}
func PermScopesU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesU")
}
func PermScopesD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesD")
}
func PermScopesQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesQ")
}

// PermFields - proto package: users.roles.perm_fields, service: PermFieldsService
func PermFieldsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsA")
}
func PermFieldsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsU")
}
func PermFieldsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsD")
}
func PermFieldsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsQ")
}

// PermResourceFields - proto package: users.roles.perm_resource_fields, service: PermResourceFieldsService
func PermResourceFieldsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsA")
}
func PermResourceFieldsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsU")
}
func PermResourceFieldsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsD")
}
func PermResourceFieldsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsQ")
}

// PermResourceActions - proto package: users.roles.perm_resource_actions, service: PermResourceActionsService
func PermResourceActionsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsA")
}
func PermResourceActionsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsU")
}
func PermResourceActionsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsD")
}
func PermResourceActionsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsQ")
}

// PermResourceScopes - proto package: users.roles.perm_resource_scopes, service: PermResourceScopesService
func PermResourceScopesA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesA")
}
func PermResourceScopesU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesU")
}
func PermResourceScopesD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesD")
}
func PermResourceScopesQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesQ")
}


