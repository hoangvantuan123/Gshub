package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	domain "server-core/internal/models/system"
	"server-core/internal/service/system"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// LoggingInterceptor captures detailed audit logs for every gRPC call
func LoggingInterceptor(auditSvc *system.AuditLogService) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		// 1. Execute the handler
		resp, err := handler(ctx, req)

		// 2. Measure speed
		duration := time.Since(start).Milliseconds()

		// 3. Prepare Log Entry
		entry := domain.ERPSysFullAuditLog{
			UrlPath:    info.FullMethod,
			DurationMs: duration,
			CreatedAt:  time.Now(),
		}

		// Detect Service and Method Name
		parts := strings.Split(info.FullMethod, "/")
		if len(parts) > 0 {
			entry.MethodName = parts[len(parts)-1]
		}
		if len(parts) > 1 {
			entry.ServiceName = parts[len(parts)-2]
		}

		// Detect Action Type (A, U, D, Q, L)
		entry.ActionType = detectActionType(entry.MethodName)

		// Extract Request Data
		reqJSON, _ := json.Marshal(req)
		entry.RequestData = string(reqJSON)

		// Extract User Info from context (set by AuthInterceptor)
		if userSeq, ok := ctx.Value("user_seq").(string); ok {
			entry.UserSeq = userSeq
		} else if userSeqInt, ok := ctx.Value("user_seq").(int); ok {
			entry.UserSeq = userSeqInt
		}
		if userID, ok := ctx.Value("user_id").(string); ok {
			entry.UserLogin = userID
		}

		// Extract Token, IP and Device Metadata from Metadata
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			if tokens := md.Get("authorization"); len(tokens) > 0 {
				entry.Token = tokens[0]
			}
			if ips := md.Get("x-forwarded-for"); len(ips) > 0 {
				entry.ClientIp = ips[0]
			}
			if web := md.Get("x-device-info-web"); len(web) > 0 {
				ctx = context.WithValue(ctx, "device_info_web", web[0])
			}
			if soft := md.Get("x-device-info-soft"); len(soft) > 0 {
				ctx = context.WithValue(ctx, "device_info_soft", soft[0])
			}
			if app := md.Get("x-device-info-app"); len(app) > 0 {
				ctx = context.WithValue(ctx, "device_info_app", app[0])
			}
			if platform := md.Get("x-platform-status"); len(platform) > 0 {
				ctx = context.WithValue(ctx, "platform_status", platform[0])
			}
			if clientIp := md.Get("x-forwarded-for"); len(clientIp) > 0 {
				ctx = context.WithValue(ctx, "client_ip", clientIp[0])
			}
			if reqIDs := md.Get("x-request-id"); len(reqIDs) > 0 {
				ctx = context.WithValue(ctx, "request_id", reqIDs[0])
			}
		}

		// Extract Status
		if err != nil {
			st, _ := status.FromError(err)
			entry.StatusCode = int(st.Code())
			entry.StatusMsg = st.Message()
			entry.ResponseData = fmt.Sprintf("{\"error\": %q}", err.Error())
		} else {
			entry.StatusCode = 200 // Success
			entry.StatusMsg = "Success"
			respJSON, _ := json.Marshal(resp)
			entry.ResponseData = string(respJSON)
		}

		// 4. Write Log Asynchronously (Only for A, U, D, L)
		if entry.ActionType == "A" || entry.ActionType == "U" || entry.ActionType == "D" || entry.ActionType == "L" {
			if auditSvc != nil {
				auditSvc.WriteLog(entry)
			}
		}

		// 5. Console Monitoring Log
		if auditSvc != nil && auditSvc.Logger() != nil {
			auditSvc.Logger().Info("[gRPC API EXECUTED]",
				zap.String("method", entry.MethodName),
				zap.String("action", entry.ActionType),
				zap.Int("status", entry.StatusCode),
				zap.Int64("duration_ms", duration),
				zap.String("login", entry.UserLogin),
				zap.String("client_ip", entry.ClientIp),
			)
		}

		return resp, err
	}
}

func detectActionType(methodName string) string {
	m := strings.ToUpper(methodName)
	if strings.Contains(m, "LOGIN") {
		return "L"
	}
	if strings.HasSuffix(m, "A") {
		return "A"
	}
	if strings.HasSuffix(m, "U") {
		return "U"
	}
	if strings.HasSuffix(m, "D") {
		return "D"
	}
	if strings.HasSuffix(m, "Q") {
		return "Q"
	}
	return "O" // Other
}
