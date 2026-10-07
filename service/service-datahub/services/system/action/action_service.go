package action

import (
	"database/sql"

	"go.uber.org/zap"
)

type ActionItem struct {
	Id            string `json:"Id"`
	ActionKey     string `json:"ActionKey"`
	Key           string `json:"Key"`
	ActionName    string `json:"ActionName"`
	Name          string `json:"Name"`
	Description   string `json:"Description"`
	Icon          string `json:"Icon"`
	IdxNo         int    `json:"IdxNo"`
	Active        bool   `json:"Active"`
	CreatedBy     string `json:"CreatedBy"`
	CreatedByName string `json:"CreatedByName"`
	CreatedAt     string `json:"CreatedAt"`
	UpdatedBy     string `json:"UpdatedBy"`
	UpdatedByName string `json:"UpdatedByName"`
	UpdatedAt     string `json:"UpdatedAt"`
	Rowversion    int64  `json:"Rowversion"`
	RowVersion    int64  `json:"RowVersion"`
}

type ActionService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewActionService(db *sql.DB, logger *zap.Logger) *ActionService {
	return &ActionService{
		db:     db,
		logger: logger,
	}
}
