package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS sets the necessary headers to allow cross-origin requests.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if originSet["*"] || originSet[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-App-Signature, X-App-Timestamp, X-App-Nonce, X-Client-Platform, X-Request-ID, X-Request-Id, X-Request-Timeout")
		c.Header("Access-Control-Expose-Headers", "X-Request-ID, X-Request-Id, Content-Disposition")
		c.Header("Access-Control-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
