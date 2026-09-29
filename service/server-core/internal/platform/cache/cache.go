package cache

import (
	"context"
	"strings"
	"sync"
	"time"
)

type cacheItem struct {
	value     interface{}
	expiresAt time.Time
}

type MemoryCache struct {
	mu         sync.RWMutex
	items      map[string]cacheItem
	maxEntries int
}

var globalCache *MemoryCache
var once sync.Once

func GetCache() *MemoryCache {
	once.Do(func() {
		globalCache = &MemoryCache{
			items:      make(map[string]cacheItem),
			maxEntries: 5000, // Chặn trần tối đa 5,000 key cache (Giữ dung lượng RAM luôn dưới ~10MB)
		}
		go func() {
			ticker := time.NewTicker(1 * time.Minute)
			for range ticker.C {
				globalCache.mu.Lock()
				now := time.Now()
				for k, v := range globalCache.items {
					if now.After(v.expiresAt) {
						delete(globalCache.items, k)
					}
				}
				globalCache.mu.Unlock()
			}
		}()
	})
	return globalCache
}

func (c *MemoryCache) Get(ctx context.Context, key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(item.expiresAt) {
		return nil, false
	}

	return item.value, true
}

func (c *MemoryCache) Set(ctx context.Context, key string, val interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Chống phình RAM: Nếu số lượng key vượt quá maxEntries (5,000 keys), xả bớt 500 key hết hạn / cũ nhất
	if len(c.items) >= c.maxEntries {
		now := time.Now()
		evicted := 0
		for k, v := range c.items {
			if now.After(v.expiresAt) || evicted < 500 {
				delete(c.items, k)
				evicted++
			}
			if len(c.items) < c.maxEntries-500 {
				break
			}
		}
	}

	c.items[key] = cacheItem{
		value:     val,
		expiresAt: time.Now().Add(ttl),
	}
}

func (c *MemoryCache) DeletePrefix(ctx context.Context, prefix string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for k := range c.items {
		if strings.HasPrefix(k, prefix) {
			delete(c.items, k)
		}
	}
}
