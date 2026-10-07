package menu

import (
	"database/sql"

	"go.uber.org/zap"
)

type MenuItem struct {
	Id            string `json:"Id"`
	MenuKey       string `json:"MenuKey"`
	Key           string `json:"Key"`
	MenuSubRootId string `json:"MenuSubRootId"`
	MenuRootId    string `json:"MenuRootId"`
	MenuRootName  string `json:"MenuRootName"`
	RootMenuName  string `json:"RootMenuName,omitempty"`
	MenuSubRootName string `json:"MenuSubRootName"`
	SubMenuName   string `json:"SubMenuName,omitempty"`
	MenuLabel     string `json:"MenuLabel"`
	Label         string `json:"Label"`
	MenuLink      string `json:"MenuLink"`
	Link          string `json:"Link"`
	MenuType      string `json:"MenuType"`
	Type          string `json:"Type"`
	MenuIcon      string `json:"MenuIcon"`
	Icon          string `json:"Icon"`
	OrderSeq      int    `json:"OrderSeq"`
	View          bool   `json:"View"`
	Create        bool   `json:"Create"`
	Edit          bool   `json:"Edit"`
	Delete        bool   `json:"Delete"`
	Import        bool   `json:"Import"`
	Export        bool   `json:"Export"`
	CreatedBy     string `json:"CreatedBy"`
	CreatedByName string `json:"CreatedByName"`
	CreatedAt     string `json:"CreatedAt"`
	UpdatedBy     string `json:"UpdatedBy"`
	UpdatedByName string `json:"UpdatedByName"`
	UpdatedAt     string `json:"UpdatedAt"`
	Rowversion    int64  `json:"Rowversion"`
	RowVersion    int64  `json:"RowVersion"`
}

type MenuService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewMenuService(db *sql.DB, logger *zap.Logger) *MenuService {
	return &MenuService{
		db:     db,
		logger: logger,
	}
}
