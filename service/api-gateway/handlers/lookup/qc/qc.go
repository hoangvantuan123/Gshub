package lookup_qc

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// RegiQcLookQ (v2) -> RegiQcH
func RegiQcLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.qc.help_regi_qc.HelpRegiQcService/RegiQcH")
}

// RegiQcH (v6)
func RegiQcH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.qc.help_regi_qc.HelpRegiQcService/RegiQcH")
}
