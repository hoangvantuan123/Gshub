package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// ipLimiter lưu trữ trạng thái bộ giới hạn tốc độ (rate limiter) cho mỗi IP máy khách.
type ipLimiter struct {
	limiter *rate.Limiter
	lastSeen time.Time
}

// RateLimiter quản lý các bộ giới hạn token bucket theo từng IP.
type RateLimiter struct {
	mu    sync.Mutex
	visitors map[string]*ipLimiter
	r    rate.Limit // số token mỗi giây
	b    int    // kích thước burst (bùng phát)
}

func newRateLimiter(r rate.Limit, b int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*ipLimiter),
		r:    r,
		b:    b,
	}
	// Chạy ngầm goroutine: dọn dẹp các IP không hoạt động sau mỗi 3 phút
	go rl.cleanup(3 * time.Minute)
	return rl
}

func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.r, rl.b)
		rl.visitors[ip] = &ipLimiter{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (rl *RateLimiter) cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > interval {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// IsPrivateIP kiểm tra xem một địa chỉ IP có thuộc mạng nội bộ/cục bộ hay không.
func IsPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}
	// Kiểm tra loopback, link-local và các dải IP riêng tư (private ranges)
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
	}
	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

// RateLimit trả về một Middleware cho Gin áp dụng các mức giới hạn khác nhau cho IP Nội bộ và Bên ngoài.
//
// Mặc định:
// - Nội bộ (LAN): 100 req/s, burst 200
// - Bên ngoài (Internet): 30 req/s, burst 60
func RateLimit(log *zap.Logger) gin.HandlerFunc {
	// Tạo hai bộ giới hạn: một cho nội bộ và một cho bên ngoài
	internalRL := newRateLimiter(100, 200)
	externalRL := newRateLimiter(30, 60)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		var limiter *rate.Limiter

		isInternal := IsPrivateIP(ip)
		if isInternal {
			limiter = internalRL.getLimiter(ip)
		} else {
			limiter = externalRL.getLimiter(ip)
		}

		if !limiter.Allow() {
			log.Warn("️ vượt quá giới hạn tốc độ (rate limit exceeded)",
				zap.String("ip", ip),
				zap.Bool("internal", isInternal),
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
			)
			c.Header("Retry-After", "1")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":  "too_many_requests",
				"message": "Vượt quá giới hạn truy cập. Vui lòng thử lại sau.",
			})
			return
		}
		c.Next()
	}
}
