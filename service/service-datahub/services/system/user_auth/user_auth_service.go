package user_auth

import (
	"database/sql"
	"go.uber.org/zap"
)

type UserAuthService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewUserAuthService(db *sql.DB, logger *zap.Logger) *UserAuthService {
	return &UserAuthService{
		db:     db,
		logger: logger,
	}
}
