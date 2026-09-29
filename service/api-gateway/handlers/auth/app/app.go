package auth_app

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// Screens - proto package: users.app.screens, service: ScreensService
func ScreenA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.screens.ScreensService/ScreensA")
}
func ScreenU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.screens.ScreensService/ScreensU")
}
func ScreenD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.screens.ScreensService/ScreensD")
}
func ScreenQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.screens.ScreensService/ScreensQ")
}

// Tabs - proto package: users.app.tabs, service: TabsService
func TabA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.tabs.TabsService/TabsA")
}
func TabU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.tabs.TabsService/TabsU")
}
func TabD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.tabs.TabsService/TabsD")
}
func TabQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.tabs.TabsService/TabsQ")
}

// GroupRole - proto package: users.app.group_role, service: AppGroupRoleService
func GroupRoleA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.group_role.AppGroupRoleService/AppGroupRoleA")
}
func GroupRoleU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.group_role.AppGroupRoleService/AppGroupRoleU")
}
func GroupRoleD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.group_role.AppGroupRoleService/AppGroupRoleD")
}
func GroupRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.group_role.AppGroupRoleService/AppGroupRoleQ")
}

// UserRole - proto package: users.app.user_role, service: AppUserRoleService
func UserRoleA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.user_role.AppUserRoleService/AppUserRoleA")
}
func UserRoleU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.user_role.AppUserRoleService/AppUserRoleU")
}
func UserRoleD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.user_role.AppUserRoleService/AppUserRoleD")
}
func UserRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.app.user_role.AppUserRoleService/AppUserRoleQ")
}
