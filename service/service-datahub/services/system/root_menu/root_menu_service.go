package root_menu

import (
	"database/sql"

	"go.uber.org/zap"
)

type RootMenuItem struct {
	Id            string `json:"Id"`
	RootMenuId    string `json:"RootMenuId"`
	RootMenuKey   string `json:"RootMenuKey"`
	Key           string `json:"Key"`
	RootMenuLabel string `json:"RootMenuLabel"`
	RootMenuName  string `json:"RootMenuName"`
	Label         string `json:"Label"`
	Name          string `json:"Name"`
	Link          string `json:"Link"`
	Icon          string `json:"Icon"`
	OrderSeq      int    `json:"OrderSeq"`
	IdxNo         int    `json:"IdxNo"`
	View          bool   `json:"View"`
	Utilities     bool   `json:"Utilities"`
	CreatedBy     string `json:"CreatedBy"`
	CreatedByName string `json:"CreatedByName"`
	CreatedAt     string `json:"CreatedAt"`
	UpdatedBy     string `json:"UpdatedBy"`
	UpdatedByName string `json:"UpdatedByName"`
	UpdatedAt     string `json:"UpdatedAt"`
	Rowversion    int64  `json:"Rowversion"`
	RowVersion    int64  `json:"RowVersion"`
}

type RootMenuService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewRootMenuService(db *sql.DB, logger *zap.Logger) *RootMenuService {
	return &RootMenuService{
		db:     db,
		logger: logger,
	}
}
