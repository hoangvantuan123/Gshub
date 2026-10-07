package role_group

import (
	"database/sql"

	"go.uber.org/zap"
)

type RoleGroupItem struct {
	Id            string `json:"Id"`
	Name          string `json:"Name"`
	Comment       string `json:"Comment"`
	CreatedByName string `json:"CreatedByName"`
	IdxNo         int    `json:"IdxNo"`
	Status        string `json:"Status"`
	CreatedBy     string `json:"CreatedBy"`
	CreatedAt     string `json:"CreatedAt"`
	UpdatedBy     string `json:"UpdatedBy"`
	UpdatedAt     string `json:"UpdatedAt"`
	Rowversion    int64  `json:"Rowversion"`
	RowVersion    int64  `json:"RowVersion"`
}

type RoleGroupService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewRoleGroupService(db *sql.DB, logger *zap.Logger) *RoleGroupService {
	return &RoleGroupService{
		db:     db,
		logger: logger,
	}
}
