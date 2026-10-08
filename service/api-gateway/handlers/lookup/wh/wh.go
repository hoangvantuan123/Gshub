package lookup_wh

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// ItemLookQ (v2) -> ItemsH
func ItemLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_item.HelpItemService/ItemsH")
}

// LocationLookQ (v2) -> LocationsH
func LocationLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_location.HelpLocationService/LocationsH")
}

// WHLookQ (v2) -> WHsH
func WHLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_wh.HelpWHService/WHsH")
}

// ZoneLookQ (v2) -> ZonesH
func ZoneLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_zone.HelpZoneService/ZonesH")
}

// WHsH (v6)
func WHsH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_wh.HelpWHService/WHsH")
}

// ItemH (v6) -> ItemsH
func ItemH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_item.HelpItemService/ItemsH")
}

// LocationH (v6) -> LocationsH
func LocationH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_location.HelpLocationService/LocationsH")
}

// ZoneH (v6) -> ZonesH
func ZoneH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.wh.help_zone.HelpZoneService/ZonesH")
}
