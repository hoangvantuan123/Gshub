package middleware

import (
	"github.com/gin-gonic/gin"
	"service-datahub/proof"
	"strings"
)

// Compatibility stage: validate proofs when present; legacy sessions stay usable.
func SessionProofContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		if raw := c.GetHeader("DPoP"); raw != "" {
			scheme := "http"
			if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
				scheme = "https"
			}
			token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
			key, err := proof.Verify(raw, c.Request.Method, scheme+"://"+c.Request.Host+c.Request.URL.EscapedPath(), token, "")
			if err != nil {
				c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid session proof"})
				return
			}
			c.Request = c.Request.WithContext(proof.WithVerified(c.Request.Context(), key, token))
		}
		c.Next()
	}
}
