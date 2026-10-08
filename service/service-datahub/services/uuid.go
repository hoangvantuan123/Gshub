package services

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"time"
)

// GenerateUUIDv7 generates a time-sortable UUID v7 string
func GenerateUUIDv7() string {
	var value [16]byte
	now := uint64(time.Now().UnixMilli())

	value[0] = byte(now >> 40)
	value[1] = byte(now >> 32)
	value[2] = byte(now >> 24)
	value[3] = byte(now >> 16)
	value[4] = byte(now >> 8)
	value[5] = byte(now)

	_, _ = rand.Read(value[6:])

	// Set version 7 (0111)
	value[6] = (value[6] & 0x0f) | 0x70
	// Set variant 2 (10xx)
	value[8] = (value[8] & 0x3f) | 0x80

	return fmt.Sprintf("%x-%x-%x-%x-%x",
		value[0:4],
		value[4:6],
		value[6:8],
		value[8:10],
		value[10:16],
	)
}

func GenerateShortID(prefix string) string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%s_%d%x", prefix, time.Now().Unix(), binary.BigEndian.Uint32(b[:]))
}
