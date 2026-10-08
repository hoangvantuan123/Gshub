package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery catches any panic in a handler and returns a 500 JSON response
// instead of crashing the server. Critical for production stability.
func Recovery(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered",
					zap.Any("error", r),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Lỗi máy chủ nội bộ (Internal Server Error)",
					"data":    nil,
				})
			}
		}()
		c.Next()
	}
}
