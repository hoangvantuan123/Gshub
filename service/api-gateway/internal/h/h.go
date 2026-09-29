package h

import (
	"strconv"

	"api-gateway/internal/caller"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/response"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Handle xử lý proxy HTTP -> gRPC bất đồng bộ thông qua Goroutine tự nhiên của Go
// Giải phóng hoàn toàn bottleneck worker pool 100 cứng, giúp hệ thống chịu tải hàng chục ngàn RPS
func Handle(pool *grpcclient.Pool, host, methodPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body map[string]interface{}
		_ = c.ShouldBindJSON(&body)
		if body == nil {
			body = make(map[string]interface{})
		}

		auth := c.GetHeader("Authorization")
		clientIP := c.ClientIP()
		requestID := c.GetString("requestID")

		// Đọc cấu hình timeout động từ client nếu có (ví dụ: Export Excel, Chạy giá thành)
		timeoutSec := 0
		if toHeader := c.GetHeader("X-Request-Timeout"); toHeader != "" {
			if s, err := strconv.Atoi(toHeader); err == nil && s > 0 {
				timeoutSec = s
			}
		}

		// Mượn kết nối từ gRPC Connection Pool (Multiplexing HTTP/2)
		conn, err := pool.Get(host)
		if err != nil {
			caller.Log.Error("gRPC connection pool get failed", zap.String("host", host), zap.Error(err))
			response.Error(c, "5000")
			return
		}

		// Gọi gRPC qua Goroutine tự nhiên kết hợp Context của request
		result := caller.Invoke(c.Request.Context(), conn, methodPath, body, auth, clientIP, requestID, timeoutSec)

		// Trả kết quả về cho client
		if !result.Success {
			response.JSON(c, result)
			return
		}

		response.JSON(c, result)
	}
}
