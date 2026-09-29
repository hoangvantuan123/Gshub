package auth_system

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// SysAttrGroups - proto package: users.system.sys_attr_groups, service: SysAttrGroupsService
func SysAttrGroupsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_groups.SysAttrGroupsService/SysAttrGroupsA")
}
func SysAttrGroupsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_groups.SysAttrGroupsService/SysAttrGroupsU")
}
func SysAttrGroupsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_groups.SysAttrGroupsService/SysAttrGroupsD")
}
func SysAttrGroupsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_groups.SysAttrGroupsService/SysAttrGroupsQ")
}

// SysAttrItems - proto package: users.system.sys_attr_items, service: SysAttrItemsService
func SysAttrItemsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_items.SysAttrItemsService/SysAttrItemsA")
}
func SysAttrItemsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_items.SysAttrItemsService/SysAttrItemsU")
}
func SysAttrItemsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_items.SysAttrItemsService/SysAttrItemsD")
}
func SysAttrItemsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.system.sys_attr_items.SysAttrItemsService/SysAttrItemsQ")
}
