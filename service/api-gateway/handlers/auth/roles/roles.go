package auth_roles

import (
	"api-gateway/config"
	"api-gateway/internal/caller"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"
	"api-gateway/internal/proof"
	"api-gateway/internal/response"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"google.golang.org/grpc/metadata"
)

const defaultGatewaySessionAssertionSecret = "ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X"

func gatewaySessionAssertionSecret() string {
	if secret := os.Getenv("GATEWAY_SESSION_ASSERTION_SECRET"); secret != "" {
		return secret
	}
	return defaultGatewaySessionAssertionSecret
}

func signGatewaySessionAssertion(jkt, tokenHash, ts string) string {
	mac := hmac.New(sha256.New, []byte(gatewaySessionAssertionSecret()))
	mac.Write([]byte(jkt + "|" + tokenHash + "|" + ts))
	return hex.EncodeToString(mac.Sum(nil))
}

// Menus - proto package: roles.menu, service: MenuService
func MenuA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuA")
}
func MenuU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuU")
}
func MenuD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuD")
}
func MenuQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.menu.MenuService/MenuQ")
}

// Unified Role - proto package: users.roles.role, service: RoleService
func RoleA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleA")
}
func RoleU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleU")
}
func RoleD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleD")
}
func RoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleQ")
}
func RoleSaveBatch(pool *grpcclient.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body map[string]interface{}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(200, gin.H{"success": false, "message": "Payload lưu phân quyền không hợp lệ"})
			return
		}

		auth := c.GetHeader("Authorization")
		clientIP := c.ClientIP()
		requestID := c.GetString("requestID")
		ctx := c.Request.Context()
		timeoutSec := 0
		if toHeader := c.GetHeader("X-Request-Timeout"); toHeader != "" {
			if s, err := strconv.Atoi(toHeader); err == nil && s > 0 {
				timeoutSec = s
			}
		}

		if raw := c.GetHeader("DPoP"); raw != "" {
			scheme := "http"
			if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
				scheme = "https"
			}
			uri := scheme + "://" + c.Request.Host + c.Request.URL.EscapedPath()
			token := strings.TrimPrefix(auth, "Bearer ")
			jkt, err := proof.Verify(raw, c.Request.Method, uri, token, "")
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid session proof. Please log in again."})
				return
			}
			tokenHash := proof.Hash(token)
			ts := strconv.FormatInt(time.Now().Unix(), 10)
			ctx = metadata.NewOutgoingContext(ctx, metadata.Pairs(
				"x-gateway-session-jkt", jkt,
				"x-gateway-session-token-hash", tokenHash,
				"x-gateway-session-ts", ts,
				"x-gateway-session-signature", signGatewaySessionAssertion(jkt, tokenHash, ts),
			))
		}

		conn, err := pool.Get(config.Cfg.HostGRPCUser)
		if err != nil {
			caller.Log.Error("gRPC connection pool get failed", zap.String("host", config.Cfg.HostGRPCUser), zap.Error(err))
			response.Error(c, "5000")
			return
		}

		steps := []struct {
			key    string
			method string
		}{
			{key: "delete", method: "/users.roles.role.RoleService/RoleD"},
			{key: "insert", method: "/users.roles.role.RoleService/RoleA"},
			{key: "update", method: "/users.roles.role.RoleService/RoleU"},
		}

		result := make(map[string]interface{})
		total := 0
		for _, step := range steps {
			items, ok := body[step.key].([]interface{})
			if !ok || len(items) == 0 {
				result[step.key] = gin.H{"count": 0}
				continue
			}

			callBody := map[string]interface{}{"result": items}
			callResult := caller.Invoke(ctx, conn, step.method, callBody, auth, clientIP, requestID, timeoutSec)
			if !callResult.Success {
				c.JSON(200, gin.H{
					"success": false,
					"message": callResult.Message,
					"data": gin.H{
						"failedStep": step.key,
						"result":     result,
					},
				})
				return
			}

			total += len(items)
			result[step.key] = gin.H{
				"count": len(items),
				"data":  callResult.Data,
			}
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "Lưu phân quyền thành công",
			"data": gin.H{
				"total":  total,
				"result": result,
			},
		})
	}
}

// RoleUser - proto package: users.roles.role, service: RoleService
func RoleUserA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleA")
}
func RoleUserU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleU")
}
func RoleUserD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleD")
}
func RoleUserQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/UserRoleQ")
}
func MenuRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/MenuRoleQ")
}
func RootMenuRoleQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RootMenuRoleQ")
}

// RootMenu - proto package: roles.root_menu, service: RootMenuService
func RootMenuA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuA")
}
func RootMenuU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuU")
}
func RootMenuD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuD")
}
func RootMenuQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/roles.root_menu.RootMenuService/RootMenuQ")
}

// RoleGroup - proto package: users.roles.role, service: RoleService
func RoleGroupA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupA")
}
func RoleGroupU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupU")
}
func RoleGroupD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupD")
}
func RoleGroupQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.role.RoleService/RoleGroupQ")
}

// PermActions - proto package: users.roles.perm_actions, service: PermActionsService
func PermActionsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsA")
}
func PermActionsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsU")
}
func PermActionsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsD")
}
func PermActionsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_actions.PermActionsService/PermActionsQ")
}

// PermScopes - proto package: users.roles.perm_scopes, service: PermScopesService
func PermScopesA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesA")
}
func PermScopesU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesU")
}
func PermScopesD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesD")
}
func PermScopesQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_scopes.PermScopesService/PermScopesQ")
}

// PermFields - proto package: users.roles.perm_fields, service: PermFieldsService
func PermFieldsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsA")
}
func PermFieldsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsU")
}
func PermFieldsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsD")
}
func PermFieldsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_fields.PermFieldsService/PermFieldsQ")
}

// PermResourceFields - proto package: users.roles.perm_resource_fields, service: PermResourceFieldsService
func PermResourceFieldsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsA")
}
func PermResourceFieldsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsU")
}
func PermResourceFieldsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsD")
}
func PermResourceFieldsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_fields.PermResourceFieldsService/PermResourceFieldsQ")
}

// PermResourceActions - proto package: users.roles.perm_resource_actions, service: PermResourceActionsService
func PermResourceActionsA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsA")
}
func PermResourceActionsU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsU")
}
func PermResourceActionsD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsD")
}
func PermResourceActionsQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_actions.PermResourceActionsService/PermResourceActionsQ")
}

// PermResourceScopes - proto package: users.roles.perm_resource_scopes, service: PermResourceScopesService
func PermResourceScopesA(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesA")
}
func PermResourceScopesU(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesU")
}
func PermResourceScopesD(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesD")
}
func PermResourceScopesQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCUser, "/users.roles.perm_resource_scopes.PermResourceScopesService/PermResourceScopesQ")
}
