package auth_lang

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// Lang - proto package: users.langs.langs, service: LangsService
func LangA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.langs.LangsService/LangA")
}
func LangU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.langs.LangsService/LangU")
}
func LangD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.langs.LangsService/LangD")
}
func LangQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.langs.LangsService/LangQ")
}

// Dict - proto package: users.langs.dicts, service: DictsService
func DictA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.dicts.DictsService/DictA")
}
func DictU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.dicts.DictsService/DictU")
}
func DictD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.dicts.DictsService/DictD")
}
func DictQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.langs.dicts.DictsService/DictQ")
}
