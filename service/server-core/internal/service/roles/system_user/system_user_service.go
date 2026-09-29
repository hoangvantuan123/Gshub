package system_user

import (
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type SystemUsersService struct {
	db  *sqlx.DB
	log *zap.Logger
}

func NewSystemUsersService(db *sqlx.DB) *SystemUsersService {
	logger, _ := zap.NewDevelopment()
	return &SystemUsersService{
		db:  db,
		log: logger,
	}
}

type SystemUserQueryOptions struct {
	UserId   string   `json:"user_id"`
	UserName string   `json:"user_name"`
	PartSeq  *int     `json:"part_seq"`
	Select   []string `json:"select"`
	OrderBy  string   `json:"order_by"`
	Limit    int      `json:"limit"`
	Offset   int      `json:"offset"`
}
