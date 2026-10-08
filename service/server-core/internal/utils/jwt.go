package utils

import (
	"errors"
	"fmt"
	"server-core/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

// Claims phải match chính xác với key trong MapClaims của auth_service.go (hỗ trợ UserSeq dạng UUIDv7 string)
type Claims struct {
	UserId     string      `json:"UserId"`
	UserSeq    interface{} `json:"UserSeq"`
	EmpSeq     interface{} `json:"EmpSeq"`
	CompanySeq interface{} `json:"CompanySeq"`
	Login      string      `json:"Login"`
	jwt.RegisteredClaims
}

// VerifyToken decodes and validates the JWT token
func VerifyToken(tokenString string) (*Claims, error) {
	secret := config.Cfg.JwtSecret

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
