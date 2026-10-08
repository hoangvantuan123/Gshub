# 📌 Ghi chú: Cấu hình IP & Trusted Proxy

## Bối cảnh

Hệ thống ERP có hai nhóm người dùng truy cập qua domain `erpsheet.vn`:

- **Nội bộ (LAN)**: dải `192.168.x.x`, `10.x.x.x`, `172.16.x.x`
- **Bên ngoài (Internet)**: IP public bất kỳ

Kiến trúc:
```
Internet user  ─┐
LAN user       ─┤→  Nginx (:443)  →  API Gateway Go (:8386)
                        ↑
                  proxy duy nhất (127.0.0.1)
```

---

## ⚠️ Bắt buộc phải làm trước khi lên production

### 1. Thêm vào `main.go` sau `r := gin.New()`

```go
// Trust Nginx (chạy cùng server → kết nối qua localhost)
r.SetTrustedProxies([]string{"127.0.0.1"})
```

> Nếu Nginx chạy trên máy khác thì thêm IP của máy Nginx đó vào list.
> Không được dùng `nil` (trust all) trong production — rủi ro giả mạo IP.

### 2. Nginx config phải có 2 header này

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP       $remote_addr;
```

---

## Phân biệt IP nội bộ vs bên ngoài trong code

Code hiện tại (`c.ClientIP()`) luôn trả về IP thật của user sau khi Nginx forward.
Có thể dùng hàm sau để phân loại:

```go
// isPrivateIP trả về true nếu IP thuộc dải nội bộ
func isPrivateIP(ip net.IP) bool {
    privateRanges := []string{
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
    }
    for _, cidr := range privateRanges {
        _, network, _ := net.ParseCIDR(cidr)
        if network.Contains(ip) {
            return true
        }
    }
    return false
}
```

### Ứng dụng thực tế: Rate limit khác nhau

```go
// IP nội bộ → rate limit cao hơn (100 req/s)
// IP bên ngoài → rate limit thấp hơn (30 req/s)
func AdaptiveRateLimit(log *zap.Logger) gin.HandlerFunc {
    internalLimiter := newRateLimiter(100, 200) // thoải mái hơn
    externalLimiter := newRateLimiter(30, 60)   // chặt hơn

    return func(c *gin.Context) {
        ip := net.ParseIP(c.ClientIP())
        var limiter *rate.Limiter
        if isPrivateIP(ip) {
            limiter = internalLimiter.getLimiter(c.ClientIP())
        } else {
            limiter = externalLimiter.getLimiter(c.ClientIP())
        }

        if !limiter.Allow() {
            log.Warn("rate limit exceeded", zap.String("ip", c.ClientIP()))
            c.AbortWithStatusJSON(429, gin.H{"error": "too_many_requests"})
            return
        }
        c.Next()
    }
}
```

### Ứng dụng thực tế: Bot filter bỏ qua LAN

```go
// Chỉ filter bot với IP bên ngoài, LAN tin tưởng hoàn toàn
if !isPrivateIP(net.ParseIP(c.ClientIP())) {
    // kiểm tra user-agent
}
```

---

## Tóm tắt checklist trước production

- [ ] `r.SetTrustedProxies(["127.0.0.1"])` trong `main.go`
- [ ] Nginx có `proxy_set_header X-Forwarded-For $remote_addr`
- [ ] Log IP mỗi request (đã có trong `middleware/logger.go`)
- [ ] Rate limit per-IP đang là 30 req/s — xem xét dùng `AdaptiveRateLimit` nếu cần
- [ ] Xóa `"*"` khỏi `AllowedOrigins` trong `config.go`
