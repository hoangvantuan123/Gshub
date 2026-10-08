package auth_auth

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// UsersAuthA POST /api/v2/acc/UsersAuthA
func UsersAuthA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/UsersAuthA")
}

// UsersAuthU POST /api/v2/acc/UsersAuthU
func UsersAuthU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/UsersAuthU")
}

// UsersAuthD POST /api/v2/acc/UsersAuthD
func UsersAuthD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/UsersAuthD")
}

// UsersAuthQ POST /api/v2/acc/UsersAuthQ
func UsersAuthQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/UsersAuthQ")
}

// UsersAuthUStatusAcc POST /api/v2/acc/UsersAuthUStatusAcc
func UsersAuthUStatusAcc(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/UsersAuthUStatusAcc")
}

// UpdatePasswords POST /api/v2/acc/UPass2
func UpdatePasswords(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.users.UsersService/updatePasswords")
}
