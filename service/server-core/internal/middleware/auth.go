package middleware

import (
	"context"
	"server-core/internal/utils"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// AuthInterceptor is a gRPC middleware to validate JWT tokens
func AuthInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	// Skip auth for public methods (e.g., Login, ChangePass)
	if isPublicMethod(info.FullMethod) {
		return handler(ctx, req)
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "metadata is not provided")
	}

	authHeader := md["authorization"]
	if len(authHeader) == 0 || authHeader[0] == "" {
		return nil, status.Errorf(codes.Unauthenticated, "authorization token is not provided")
	}

	// Expecting "Bearer <token>"
	token := strings.TrimPrefix(authHeader[0], "Bearer ")

	// Kiểm tra nếu Token đã bị thu hồi (Blacklist / Đã đăng xuất)
	if utils.GlobalBlacklist.IsRevoked(token) {
		return nil, status.Errorf(codes.Unauthenticated, "token has been revoked or logged out")
	}

	claims, err := utils.VerifyToken(token)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid token: %v", err)
	}

	// Add claims to context for use in handlers
	newCtx := context.WithValue(ctx, "user_seq", claims.UserSeq)
	newCtx = context.WithValue(newCtx, "user_id", claims.UserId)

	return handler(newCtx, req)
}

func isPublicMethod(method string) bool {
	publicMethods := []string{
		"/users.auth.login.loginservice/login",
		"/users.auth.login.loginservice/loginapp",
		"/users.auth.login.loginservice/changepass",
		"/users.auth.login.loginservice/logout",
		"/users.auth.login.loginservice/loginuserb",
		"/users.langs.dicts.dictsservice/dictq",
		"/users.langs.dicts.dictsservice/dictversionq",
		"/users.langs.langs.langsservice/langq",
	}

	lowerMethod := strings.ToLower(method)
	for _, m := range publicMethods {
		if lowerMethod == m {
			return true
		}
	}
	return false
}