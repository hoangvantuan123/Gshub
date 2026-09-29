package auth_auth

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// Login    POST /api/v2/acc/p2/login
func Login(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.login.LoginService/login")
}

// LoginApp POST /api/v2/acc/p2/loginApp
func LoginApp(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.login.LoginService/loginApp")
}

// ChangePass POST /api/v2/acc/p2/change-password
func ChangePass(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.login.LoginService/ChangePass")
}

// Logout POST /api/v2/acc/p2/logout
func Logout(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.login.LoginService/logout")
}

// LogLoginQ POST /api/v2/acc/LogLoginQ
func LogLoginQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.log_login.LogLoginService/LogLoginQ")
}

// LogLoginD POST /api/v2/acc/LogLoginD
func LogLoginD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.auth.log_login.LogLoginService/LogLoginD")
}
