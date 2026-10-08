package lookup_basic

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// SizeLookQ (v2) -> SizeH
func SizeLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.other.help_other.HelpOtherService/SizeH")
}

// UnitLookQ (v2) -> UnitsH
func UnitLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.other.help_other.HelpOtherService/UnitsH")
}

// SizeH (v6)
func SizeH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.other.help_other.HelpOtherService/SizeH")
}

// UnitH (v6) -> UnitsH
func UnitH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.other.help_other.HelpOtherService/UnitsH")
}
