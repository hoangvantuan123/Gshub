package lookup_basic

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// OrgLookQ (v2) -> OrgDeptH
func OrgLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgDeptH")
}

// OrgDeptH (v6)
func OrgDeptH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgDeptH")
}

// OrgEnterpriseH (v6)
func OrgEnterpriseH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgEnterpriseH")
}

// HelpDeptH (v6) -> mapping to OrgDeptH (no direct match found in proto)
func HelpDeptH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgDeptH")
}

// OrgProDeptH (v6)
func OrgProDeptH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgProDeptH")
}

// OrgProdLocationH (v6)
func OrgProdLocationH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgProdLocationH")
}

// OrgWorkCenterH (v6)
func OrgWorkCenterH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_org.HelpOrgService/OrgWorkCenterH")
}
