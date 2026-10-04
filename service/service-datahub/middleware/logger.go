package middleware

import (
	"bytes"
	"fmt"
	"io"
	"strings"
	"time"

	"service-datahub/database"
	"service-datahub/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// auditLogChan is an async non-blocking queue for persisting audit logs
var auditLogChan = make(chan *models.AuditLog, 5000)

func init() {
	// Background worker to batch save audit logs to PostgreSQL
	go func() {
		batch := make([]*models.AuditLog, 0, 50)
		ticker := time.NewTicker(2 * time.Second)
		for {
			select {
			case item, ok := <-auditLogChan:
				if !ok {
					return
				}
				batch = append(batch, item)
				if len(batch) >= 50 {
					flushAuditLogs(batch)
					batch = make([]*models.AuditLog, 0, 50)
				}
			case <-ticker.C:
				if len(batch) > 0 {
					flushAuditLogs(batch)
					batch = make([]*models.AuditLog, 0, 50)
				}
			}
		}
	}()
}

func flushAuditLogs(batch []*models.AuditLog) {
	if database.DB == nil || len(batch) == 0 {
		return
	}
	err := database.DB.Create(&batch).Error
	if err != nil && strings.Contains(err.Error(), "AuditLog_pkey") {
		// Auto-resync PostgreSQL sequence and retry
		_ = database.DB.Exec(`
			SELECT setval(pg_get_serial_sequence('"AuditLog"', 'Id'), COALESCE((SELECT MAX("Id") FROM "AuditLog"), 0) + 1, false)
		`).Error
		_ = database.DB.Create(&batch).Error
	}
}

func LoggerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		method := c.Request.Method

		// Don't log spammy health check endpoints to DB
		isHealthCheck := path == "/health" || path == "/" || path == "/ping"

		// Read request body safely if not health check
		var bodyStr string
		if !isHealthCheck && c.Request.Body != nil && (method == "POST" || method == "PUT" || method == "DELETE") {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err == nil {
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				if len(bodyBytes) > 1000 {
					bodyStr = string(bodyBytes[:1000]) + "..."
				} else {
					bodyStr = string(bodyBytes)
				}
			}
		}

		c.Next()

		latency := time.Since(start)
		latencyMs := latency.Milliseconds()
		status := c.Writer.Status()
		clientIp := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// 1. Structured Console/File Logging
		if logger != nil {
			logger.Info("HTTP Request",
				zap.Int("status", status),
				zap.String("method", method),
				zap.String("path", path),
				zap.String("query", query),
				zap.String("ip", clientIp),
				zap.Duration("latency", latency),
				zap.String("user_agent", userAgent),
			)
		}

		// 2. Async Database Audit Logging for API calls
		if !isHealthCheck {
			username := ""
			if uid, ok := c.Get("user_id"); ok {
				username = fmt.Sprintf("%v", uid)
			} else if login, ok := c.Get("login"); ok {
				username = fmt.Sprintf("%v", login)
			} else if userSeq, ok := c.Get("user_seq"); ok {
				username = fmt.Sprintf("%v", userSeq)
			}

			traceId := c.GetHeader("X-App-Nonce")
			if traceId == "" {
				traceId = uuid.New().String()
			}

			reqPayload := bodyStr
			if query != "" {
				if reqPayload != "" {
					reqPayload = "Query: " + query + " | Body: " + reqPayload
				} else {
					reqPayload = "Query: " + query
				}
			}

			errMsg := ""
			if status >= 400 {
				errMsg = fmt.Sprintf("HTTP %d error on %s %s", status, method, path)
				if strings.Contains(strings.ToLower(userAgent), "axios") {
					errMsg += " [SUSPICIOUS_CLIENT: AXIOS_DETECTED]"
				}
			}

			auditItem := &models.AuditLog{
				TraceId:        traceId,
				ConfigKey:      "DATAHUB_API",
				Username:       username,
				Method:         method,
				Endpoint:       path,
				TargetUrl:      c.Request.RequestURI,
				StatusCode:     status,
				LatencyMs:      latencyMs,
				ClientIp:       clientIp,
				UserAgent:      userAgent,
				RequestPayload: reqPayload,
				ErrorMessage:   errMsg,
				CreatedAt:      time.Now(),
			}

			select {
			case auditLogChan <- auditItem:
			default:
				// Queue full, drop to prevent memory leak
			}
		}
	}
}
