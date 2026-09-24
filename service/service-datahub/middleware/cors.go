package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CorsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		reqHeaders := c.Request.Header.Get("Access-Control-Request-Headers")
		if reqHeaders != "" {
			c.Writer.Header().Set("Access-Control-Allow-Headers", reqHeaders)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Trace-ID, X-App-Timestamp, X-App-Signature, X-App-Nonce, X-Client-Platform, x-app-timestamp, x-app-signature, x-app-nonce, x-client-platform, x-request-timeout, x-device-id, x-config-key, x-platform, *")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE, HEAD")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Authorization, X-Trace-ID, *")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
