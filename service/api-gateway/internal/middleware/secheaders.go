package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders thêm các tiêu đề (header) bảo mật HTTP tiêu chuẩn vào mỗi phản hồi,
// tương đương với gói "helmet" của Node.js.
//
// Bảo vệ chống lại: XSS, clickjacking, MIME sniffing, tiết lộ thông tin.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ngăn chặn MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Ngăn chặn Clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Bộ lọc XSS (cho các trình duyệt cũ hỗ trợ)
		c.Header("X-XSS-Protection", "1; mode=block")

		// Ép buộc HTTPS trong 1 năm (chỉ có ý nghĩa khi chạy qua TLS)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Không gửi Referer header sang origin khác
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Hạn chế các tài nguyên được phép tải
		c.Header("Content-Security-Policy", "default-src 'self'")

		// Từ chối Google's FLoC / Topics API
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Xóa thông tin máy chủ (ẩn thông tin runtime của Go)
		c.Header("Server", "")
		c.Header("X-Powered-By", "")

		c.Next()
	}
}
