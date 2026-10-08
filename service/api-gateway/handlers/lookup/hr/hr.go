package lookup_hr

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// HrLookQ (v2) -> HrH
func HrLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.hr.help_hr.HelpHrService/HrH")
}

// HrH (v6)
func HrH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.hr.help_hr.HelpHrService/HrH")
}
