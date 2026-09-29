package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// knownBadBots là một danh sách các chuỗi con UA liên quan đến các trình quét (scanner) độc hại,
// công cụ lỗ hổng bảo mật và các trình thu thập dữ liệu (crawler) hung hăng.
var knownBadBots = []string{
	// Các công cụ quét lỗ hổng (vulnerability scanners)
	"sqlmap",
	"nikto",
	"nmap",
	"masscan",
	"zgrab",
	"nuclei",
	"acunetix",
	"nessus",
	"burpsuite",
	"dirbuster",
	"wfuzz",
	"hydra",
	// Các bộ công cụ tấn công chung
	"python-requests",
	"go-http-client",
	"curl/",
	"wget/",
	"libwww-perl",
	"lwp-",
	// Các công cụ thu thập dữ liệu (scrapers)
	"scrapy",
	"mechanize",
	"httpclient",
}

// BotFilter từ chối các yêu cầu có User-Agent trống hoặc User-Agent
// trùng khớp với các công cụ quét mã độc và công cụ tấn công đã biết.
//
// Các IP nội bộ được đưa vào danh sách trắng (whitelist) khỏi các kiểm tra này.
func BotFilter(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if IsPrivateIP(ip) {
			c.Next()
			return
		}

		ua := strings.ToLower(c.Request.Header.Get("User-Agent"))

		// Chặn nếu User-Agent trống
		if ua == "" {
			log.Warn("️ ngăn chặn truy cập: User-Agent trống",
				zap.String("ip", ip),
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
			)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":  "forbidden",
				"message": "Thiếu thông tin User-Agent header.",
			})
			return
		}

		// Chặn các Bot đã biết
		for _, bad := range knownBadBots {
			if strings.Contains(ua, bad) {
				log.Warn("️ ngăn chặn Bot/Scanner độc hại",
					zap.String("ip", ip),
					zap.String("ua", ua),
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":  "forbidden",
					"message": "Truy cập bị từ chối.",
				})
				return
			}
		}

		c.Next()
	}
}
