package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders attaches standard HTTP security headers (nosniff, DENY frame, XSS protection, hides server fingerprint)
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Server", "")
		c.Header("X-Powered-By", "")

		c.Next()
	}
}
