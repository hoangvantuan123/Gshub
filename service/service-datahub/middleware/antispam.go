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
	defaultRateLimit = rate.Limit(300) // 300 req/s recovery rate per client
	defaultBurst     = 600             // 600 requests burst
	banDuration      = 10 * time.Second
	maxViolations    = 50
	idleEvictTime    = 30 * time.Minute
)

// ClientSpamTracker tracks per-client rate and ban state
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

func makeClientKey(ip, authHeader string) string {
	if authHeader == "" {
		return ip
	}
	if len(authHeader) > 30 {
		authHeader = authHeader[:30]
	}
	return ip + ":" + authHeader
}

// AntiSpamMiddleware monitors high frequency request spamming and automatically bans spammers
func AntiSpamMiddleware(logger *zap.Logger) gin.HandlerFunc {
	protector.logger = logger

	return func(c *gin.Context) {
		// Bypass CORS Preflight and Health check
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		path := c.Request.URL.Path
		if path == "/health" || path == "/ping" || path == "/" {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		if clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "localhost" {
			c.Next()
			return
		}

		clientKey := makeClientKey(clientIP, c.GetHeader("Authorization"))
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
					limiter:  rate.NewLimiter(defaultRateLimit, defaultBurst),
					lastSeen: now,
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
					zap.String("client", clientKey),
					zap.Int("remaining_ban_sec", remainingSec),
					zap.String("path", path),
				)
			}

			if strings.Contains(c.GetHeader("Accept"), "text/html") {
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

		// Token bucket check
		if !tracker.limiter.Allow() {
			tracker.violations++

			// Auto ban after 5 consecutive violations
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

				if strings.Contains(c.GetHeader("Accept"), "text/html") {
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

			if strings.Contains(c.GetHeader("Accept"), "text/html") {
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

		if tracker.violations > 0 && time.Since(tracker.lastSeen) > 10*time.Second {
			tracker.violations = 0
		}
		tracker.mu.Unlock()

		c.Next()
	}
}
