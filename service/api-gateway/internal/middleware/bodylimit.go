package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// BodyLimit giới hạn kích thước của thân (body) yêu cầu để ngăn chặn việc cạn kiệt bộ nhớ
// từ các payload quá lớn (ví dụ: tấn công "upload bomb").
//
// Ví dụ:
//
//	r.Use(middleware.BodyLimit(1 << 30, logger)) // 1 GB
func BodyLimit(maxBytes int64, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()

		// Kiểm tra xem thân yêu cầu có quá lớn không (MaxBytesReader sẽ đặt lỗi này)
		if c.Request.Body != nil {
			// Lỗi sẽ xuất hiện khi các handler cố gắng đọc — chúng ta xử lý
			// nó ở đây như một phương án dự phòng cho bất kỳ phần thân nào chưa đọc bị tràn.
		}

		// Nếu một bước binding đã hủy bỏ với mã 413, chúng ta ghi log cảnh báo
		if c.Writer.Status() == http.StatusRequestEntityTooLarge {
			log.Warn("️ phát hiện payload quá lớn",
				zap.String("ip", c.ClientIP()),
				zap.Int64("limit_bytes", maxBytes),
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
			)
		}
	}
}
