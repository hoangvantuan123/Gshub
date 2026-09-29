package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// BodyLimit limits the request body size to prevent memory exhaustion
func BodyLimit(maxBytes int64, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()

		if c.Writer.Status() == http.StatusRequestEntityTooLarge {
			if log != nil {
				log.Warn("Payload too large detected",
					zap.String("ip", c.ClientIP()),
					zap.Int64("limit_bytes", maxBytes),
					zap.String("path", c.Request.URL.Path),
				)
			}
		}
	}
}
