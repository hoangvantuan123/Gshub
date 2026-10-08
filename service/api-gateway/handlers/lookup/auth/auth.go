package lookup_auth

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// AuthLookQ (v2) - using MenuH as default auth lookup
func AuthLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// MenuH (v6)
func MenuH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// RootMenuH (v6)
func RootMenuH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// UsersH (v6)
func UsersH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// SubMenuH (v6)
func SubMenuH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// LangDictH (v6)
func LangDictH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// LangH (v6)
func LangH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.langs.LangsService/LangQ")
}

// DictVersionQ (v6)
func DictVersionQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.dicts.DictsService/DictQ")
}






