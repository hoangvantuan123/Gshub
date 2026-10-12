package auth

import (
	"github.com/golang-jwt/jwt/v5"
	"server-core/internal/config"
	"testing"
	"time"
)

func TestSignedLoginSnapshotPreservesEverySectionAndAction(t *testing.T) {
	previous := config.Cfg.JwtSecret
	config.Cfg.JwtSecret = "test-only-key"
	defer func() { config.Cfg.JwtSecret = previous }()
	sections := []map[string]interface{}{
		{"menu": []map[string]interface{}{{"MenuId": 302, "View": true, "actions": map[string]bool{"BTN_PRINT": true, "CUSTOM_APPROVE": true}}}},
		{"rootMenu": []map[string]interface{}{{"RootMenuId": 1}}},
		{"menuItem": []map[string]interface{}{}}, {"roleTable": []map[string]interface{}{}},
		{"action": []map[string]interface{}{{"MenuId": 302, "ActionKey": "BTN_PRINT", "Allow": true}}},
	}
	raw, err := signRolesSnapshot("u1", sections, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := jwt.Parse(raw, func(token *jwt.Token) (interface{}, error) { return []byte(config.Cfg.JwtSecret), nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid {
		t.Fatalf("invalid signature: %v", err)
	}
	claims := parsed.Claims.(jwt.MapClaims)
	if claims["sub"] != "u1" || claims["token_use"] != "permissions" {
		t.Fatal("snapshot not bound to user")
	}
	sectionsOut := claims["data"].([]interface{})
	if len(sectionsOut) != 5 {
		t.Fatal("incomplete login response")
	}
	menu := sectionsOut[0].(map[string]interface{})["menu"].([]interface{})[0].(map[string]interface{})
	actions := menu["actions"].(map[string]interface{})
	if actions["BTN_PRINT"] != true || actions["CUSTOM_APPROVE"] != true {
		t.Fatal("actions lost during signing")
	}
	_, err = jwt.Parse(raw, func(*jwt.Token) (interface{}, error) { return []byte("wrong-key"), nil })
	if err == nil {
		t.Fatal("tampered signing key was accepted")
	}
}
