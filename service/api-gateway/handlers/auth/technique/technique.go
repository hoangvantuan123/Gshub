package auth_technique

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// TblGrp - proto: users.technique.tbl_grp, service: TblGrpService
func TblGrpA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp.TblGrpService/TblGrpA")
}
func TblGrpU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp.TblGrpService/TblGrpU")
}
func TblGrpD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp.TblGrpService/TblGrpD")
}
func TblGrpQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp.TblGrpService/TblGrpQ")
}

// TblGrpItem - proto: users.technique.tbl_grp_item, service: TblGrpItemService
func TblGrpItemA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_item.TblGrpItemService/TblGrpItemA")
}
func TblGrpItemU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_item.TblGrpItemService/TblGrpItemU")
}
func TblGrpItemD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_item.TblGrpItemService/TblGrpItemD")
}
func TblGrpItemQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_item.TblGrpItemService/TblGrpItemQ")
}

// TblGrpPerm - proto: users.technique.tbl_grp_perm, service: TblGrpPermService
func TblGrpPermA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm.TblGrpPermService/TblGrpPermA")
}
func TblGrpPermU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm.TblGrpPermService/TblGrpPermU")
}
func TblGrpPermD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm.TblGrpPermService/TblGrpPermD")
}
func TblGrpPermQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm.TblGrpPermService/TblGrpPermQ")
}

// TblGrpPermRole - proto: users.technique.tbl_grp_perm_role, service: TblGrpPermRoleService
func TblGrpPermRoleA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm_role.TblGrpPermRoleService/TblGrpPermRoleA")
}
func TblGrpPermRoleU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm_role.TblGrpPermRoleService/TblGrpPermRoleU")
}
func TblGrpPermRoleD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm_role.TblGrpPermRoleService/TblGrpPermRoleD")
}
func TblGrpPermRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.technique.tbl_grp_perm_role.TblGrpPermRoleService/TblGrpPermRoleQ")
}
