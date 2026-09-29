package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const requestIDHeader = "X-Request-ID"

// RequestID gắn một ID yêu cầu duy nhất cho mỗi yêu cầu đến.
// Nếu máy khách đã gửi sẵn header X-Request-ID, giá trị đó sẽ được sử dụng lại;
// nếu không, một ID ngẫu nhiên mới sẽ được tạo ra.
//
// ID được lưu trữ trong ngữ cảnh (context) của Gin với khóa "requestID" và 
// được trả lại trong tiêu đề phản hồi để hỗ trợ việc truy vết (tracing) phía máy khách.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(requestIDHeader)
		if id == "" {
			id = generateID()
		}
		c.Set("requestID", id)
		c.Header(requestIDHeader, id)
		c.Next()
	}
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
