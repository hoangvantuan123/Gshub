package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"server-core/internal/config"
	"server-core/internal/proof"
	"testing"
	"time"
)

func sessionTestProof(t *testing.T, key *ecdsa.PrivateKey, token string) string {
	enc := base64.RawURLEncoding.EncodeToString
	header, _ := json.Marshal(map[string]any{"typ": "dpop+jwt", "alg": "ES256", "jwk": map[string]string{"kty": "EC", "crv": "P-256", "x": enc(key.X.FillBytes(make([]byte, 32))), "y": enc(key.Y.FillBytes(make([]byte, 32)))}})
	random := make([]byte, 24)
	rand.Read(random)
	c := map[string]any{"htm": "POST", "htu": "http://localhost/api/test", "iat": time.Now().Unix(), "jti": enc(random)}
	if token != "" {
		c["ath"] = proof.Hash(token)
	}
	body, _ := json.Marshal(c)
	input := enc(header) + "." + enc(body)
	digest := sha256.Sum256([]byte(input))
	r, s, _ := ecdsa.Sign(rand.Reader, key, digest[:])
	return input + "." + enc(append(r.FillBytes(make([]byte, 32)), s.FillBytes(make([]byte, 32))...))
}
func TestBoundSessionRejectsCopiedToken(t *testing.T) {
	old := config.Cfg.JwtSecret
	config.Cfg.JwtSecret = "test-session-secret"
	t.Cleanup(func() { config.Cfg.JwtSecret = old })
	t.Setenv("REQUIRE_SESSION_PROOF", "")
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	loginCtx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("dpop", sessionTestProof(t, key, ""), "dpop-htm", "POST", "dpop-htu", "http://localhost/api/test"))
	var thumb string
	_, err := AuthInterceptor(loginCtx, nil, &grpc.UnaryServerInfo{FullMethod: "/users.auth.login.LoginService/login"}, func(ctx context.Context, _ interface{}) (interface{}, error) {
		thumb = proof.SessionKey(ctx)
		return nil, nil
	})
	if err != nil || thumb == "" {
		t.Fatal("login proof not bound", err)
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"UserId": "alice", "UserSeq": "u1", "exp": time.Now().Add(time.Hour).Unix(), "cnf": map[string]string{"jkt": thumb}}).SignedString([]byte(config.Cfg.JwtSecret))
	invoke := func(raw string) error {
		ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+token, "dpop", raw, "dpop-htm", "POST", "dpop-htu", "http://localhost/api/test"))
		_, err := AuthInterceptor(ctx, nil, &grpc.UnaryServerInfo{FullMethod: "/roles.menu.MenuService/MenuQ"}, func(context.Context, interface{}) (interface{}, error) { return nil, nil })
		return err
	}
	if invoke("") == nil {
		t.Fatal("copied token without key accepted")
	}
	other, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if invoke(sessionTestProof(t, other, token)) == nil {
		t.Fatal("copied token signed by another key accepted")
	}
	raw := sessionTestProof(t, key, token)
	if err := invoke(raw); err != nil {
		t.Fatal("valid session denied", err)
	}
	if invoke(raw) == nil {
		t.Fatal("replay accepted")
	}
}
