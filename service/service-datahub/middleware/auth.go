package middleware

import (
	"net/http"
	"strings"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
)

// SessionAuthMiddleware optionally checks if a user session is active
func SessionAuthMiddleware(loginService *services.LoginService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Authorization header is required",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ApiResponse{
				Success: false,
				Message: "Invalid authorization format. Format: Bearer <token>",
			})
			return
		}

		c.Set("access_token", parts[1])
		c.Next()
	}
}
