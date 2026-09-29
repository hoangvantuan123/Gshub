package middleware

import (
	"net"
	"net/http"

	"github.com/gin-gonic/gin"
)

// IPFilter blocks or allows requests based on IP address.
// Populate via environment or config — never hardcode in production.
//
// Usage (blacklist mode):
//
//	blockedIPs := []string{"1.2.3.4", "5.6.7.0/24"}
//	r.Use(middleware.IPBlacklist(blockedIPs))
func IPBlacklist(blocked []string) gin.HandlerFunc {
	nets := parseNets(blocked)

	return func(c *gin.Context) {
		clientIP := net.ParseIP(c.ClientIP())
		if clientIP == nil {
			c.Next()
			return
		}

		for _, n := range nets {
			if n.Contains(clientIP) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":   "forbidden",
					"message": "Your IP address has been blocked.",
				})
				return
			}
		}
		c.Next()
	}
}

// IPAllowlist only permits requests from the given IPs / CIDRs.
// All other IPs receive 403. Use this for internal/admin routes.
//
// Usage:
//
//	adminGroup := r.Group("/admin")
//	adminGroup.Use(middleware.IPAllowlist([]string{"10.0.0.0/8"}))
func IPAllowlist(allowed []string) gin.HandlerFunc {
	nets := parseNets(allowed)

	return func(c *gin.Context) {
		clientIP := net.ParseIP(c.ClientIP())
		if clientIP == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "forbidden",
			})
			return
		}

		for _, n := range nets {
			if n.Contains(clientIP) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Access not allowed from your IP address.",
		})
	}
}

// parseNets converts a slice of IP/CIDR strings into net.IPNet values.
// Plain IPs (without mask) are treated as /32 (IPv4) or /128 (IPv6).
func parseNets(entries []string) []*net.IPNet {
	var nets []*net.IPNet
	for _, entry := range entries {
		// Try CIDR first
		if _, ipNet, err := net.ParseCIDR(entry); err == nil {
			nets = append(nets, ipNet)
			continue
		}
		// Fall back to single IP
		if ip := net.ParseIP(entry); ip != nil {
			bits := 32
			if ip.To4() == nil {
				bits = 128
			}
			nets = append(nets, &net.IPNet{IP: ip, Mask: net.CIDRMask(bits, bits)})
		}
	}
	return nets
}
