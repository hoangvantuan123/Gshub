package utils

import (
	"github.com/golang-jwt/jwt/v5"
	"server-core/internal/config"
	"testing"
	"time"
)

func TestVerifyTokenRejectsPermissionTokensAndInvalidAccessTokens(t *testing.T) {
	previous := config.Cfg.JwtSecret
	config.Cfg.JwtSecret = "test-secret"
	t.Cleanup(func() { config.Cfg.JwtSecret = previous })
	for _, tc := range []struct {
		name   string
		method jwt.SigningMethod
		claims jwt.MapClaims
		valid  bool
	}{
		{"access", jwt.SigningMethodHS256, jwt.MapClaims{"UserId": "alice", "UserSeq": "u1", "exp": time.Now().Add(time.Hour).Unix()}, true},
		{"permissions", jwt.SigningMethodHS256, jwt.MapClaims{"data": []string{}, "exp": time.Now().Add(time.Hour).Unix()}, false},
		{"no expiration", jwt.SigningMethodHS256, jwt.MapClaims{"UserId": "alice", "UserSeq": "u1"}, false},
		{"expired", jwt.SigningMethodHS256, jwt.MapClaims{"UserId": "alice", "UserSeq": "u1", "exp": time.Now().Add(-time.Hour).Unix()}, false},
		{"wrong algorithm", jwt.SigningMethodHS384, jwt.MapClaims{"UserId": "alice", "UserSeq": "u1", "exp": time.Now().Add(time.Hour).Unix()}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token, err := jwt.NewWithClaims(tc.method, tc.claims).SignedString([]byte(config.Cfg.JwtSecret))
			if err != nil {
				t.Fatal(err)
			}
			_, err = VerifyToken(token)
			if (err == nil) != tc.valid {
				t.Fatalf("valid=%v, err=%v", tc.valid, err)
			}
		})
	}
}
