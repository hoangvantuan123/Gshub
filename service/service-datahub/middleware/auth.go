package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"service-datahub/config"
	"service-datahub/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// BlacklistCache stores revoked tokens
type BlacklistCache struct {
	mu     sync.RWMutex
	tokens map[string]time.Time
}

var GlobalBlacklist = &BlacklistCache{
	tokens: make(map[string]time.Time),
}

func init() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			GlobalBlacklist.mu.Lock()
			now := time.Now()
			for token, exp := range GlobalBlacklist.tokens {
				if now.After(exp) {
					delete(GlobalBlacklist.tokens, token)
				}
			}
			GlobalBlacklist.mu.Unlock()
		}
	}()
}

func (b *BlacklistCache) Revoke(token string, exp time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.tokens[token] = exp
}

func (b *BlacklistCache) IsRevoked(token string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	exp, exists := b.tokens[token]
	if !exists {
		return false
	}
	if time.Now().After(exp) {
		return false
	}
	return true
}

// JwtAuthMiddleware validates the Bearer JWT token from Authorization header
func JwtAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Authorization header is required (Bearer token)",
				Code:    401,
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Invalid authorization format. Format: Bearer <token>",
				Code:    401,
			})
			return
		}

		tokenString := parts[1]

		// Check if token is in blacklist
		if GlobalBlacklist.IsRevoked(tokenString) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Token has been revoked. Please log in again.",
				Code:    401,
			})
			return
		}

		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Invalid or expired token",
				Code:    401,
			})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if userId, ok := claims["UserId"].(string); ok {
				c.Set("user_id", userId)
			}
			if login, ok := claims["Login"].(string); ok {
				c.Set("login", login)
			}
			if userSeq, ok := claims["UserSeq"].(string); ok {
				c.Set("user_seq", userSeq)
			}
			if companySeq, ok := claims["CompanySeq"].(float64); ok {
				c.Set("company_seq", int(companySeq))
			}
		}

		c.Set("access_token", tokenString)
		c.Next()
	}
}
