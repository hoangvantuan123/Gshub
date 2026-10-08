package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AppSecretKey: Khóa bí mật dùng để xác thực request chỉ phát sinh từ ElectronJS nội bộ
// Có thể cấu hình qua biến môi trường APP_SIGNATURE_SECRET
const DefaultAppSecretKey = "ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X"

type NonceCache struct {
	mu     sync.Mutex
	nonces map[string]time.Time
}

var nonceTracker = &NonceCache{
	nonces: make(map[string]time.Time),
}

func init() {
	// Dọn dẹp nonce cũ định kỳ 5 phút
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			nonceTracker.mu.Lock()
			now := time.Now()
			for k, exp := range nonceTracker.nonces {
				if now.After(exp) {
					delete(nonceTracker.nonces, k)
				}
			}
			nonceTracker.mu.Unlock()
		}
	}()
}

// renderUnauthorizedResponse trả về mã HTTP 405 (Method Not Allowed) để trình duyệt tự hiện trang mặc định "This page isn't working"
func renderUnauthorizedResponse(c *gin.Context, errorCode, message string) {
	acceptHeader := c.GetHeader("Accept")
	if bytes.Contains([]byte(acceptHeader), []byte("text/html")) {
		c.AbortWithStatus(http.StatusMethodNotAllowed) 
		return
	}

	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
		"success":    false,
		"error_code": errorCode,
		"message":    message,
	})
}

// AppSecurityMiddleware chặn tất cả các request không xuất phát từ ứng dụng chính chủ ElectronJS (Postman, cURL, v.v.)
func AppSecurityMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bỏ qua kiểm tra cho các endpoint công khai như Health Check hoặc OPTIONS (CORS Preflight)
		if c.Request.Method == http.MethodOptions || c.Request.URL.Path == "/health" {
			c.Next()
			return
		}

		clientSignature := c.GetHeader("X-App-Signature")
		timestampStr := c.GetHeader("X-App-Timestamp")
		nonce := c.GetHeader("X-App-Nonce")

		// 1. Kiểm tra sự tồn tại của các header bảo mật bắt buộc
		if clientSignature == "" || timestampStr == "" || nonce == "" {
			logger.Warn("Blocked unauthorized request: Missing security headers (Postman/Scanner detected)",
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
				zap.String("user_agent", c.Request.UserAgent()),
			)
			renderUnauthorizedResponse(c, "UNAUTHORIZED_CLIENT", "Yêu cầu bị từ chối: Chỉ chấp nhận truy cập từ ứng dụng ERP được xác thực.")
			return
		}

		// 2. Chống Replay Attack: Kiểm tra timestamp (cho phép phạm vi +- 300 giây ~ 5 phút để tránh ảnh hưởng do mạng lag hoặc đồng hồ máy client lệch)
		ts, err := strconv.ParseInt(timestampStr, 10, 64)
		if err != nil {
			renderUnauthorizedResponse(c, "INVALID_TIMESTAMP", "Chữ ký bảo mật không hợp lệ.")
			return
		}

		nowSec := time.Now().Unix()
		if ts < (nowSec-300) || ts > (nowSec+300) {
			logger.Warn("Request expired or clock out of sync",
				zap.Int64("client_ts", ts),
				zap.Int64("server_ts", nowSec),
			)
			renderUnauthorizedResponse(c, "REQUEST_EXPIRED", "Yêu cầu đã hết hạn bảo mật. Vui lòng kiểm tra lại đồng hồ hệ thống trên máy tính của bạn.")
			return
		}

		// 3. Chống Replay Attack: Kiểm tra Nonce đã dùng chưa
		nonceTracker.mu.Lock()
		if _, exists := nonceTracker.nonces[nonce]; exists {
			nonceTracker.mu.Unlock()
			logger.Warn("Replay attack detected: duplicate nonce", zap.String("nonce", nonce))
			renderUnauthorizedResponse(c, "REPLAY_DETECTED", "Phát hiện yêu cầu lặp lại trái phép.")
			return
		}
		nonceTracker.nonces[nonce] = time.Now().Add(5 * time.Minute)
		nonceTracker.mu.Unlock()

		// 4. Đọc body để xác thực HMAC
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			// Khôi phục lại body stream cho các middleware/handler phía sau đọc tiếp
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Tạo payload string để verify: Method + Path + Timestamp + Nonce + Body
		payloadToSign := c.Request.Method + "|" + c.Request.URL.Path + "|" + timestampStr + "|" + nonce + "|" + string(bodyBytes)

		mac := hmac.New(sha256.New, []byte(DefaultAppSecretKey))
		mac.Write([]byte(payloadToSign))
		expectedSignature := hex.EncodeToString(mac.Sum(nil))

		// So sánh chữ ký HMAC an toàn chống Timing Attack
		if !hmac.Equal([]byte(clientSignature), []byte(expectedSignature)) {
			logger.Warn("Invalid HMAC signature: Tampered payload or invalid client",
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			renderUnauthorizedResponse(c, "TAMPERED_REQUEST", "Dữ liệu yêu cầu không khớp hoặc chữ ký không hợp lệ.")
			return
		}

		c.Next()
	}
}
