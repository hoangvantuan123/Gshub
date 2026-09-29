package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// DefaultAppSecretKey is the shared HMAC secret between ElectronJS client and DataHub
const DefaultAppSecretKey = "ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X"

type NonceCache struct {
	mu     sync.Mutex
	nonces map[string]time.Time
}

var nonceTracker = &NonceCache{
	nonces: make(map[string]time.Time),
}

func init() {
	// Periodic cleanup of expired nonces every 5 minutes
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

// AppSecurityMiddleware verifies HMAC-SHA256 signature, Nonce, Timestamp, and Client Platform headers
func AppSecurityMiddleware(logger *zap.Logger) gin.HandlerFunc {
	secretKey := os.Getenv("APP_SIGNATURE_SECRET")
	if secretKey == "" {
		secretKey = DefaultAppSecretKey
	}

	return func(c *gin.Context) {
		// Bypass check for CORS preflight, health checks, or public root
		if c.Request.Method == http.MethodOptions || c.Request.URL.Path == "/health" || c.Request.URL.Path == "/" {
			c.Next()
			return
		}

		clientSignature := c.GetHeader("X-App-Signature")
		timestampStr := c.GetHeader("X-App-Timestamp")
		nonce := c.GetHeader("X-App-Nonce")

		// 1. Check existence of mandatory security headers
		if clientSignature == "" || timestampStr == "" || nonce == "" {
			// In development mode, allow browser/Swagger testing if configured
			if os.Getenv("APP_ENV") == "development" && c.GetHeader("X-Dev-Bypass") == "true" {
				c.Next()
				return
			}

			if logger != nil {
				logger.Warn("Blocked unauthorized request: Missing security headers",
					zap.String("ip", c.ClientIP()),
					zap.String("path", c.Request.URL.Path),
					zap.String("user_agent", c.Request.UserAgent()),
				)
			}
			renderUnauthorizedResponse(c, "UNAUTHORIZED_CLIENT", "Yêu cầu bị từ chối: Chỉ chấp nhận truy cập từ ứng dụng ERP được xác thực.")
			return
		}

		// 2. Anti-Replay: Timestamp validation (allow +/- 300s / 5 minutes)
		ts, err := strconv.ParseInt(timestampStr, 10, 64)
		if err != nil {
			renderUnauthorizedResponse(c, "INVALID_TIMESTAMP", "Chữ ký bảo mật không hợp lệ.")
			return
		}

		nowSec := time.Now().Unix()
		if ts < (nowSec-300) || ts > (nowSec+300) {
			if logger != nil {
				logger.Warn("Request expired or clock out of sync",
					zap.Int64("client_ts", ts),
					zap.Int64("server_ts", nowSec),
				)
			}
			renderUnauthorizedResponse(c, "REQUEST_EXPIRED", "Yêu cầu đã hết hạn bảo mật. Vui lòng kiểm tra lại đồng hồ hệ thống trên máy tính của bạn.")
			return
		}

		// 3. Anti-Replay: Nonce check
		nonceTracker.mu.Lock()
		if _, exists := nonceTracker.nonces[nonce]; exists {
			nonceTracker.mu.Unlock()
			if logger != nil {
				logger.Warn("Replay attack detected: duplicate nonce", zap.String("nonce", nonce))
			}
			renderUnauthorizedResponse(c, "REPLAY_DETECTED", "Phát hiện yêu cầu lặp lại trái phép.")
			return
		}
		nonceTracker.nonces[nonce] = time.Now().Add(5 * time.Minute)
		nonceTracker.mu.Unlock()

		// 4. Read body to verify HMAC
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			// Restore request body for downstream handlers
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Signature payload format: Method + "|" + Path + "|" + Timestamp + "|" + Nonce + "|" + Body
		payloadToSign := c.Request.Method + "|" + c.Request.URL.Path + "|" + timestampStr + "|" + nonce + "|" + string(bodyBytes)

		mac := hmac.New(sha256.New, []byte(secretKey))
		mac.Write([]byte(payloadToSign))
		expectedSignature := hex.EncodeToString(mac.Sum(nil))

		// Constant-time HMAC comparison
		if !hmac.Equal([]byte(clientSignature), []byte(expectedSignature)) {
			if logger != nil {
				logger.Warn("Invalid HMAC signature: Tampered payload or invalid client",
					zap.String("ip", c.ClientIP()),
					zap.String("path", c.Request.URL.Path),
				)
			}
			renderUnauthorizedResponse(c, "TAMPERED_REQUEST", "Dữ liệu yêu cầu không khớp hoặc chữ ký không hợp lệ.")
			return
		}

		c.Next()
	}
}
