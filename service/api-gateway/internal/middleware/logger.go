package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger returns a Gin middleware that logs each request/response using zap.
func Logger(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		ip := c.ClientIP()

		log.Info("→ REQ",
			zap.String("ip", ip),
			zap.String("method", method),
			zap.String("path", path),
		)

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()
		log.Info("← RES",
			zap.String("ip", ip),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("duration", duration),
		)
	}
}
