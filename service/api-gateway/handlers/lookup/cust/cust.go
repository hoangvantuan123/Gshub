package lookup_cust

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// CustLookQ (v2) -> CustH
func CustLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustH")
}

// CustTypeLookQ (v2) -> CustTypeH
func CustTypeLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustTypeH")
}

// CustTypeItemLookQ (v2) -> mapping to CustTypeH
func CustTypeItemLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustTypeH")
}

// PortLookQ (v2) -> PortH
func PortLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/PortH")
}

// CustH (v6)
func CustH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustH")
}

// CustTypeH (v6)
func CustTypeH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustTypeH")
}

// CustTypeItemH (v6) -> mapping to CustH
func CustTypeItemH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/CustH")
}

// CustUserItemH (v6) -> HelpCustH
func CustUserItemH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/HelpCustH")
}

// PortH (v6)
func PortH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.cust.help_cust.HelpCustService/PortH")
}
