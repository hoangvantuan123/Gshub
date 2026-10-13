package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"server-core/internal/proof"
	"server-core/internal/utils"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const defaultGatewaySessionAssertionSecret = "ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X"

func gatewaySessionAssertionSecret() string {
	if secret := os.Getenv("GATEWAY_SESSION_ASSERTION_SECRET"); secret != "" {
		return secret
	}
	return defaultGatewaySessionAssertionSecret
}

func validGatewaySessionAssertion(get func(string) string, token string, expectedJKT string) bool {
	jkt := get("x-gateway-session-jkt")
	tokenHash := get("x-gateway-session-token-hash")
	ts := get("x-gateway-session-ts")
	signature := get("x-gateway-session-signature")
	if jkt == "" || tokenHash == "" || ts == "" || signature == "" {
		return false
	}
	if jkt != expectedJKT || tokenHash != proof.Hash(token) {
		return false
	}
	tsInt, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return false
	}
	now := time.Now().Unix()
	if tsInt < now-60 || tsInt > now+5 {
		return false
	}
	mac := hmac.New(sha256.New, []byte(gatewaySessionAssertionSecret()))
	mac.Write([]byte(jkt + "|" + tokenHash + "|" + ts))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

// AuthInterceptor is a gRPC middleware to validate JWT tokens
func AuthInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	// Skip auth for public methods (e.g., Login, ChangePass)
	if isPublicMethod(info.FullMethod) {
		lower := strings.ToLower(info.FullMethod)
		if strings.HasSuffix(lower, "/login") || strings.HasSuffix(lower, "/loginuserb") || strings.HasSuffix(lower, "/loginapp") {
			md, _ := metadata.FromIncomingContext(ctx)
			get := func(k string) string {
				v := md.Get(k)
				if len(v) > 0 {
					return v[0]
				}
				return ""
			}
			if get("dpop") != "" {
				key, err := proof.Verify(get("dpop"), get("dpop-htm"), get("dpop-htu"), strings.TrimPrefix(get("authorization"), "Bearer "), "")
				if err != nil {
					return nil, status.Error(codes.Unauthenticated, "invalid login session proof")
				}
				ctx = proof.WithKey(ctx, key)
			} else if os.Getenv("REQUIRE_SESSION_PROOF") == "true" {
				return nil, status.Error(codes.Unauthenticated, "session proof required")
			}
		}
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

	if claims.Confirmation.JKT != "" {
		get := func(k string) string {
			v := md.Get(k)
			if len(v) > 0 {
				return v[0]
			}
			return ""
		}
		if get("dpop") != "" {
			if _, err := proof.Verify(get("dpop"), get("dpop-htm"), get("dpop-htu"), token, claims.Confirmation.JKT); err != nil {
				return nil, status.Error(codes.Unauthenticated, "invalid session proof")
			}
		} else if !validGatewaySessionAssertion(get, token, claims.Confirmation.JKT) {
			return nil, status.Error(codes.Unauthenticated, "invalid session proof")
		}
	} else if os.Getenv("REQUIRE_SESSION_PROOF") == "true" {
		return nil, status.Error(codes.Unauthenticated, "legacy session: please log in again")
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
