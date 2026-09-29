package middleware

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

var knownBadBots = []string{
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
	"python-requests",
	"go-http-client",
	"curl/",
	"wget/",
	"libwww-perl",
	"lwp-",
	"scrapy",
	"mechanize",
	"httpclient",
}

func IsPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate()
}

// BotFilter blocks scanner tools, crawlers, and requests without user agent
func BotFilter(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if IsPrivateIP(ip) {
			c.Next()
			return
		}

		ua := strings.ToLower(c.Request.Header.Get("User-Agent"))

		if ua == "" {
			if log != nil {
				log.Warn("Blocked request: Empty User-Agent",
					zap.String("ip", ip),
					zap.String("path", c.Request.URL.Path),
				)
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success":    false,
				"error_code": "FORBIDDEN_CLIENT",
				"message":    "Thiếu thông tin User-Agent header.",
			})
			return
		}

		for _, bad := range knownBadBots {
			if strings.Contains(ua, bad) {
				if log != nil {
					log.Warn("Blocked malicious bot/scanner",
						zap.String("ip", ip),
						zap.String("ua", ua),
						zap.String("path", c.Request.URL.Path),
					)
				}
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"success":    false,
					"error_code": "BOT_DETECTED",
					"message":    "Truy cập bị từ chối.",
				})
				return
			}
		}

		c.Next()
	}
}
