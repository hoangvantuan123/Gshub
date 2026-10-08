package middleware

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// encEnvelope là cấu trúc payload mã hóa từ frontend gửi lên
type encEnvelope struct {
	P string `json:"p"` // payload encrypted (base64)
	V string `json:"v"` // iv (base64)
	T int64  `json:"t"` // timestamp unix
}

// deriveKey tạo AES-256 key từ JWT token (giống logic frontend)
func deriveKey(jwtToken string) []byte {
	mac := hmac.New(sha256.New, []byte(jwtToken))
	mac.Write([]byte("erp-payload-v1"))
	return mac.Sum(nil)[:32]
}

// DecryptRequest middleware: tự động giải mã request body nếu có header X-Enc: 1
func DecryptRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Chỉ xử lý request có đánh dấu encrypted
		if c.GetHeader("X-Enc") != "1" {
			c.Next()
			return
		}

		// Lấy JWT token
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Đọc encrypted envelope
		var env encEnvelope
		if err := c.ShouldBindJSON(&env); err != nil || env.P == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error":   "invalid_envelope",
				"message": "Định dạng dữ liệu không hợp lệ",
			})
			return
		}

		// Kiểm tra timestamp (chống replay: ±30 giây)
		if math.Abs(float64(time.Now().Unix()-env.T)) > 30 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error":   "request_expired",
				"message": "Yêu cầu đã hết hạn. Vui lòng thử lại.",
			})
			return
		}

		// Giải mã AES-GCM
		keyBytes := deriveKey(token)
		payload, err1 := base64.StdEncoding.DecodeString(env.P)
		iv, err2 := base64.StdEncoding.DecodeString(env.V)
		if err1 != nil || err2 != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "decode_error"})
			return
		}

		block, _ := aes.NewCipher(keyBytes)
		gcm, _ := cipher.NewGCM(block)
		plain, err := gcm.Open(nil, iv, payload, nil)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error":   "tampered",
				"message": "Dữ liệu bị thay đổi hoặc không hợp lệ.",
			})
			return
		}

		// Parse và lưu body sạch vào context
		var body map[string]interface{}
		if err := json.Unmarshal(plain, &body); err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_payload"})
			return
		}

		c.Set("decrypted_body", body)
		c.Next()
	}
}

// EncryptResponse mã hóa dữ liệu trước khi trả về client
// Gọi hàm này thay vì c.JSON() trong handler khi muốn encrypt response
func EncryptResponse(c *gin.Context, data interface{}) {
	// Lấy JWT để derive key
	authHeader := c.GetHeader("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(http.StatusOK, data)
		return
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")

	// Serialize data
	plain, err := json.Marshal(data)
	if err != nil {
		c.JSON(http.StatusOK, data)
		return
	}

	// Mã hóa AES-GCM
	keyBytes := deriveKey(token)
	block, _ := aes.NewCipher(keyBytes)
	gcm, _ := cipher.NewGCM(block)
	iv := make([]byte, gcm.NonceSize())
	rand.Read(iv)
	encrypted := gcm.Seal(nil, iv, plain, nil)

	c.JSON(http.StatusOK, gin.H{
		"p": base64.StdEncoding.EncodeToString(encrypted),
		"v": base64.StdEncoding.EncodeToString(iv),
		"t": time.Now().Unix(),
	})
}
