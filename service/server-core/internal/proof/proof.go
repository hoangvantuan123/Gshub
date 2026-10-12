package proof

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"strings"
	"sync"
	"time"
)

var seen = struct {
	sync.Mutex
	entries   map[string]int64
	cleanupAt int64
}{entries: map[string]int64{}}

func Hash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// Verify validates a P-256 proof, binds it to the request and token, and consumes its jti.
func Verify(raw, method, uri, token, expectedKey string) (string, error) {
	fail := func() (string, error) { return "", errors.New("invalid session proof") }
	if len(raw) > 8192 || method == "" || uri == "" {
		return fail()
	}
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return fail()
	}
	decode := base64.RawURLEncoding.DecodeString
	headerBytes, err := decode(parts[0])
	if err != nil {
		return fail()
	}
	var head struct {
		Alg string `json:"alg"`
		Typ string `json:"typ"`
		JWK struct {
			Kty string `json:"kty"`
			Crv string `json:"crv"`
			X   string `json:"x"`
			Y   string `json:"y"`
			D   string `json:"d"`
		} `json:"jwk"`
	}
	if json.Unmarshal(headerBytes, &head) != nil || head.Alg != "ES256" || head.Typ != "dpop+jwt" || head.JWK.Kty != "EC" || head.JWK.Crv != "P-256" || head.JWK.D != "" {
		return fail()
	}
	xb, err := decode(head.JWK.X)
	if err != nil || len(xb) != 32 {
		return fail()
	}
	yb, err := decode(head.JWK.Y)
	if err != nil || len(yb) != 32 {
		return fail()
	}
	x, y := new(big.Int).SetBytes(xb), new(big.Int).SetBytes(yb)
	if !elliptic.P256().IsOnCurve(x, y) {
		return fail()
	}
	sig, err := decode(parts[2])
	if err != nil || len(sig) != 64 {
		return fail()
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if !ecdsa.Verify(&ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}, digest[:], new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])) {
		return fail()
	}
	key := Hash(`{"crv":"P-256","kty":"EC","x":"` + head.JWK.X + `","y":"` + head.JWK.Y + `"}`)
	if expectedKey != "" && key != expectedKey {
		return fail()
	}
	body, err := decode(parts[1])
	if err != nil {
		return fail()
	}
	var claims struct {
		HTM string `json:"htm"`
		HTU string `json:"htu"`
		ATH string `json:"ath"`
		IAT int64  `json:"iat"`
		JTI string `json:"jti"`
	}
	if json.Unmarshal(body, &claims) != nil {
		return fail()
	}
	now := time.Now().Unix()
	if claims.HTM != method || claims.HTU != uri || claims.IAT < now-60 || claims.IAT > now+5 || len(claims.JTI) < 16 || len(claims.JTI) > 128 {
		return fail()
	}
	if token != "" {
		if claims.ATH != Hash(token) {
			return fail()
		}
	} else if claims.ATH != "" {
		return fail()
	}
	replayKey := key + ":" + claims.JTI
	seen.Lock()
	defer seen.Unlock()
	if now >= seen.cleanupAt {
		for k, expiry := range seen.entries {
			if expiry < now {
				delete(seen.entries, k)
			}
		}
		seen.cleanupAt = now + 30
	}
	if _, ok := seen.entries[replayKey]; ok {
		return fail()
	}
	if len(seen.entries) >= 100000 {
		return fail()
	}
	seen.entries[replayKey] = now + 66
	return key, nil
}
