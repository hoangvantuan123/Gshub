package utils

import (
	"sync/atomic"
	"time"
)

var lastVer atomic.Int64

// GenerateRowVersion generates a clean, JS-safe 13-digit millisecond timestamp RowVersion (~10ns).
// Guaranteed to be strictly monotonic and within JavaScript Number.MAX_SAFE_INTEGER.
func GenerateRowVersion() int64 {
	now := time.Now().UnixMilli()
	for {
		prev := lastVer.Load()
		next := now
		if next <= prev {
			next = prev + 1
		}
		if lastVer.CompareAndSwap(prev, next) {
			return next
		}
	}
}
