package middleware

import (
	"context"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
)

type clientLimit struct {
	count     int
	lastReset time.Time
}

type MemoryRateLimiter struct {
	mu          sync.Mutex
	clients     map[string]*clientLimit
	maxRequests int
	window      time.Duration
}

var rateLimiter *MemoryRateLimiter
var once sync.Once

func GetRateLimiter() *MemoryRateLimiter {
	once.Do(func() {
		rateLimiter = &MemoryRateLimiter{
			clients:     make(map[string]*clientLimit),
			maxRequests: 30,              // Max 30 requests per minute
			window:      1 * time.Minute, // 1 minute window
		}

		// Cleanup expired entries periodically
		go func() {
			ticker := time.NewTicker(2 * time.Minute)
			for range ticker.C {
				rateLimiter.mu.Lock()
				now := time.Now()
				for ip, cl := range rateLimiter.clients {
					if now.Sub(cl.lastReset) > rateLimiter.window {
						delete(rateLimiter.clients, ip)
					}
				}
				rateLimiter.mu.Unlock()
			}
		}()
	})
	return rateLimiter
}

func (rl *MemoryRateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cl, exists := rl.clients[ip]
	if !exists || now.Sub(cl.lastReset) > rl.window {
		rl.clients[ip] = &clientLimit{
			count:     1,
			lastReset: now,
		}
		return true
	}

	if cl.count >= rl.maxRequests {
		return false
	}

	cl.count++
	return true
}

// RateLimitInterceptor limits the rate of incoming requests on public authentication endpoints
func RateLimitInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	// Only apply rate limiting to public endpoints (login, changepass)
	if isPublicMethod(info.FullMethod) {
		ip := getClientIP(ctx)
		if !GetRateLimiter().Allow(ip) {
			return nil, status.Errorf(codes.ResourceExhausted, "quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút")
		}
	}

	return handler(ctx, req)
}

func getClientIP(ctx context.Context) string {
	pr, ok := peer.FromContext(ctx)
	if ok && pr.Addr != nil {
		addr := pr.Addr.String()
		parts := strings.Split(addr, ":")
		if len(parts) > 0 {
			return parts[0]
		}
		return addr
	}
	return "unknown"
}
