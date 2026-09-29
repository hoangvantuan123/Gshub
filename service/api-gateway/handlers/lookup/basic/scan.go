package lookup_basic

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// ScanGroupLookQ (v2) -> ScanGroupH
func ScanGroupLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_scan.HelpScanService/ScanGroupH")
}

// ScanUserLookQ (v2) -> ScanUserH
func ScanUserLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_scan.HelpScanService/ScanUserH")
}

// ScanGroupH (v6)
func ScanGroupH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_scan.HelpScanService/ScanGroupH")
}

// ScanUserH (v6)
func ScanUserH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.basic.help_scan.HelpScanService/ScanUserH")
}
