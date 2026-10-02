package middleware

import (
	"fmt"
	"net"
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
	numShards            = 64
	defaultQueryRate     = rate.Limit(30) // 30 req/s cho truy vấn thông thường
	defaultQueryBurst    = 50             // Burst 50 requests
	defaultMutationRate  = rate.Limit(8)  // 8 req/s cho các thao tác ghi (POST/PUT/DELETE/Save)
	defaultMutationBurst = 15             // Burst 15 requests
	banDuration          = 5 * time.Minute // Khóa 5 phút khi phát hiện spam dồn dập
	maxViolations        = 5               // Chỉ cho phép vi phạm tối đa 5 lần trước khi ban
	idleEvictTime        = 15 * time.Minute
)

// ClientSpamTracker tracks per-client rate and ban state
type ClientSpamTracker struct {
	mu              sync.Mutex
	queryLimiter    *rate.Limiter
	mutationLimiter *rate.Limiter
	violations      int
	bannedUntil     time.Time
	lastSeen        time.Time
}

type shard struct {
	sync.RWMutex
	clients map[string]*ClientSpamTracker
}

// AntiSpamProtector manages sharded rate limiting with zero lock contention
type AntiSpamProtector struct {
	shards [numShards]*shard
	logger *zap.Logger
}

var protector *AntiSpamProtector

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

	// Periodic cleanup of idle trackers
	go func() {
		ticker := time.NewTicker(3 * time.Minute)
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

func getRealIP(c *gin.Context) string {
	// 1. Check Cloudflare header
	if cfIP := strings.TrimSpace(c.GetHeader("CF-Connecting-IP")); cfIP != "" {
		return cfIP
	}
	// 2. Check X-Real-IP
	if realIP := strings.TrimSpace(c.GetHeader("X-Real-IP")); realIP != "" {
		return realIP
	}
	// 3. Check X-Forwarded-For
	if xff := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}
	// 4. Gin ClientIP
	return c.ClientIP()
}

// AntiSpamMiddleware monitors high frequency request spamming and automatically bans spammers
func AntiSpamMiddleware(logger *zap.Logger) gin.HandlerFunc {
	protector.logger = logger

	return func(c *gin.Context) {
		// Bypass CORS Preflight and Health check only
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		path := c.Request.URL.Path
		if path == "/health" || path == "/ping" || path == "/" {
			c.Next()
			return
		}

		clientIP := getRealIP(c)
		clientKey := clientIP

		now := time.Now()
		sh := protector.getShard(clientKey)

		// Read lock lookup
		sh.RLock()
		tracker, exists := sh.clients[clientKey]
		sh.RUnlock()

		if !exists {
			sh.Lock()
			tracker, exists = sh.clients[clientKey]
			if !exists {
				tracker = &ClientSpamTracker{
					queryLimiter:    rate.NewLimiter(defaultQueryRate, defaultQueryBurst),
					mutationLimiter: rate.NewLimiter(defaultMutationRate, defaultMutationBurst),
					lastSeen:        now,
				}
				sh.clients[clientKey] = tracker
			}
			sh.Unlock()
		}

		tracker.mu.Lock()
		tracker.lastSeen = now

		// Check if banned
		if now.Before(tracker.bannedUntil) {
			remainingSec := int(tracker.bannedUntil.Sub(now).Seconds())
			tracker.mu.Unlock()

			if logger != nil {
				logger.Warn("Blocked banned spammer",
					zap.String("ip", clientIP),
					zap.Int("remaining_ban_sec", remainingSec),
					zap.String("path", path),
				)
			}

			if strings.Contains(c.GetHeader("Accept"), "text/html") {
				c.AbortWithStatus(http.StatusTooManyRequests)
				return
			}

			c.Header("Retry-After", strconv.Itoa(remainingSec))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success":             false,
				"error_code":          "SPAM_AUTO_BANNED",
				"message":             fmt.Sprintf("Hệ thống phát hiện hành vi spam API. Kết nối của bạn bị tạm khóa trong %d giây.", remainingSec),
				"retry_after_seconds": remainingSec,
			})
			return
		}

		// Choose limiter based on HTTP method and path
		isMutation := c.Request.Method == http.MethodPost ||
			c.Request.Method == http.MethodPut ||
			c.Request.Method == http.MethodDelete ||
			strings.HasSuffix(path, "Save") ||
			strings.HasSuffix(path, "A") ||
			strings.HasSuffix(path, "U") ||
			strings.HasSuffix(path, "D") ||
			strings.Contains(path, "save")

		limiter := tracker.queryLimiter
		if isMutation {
			limiter = tracker.mutationLimiter
		}

		// Token bucket check
		if !limiter.Allow() {
			tracker.violations++

			// Auto ban after 5 consecutive violations
			if tracker.violations >= maxViolations {
				tracker.bannedUntil = now.Add(banDuration)
				tracker.violations = 0
				tracker.mu.Unlock()

				if logger != nil {
					logger.Error("CLIENT AUTO-BANNED DUE TO SEVERE SPAM",
						zap.String("ip", clientIP),
						zap.Duration("ban_duration", banDuration),
						zap.String("path", path),
					)
				}

				c.Header("Retry-After", "300")
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"success":             false,
					"error_code":          "SPAM_DETECTED_CIRCUIT_BREAK",
					"message":             "Cảnh báo: Tần suất gửi yêu cầu quá dồn dập. Hệ thống tự động khóa kết nối của bạn trong 5 phút.",
					"retry_after_seconds": 300,
				})
				return
			}

			tracker.mu.Unlock()

			c.Header("Retry-After", "2")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success":             false,
				"error_code":          "TOO_MANY_REQUESTS",
				"message":             "Vui lòng không thao tác quá nhanh, hãy chờ giây lát.",
				"retry_after_seconds": 2,
			})
			return
		}

		if tracker.violations > 0 && time.Since(tracker.lastSeen) > 10*time.Second {
			tracker.violations = 0
		}
		tracker.mu.Unlock()

		c.Next()
	}
}

