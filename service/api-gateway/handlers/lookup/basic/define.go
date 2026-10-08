package lookup_basic

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// DefineLookQ (v2) -> OrgDefineH
func DefineLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_define.HelpDefineService/OrgDefineH")
}

// DefineItemLookQ (v2) -> OrgDefineItemH
func DefineItemLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_define.HelpDefineService/OrgDefineItemH")
}

// CodeHelpItemH (v6)
func CodeHelpItemH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_define.HelpDefineService/OrgCodeHelpDefineItemH")
}

// HelpDefineItemAppH (v6)
func HelpDefineItemAppH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_define.HelpDefineService/HelpDefineItemAppH")
}
