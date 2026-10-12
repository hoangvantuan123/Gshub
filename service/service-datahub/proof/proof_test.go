package proof

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

func makeProof(t *testing.T, key *ecdsa.PrivateKey, token, jti string, iat int64) string {
	t.Helper()
	enc := base64.RawURLEncoding.EncodeToString
	header, _ := json.Marshal(map[string]any{"typ": "dpop+jwt", "alg": "ES256", "jwk": map[string]string{"kty": "EC", "crv": "P-256", "x": enc(key.X.FillBytes(make([]byte, 32))), "y": enc(key.Y.FillBytes(make([]byte, 32)))}})
	claims := map[string]any{"htm": "POST", "htu": "http://localhost/api/test", "iat": iat, "jti": jti}
	if token != "" {
		claims["ath"] = Hash(token)
	}
	body, _ := json.Marshal(claims)
	input := enc(header) + "." + enc(body)
	digest := sha256.Sum256([]byte(input))
	r, s, err := ecdsa.Sign(rand.Reader, key, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	return input + "." + enc(append(r.FillBytes(make([]byte, 32)), s.FillBytes(make([]byte, 32))...))
}
func TestProofBindsTokenKeyMethodURIAndRejectsReplay(t *testing.T) {
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	now := time.Now().Unix()
	raw := makeProof(t, key, "token-A", "unique-valid-proof-001", now)
	thumb, err := Verify(raw, "POST", "http://localhost/api/test", "token-A", "")
	if err != nil || thumb == "" {
		t.Fatal(err)
	}
	if _, err = Verify(raw, "POST", "http://localhost/api/test", "token-A", thumb); err == nil {
		t.Fatal("replay accepted")
	}
	for _, tc := range []struct{ method, uri, token, key string }{
		{"GET", "http://localhost/api/test", "token-A", thumb},
		{"POST", "http://localhost/api/other", "token-A", thumb},
		{"POST", "http://localhost/api/test", "token-B", thumb},
		{"POST", "http://localhost/api/test", "token-A", "another-key"},
	} {
		if _, err := Verify(makeProof(t, key, "token-A", "unique-mismatch-proof", now), tc.method, tc.uri, tc.token, tc.key); err == nil {
			t.Fatal("binding mismatch accepted")
		}
	}
	for _, iat := range []int64{now - 61, now + 6} {
		if _, err := Verify(makeProof(t, key, "token-A", "unique-time-proof-001", iat), "POST", "http://localhost/api/test", "token-A", thumb); err == nil {
			t.Fatal("invalid proof time accepted")
		}
	}
	if _, err := Verify("", "POST", "http://localhost/api/test", "token-A", thumb); err == nil {
		t.Fatal("missing proof accepted")
	}
	other, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if _, err := Verify(makeProof(t, other, "token-A", "unique-wrong-key-001", now), "POST", "http://localhost/api/test", "token-A", thumb); err == nil {
		t.Fatal("copied token with own key accepted")
	}
}
