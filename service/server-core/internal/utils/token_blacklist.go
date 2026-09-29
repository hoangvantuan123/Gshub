package utils

import (
	"sync"
	"time"
)

// TokenBlacklist quản lý danh sách các JWT token đã bị thu hồi/đăng xuất
type TokenBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time // token -> expiration time
}

// GlobalBlacklist singleton instance
var GlobalBlacklist = NewTokenBlacklist()

func NewTokenBlacklist() *TokenBlacklist {
	tb := &TokenBlacklist{
		tokens: make(map[string]time.Time),
	}
	// Tự động dọn dẹp token hết hạn định kỳ mỗi 10 phút
	go tb.startCleaner(10 * time.Minute)
	return tb
}

// Revoke đưa một token vào danh sách bị thu hồi
func (b *TokenBlacklist) Revoke(token string, exp time.Time) {
	if token == "" {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	// Nếu không có exp hoặc exp đã qua, gán mặc định thời gian sống 8 giờ
	if exp.IsZero() || exp.Before(time.Now()) {
		exp = time.Now().Add(8 * time.Hour)
	}
	b.tokens[token] = exp
}

// IsRevoked kiểm tra xem token đã bị thu hồi chưa
func (b *TokenBlacklist) IsRevoked(token string) bool {
	if token == "" {
		return false
	}
	b.mu.RLock()
	defer b.mu.RUnlock()

	exp, exists := b.tokens[token]
	if !exists {
		return false
	}
	// Nếu đã quá thời hạn exp, token tự động coi như đã hết hạn
	if time.Now().After(exp) {
		return false
	}
	return true
}

func (b *TokenBlacklist) startCleaner(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		b.cleanup()
	}
}

func (b *TokenBlacklist) cleanup() {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	for token, exp := range b.tokens {
		if now.After(exp) {
			delete(b.tokens, token)
		}
	}
}
