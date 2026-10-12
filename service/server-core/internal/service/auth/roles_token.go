package auth

import (
	"github.com/golang-jwt/jwt/v5"
	"server-core/internal/config"
	"time"
)

// A signed JWT protects integrity, not confidentiality. Never put the signing
// secret in the renderer. The login response must travel over HTTPS in production.
func signRolesSnapshot(userSeq string, data []map[string]interface{}, expiresAt time.Time) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"data": data, "sub": userSeq, "token_use": "permissions", "exp": expiresAt.Unix(),
	}).SignedString([]byte(config.Cfg.JwtSecret))
}
