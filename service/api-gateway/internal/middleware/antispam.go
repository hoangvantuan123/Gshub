package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

const (
	numShards        = 64
	defaultRateLimit = rate.Limit(25) // Tốc độ hồi phục 25 req/s cho 1 client
	defaultBurst     = 50            // Cho phép dồn burst 50 reqs (phù hợp khi tải trang ERP nhiều widget)
	banDuration      = 3 * time.Minute
	maxViolations    = 5
	idleEvictTime    = 30 * time.Minute
)

// ClientSpamTracker theo dõi trạng thái spam của từng client
type ClientSpamTracker struct {
	mu          sync.Mutex
	limiter     *rate.Limiter
	violations  int
	bannedUntil time.Time
	lastSeen    time.Time
}

type shard struct {
	sync.RWMutex
	clients map[string]*ClientSpamTracker
}

// AntiSpamProtector quản lý Sharded Mutex chống nghẽn Lock toàn cục (Zero Lock Contention)
type AntiSpamProtector struct {
	shards [numShards]*shard
	logger *zap.Logger
}

var protector *AntiSpamProtector

// fnv32 băm khóa client siêu tốc không cấp phát bộ nhớ (Zero Allocation Hash)
func fnv32(key string) uint32 {
	hash := uint32(2166136261)
	for i := 0; i < len(key); i++ {
		hash ^= uint32(key[i])
		hash *= 16777619
	}
	return hash
}

func (p *AntiSpamProtector) getShard(key string) *shard {
	return p.shards[fnv32(key)%numShards]
}

func init() {
	protector = &AntiSpamProtector{}
	for i := 0; i < numShards; i++ {
		protector.shards[i] = &shard{
			clients: make(map[string]*ClientSpamTracker),
		}
	}

	// Tự động dọn dẹp bộ nhớ RAM theo từng Shard (Zero Latency Spike)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			now := time.Now()
			for i := 0; i < numShards; i++ {
				sh := protector.shards[i]
				sh.Lock()
				for k, v := range sh.clients {
					if now.After(v.bannedUntil) && time.Since(v.lastSeen) > idleEvictTime {
						delete(sh.clients, k)
					}
				}
				sh.Unlock()
			}
		}
	}()
}

// makeClientKey tạo khóa định danh duy nhất cho client tối ưu chuỗi
func makeClientKey(ip, authHeader string) string {
	if authHeader == "" {
		return ip
	}
	if len(authHeader) > 30 {
		authHeader = authHeader[:30]
	}
	return ip + ":" + authHeader
}

// AntiSpamMiddleware kiểm soát spam tần số cao và ngắt kết nối (Auto-Ban) tạm thời
func AntiSpamMiddleware(logger *zap.Logger) gin.HandlerFunc {
	protector.logger = logger

	return func(c *gin.Context) {
		// 1. Bỏ qua CORS Preflight (OPTIONS) và Health check ngay từ đầu
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		path := c.Request.URL.Path
		if path == "/health" || path == "/ping" || path == "/metrics" {
			c.Next()
			return
		}

		clientKey := makeClientKey(c.ClientIP(), c.GetHeader("Authorization"))
		now := time.Now()
		sh := protector.getShard(clientKey)

		// 2. Tra cứu tracker trong Shard (Đọc RLock cực nhanh)
		sh.RLock()
		tracker, exists := sh.clients[clientKey]
		sh.RUnlock()

		if !exists {
			sh.Lock()
			tracker, exists = sh.clients[clientKey]
			if !exists {
				tracker = &ClientSpamTracker{
					limiter:  rate.NewLimiter(defaultRateLimit, defaultBurst),
					lastSeen: now,
				}
				sh.clients[clientKey] = tracker
			}
			sh.Unlock()
		}

		tracker.mu.Lock()
		tracker.lastSeen = now

		// 3. Kiểm tra nếu client đang trong thời gian bị Auto-Ban
		if now.Before(tracker.bannedUntil) {
			remainingSec := int(tracker.bannedUntil.Sub(now).Seconds())
			tracker.mu.Unlock()

			if logger != nil {
				logger.Warn("Blocked banned spammer",
					zap.String("client", clientKey),
					zap.Int("remaining_ban_sec", remainingSec),
					zap.String("path", path),
				)
			}

			isBrowser := strings.Contains(c.GetHeader("Accept"), "text/html")
			if isBrowser {
				c.AbortWithStatus(http.StatusMethodNotAllowed)
				return
			}

			c.Header("Retry-After", strconv.Itoa(remainingSec))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success":             false,
				"error_code":          "SPAM_AUTO_BANNED",
				"message":             fmt.Sprintf("Hệ thống phát hiện hành vi spam API. Đã tạm khóa kết nối của bạn trong %d giây.", remainingSec),
				"retry_after_seconds": remainingSec,
			})
			return
		}

		// 4. Kiểm tra Token Bucket Rate Limit
		if !tracker.limiter.Allow() {
			tracker.violations++

			// Nếu vi phạm liên tiếp 5 lần -> Kích hoạt Auto-Ban 3 phút
			if tracker.violations >= maxViolations {
				tracker.bannedUntil = now.Add(banDuration)
				tracker.violations = 0
				tracker.mu.Unlock()

				if logger != nil {
					logger.Error("CLIENT AUTO-BANNED DUE TO SEVERE SPAM",
						zap.String("client", clientKey),
						zap.Duration("ban_duration", banDuration),
						zap.String("path", path),
					)
				}

				isBrowser := strings.Contains(c.GetHeader("Accept"), "text/html")
				if isBrowser {
					c.AbortWithStatus(http.StatusMethodNotAllowed)
					return
				}

				c.Header("Retry-After", "180")
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"success":             false,
					"error_code":          "SPAM_DETECTED_CIRCUIT_BREAK",
					"message":             "Cảnh báo: Thao tác gửi yêu cầu quá dồn dập. Hệ thống tự động ngắt kết nối trong 3 phút.",
					"retry_after_seconds": 180,
				})
				return
			}

			tracker.mu.Unlock()

			isBrowser := strings.Contains(c.GetHeader("Accept"), "text/html")
			if isBrowser {
				c.AbortWithStatus(http.StatusMethodNotAllowed)
				return
			}

			c.Header("Retry-After", "2")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success":             false,
				"error_code":          "TOO_MANY_REQUESTS",
				"message":             "Vui lòng không thao tác quá nhanh, hãy chờ giây lát.",
				"retry_after_seconds": 2,
			})
			return
		}

		// Reset vi phạm nếu đã lâu không tái phạm
		if tracker.violations > 0 && time.Since(tracker.lastSeen) > 10*time.Second {
			tracker.violations = 0
		}
		tracker.mu.Unlock()

		c.Next()
	}
}
