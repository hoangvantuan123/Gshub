package role_perm

import (
	"database/sql"

	"go.uber.org/zap"
)

type UserRoleAssignment struct {
	Id        string `json:"Id"`
	UserId    string `json:"UserId"`
	UserName  string `json:"UserName"`
	GroupId   string `json:"GroupId"`
	GroupName string `json:"GroupName"`
	CreatedBy string `json:"CreatedBy"`
	CreatedAt string `json:"CreatedAt"`
}

type MenuRoleAssignment struct {
	Id            string `json:"Id"`
	GroupId       string `json:"GroupId"`
	RootMenuId    string `json:"RootMenuId"`
	MenuId        string `json:"MenuId"`
	MenuSubRootId int64  `json:"MenuSubRootId"`
	ParentId      int64  `json:"ParentId"`
	MenuKey       string `json:"MenuKey"`
	Key           string `json:"Key"`
	MenuLabel     string `json:"MenuLabel"`
	Label         string `json:"Label"`
	MenuType      string `json:"MenuType"`
	Type          string `json:"Type"`
	OrderSeq   int    `json:"OrderSeq"`
	CanView    bool   `json:"CanView"`
	View       bool   `json:"View"`
	CanCreate  bool   `json:"CanCreate"`
	Create     bool   `json:"Create"`
	CanEdit    bool   `json:"CanEdit"`
	Edit       bool   `json:"Edit"`
	CanDelete  bool   `json:"CanDelete"`
	Delete     bool   `json:"Delete"`
	CanImport  bool   `json:"CanImport"`
	Import     bool   `json:"Import"`
	CanExport  bool   `json:"CanExport"`
	Export     bool   `json:"Export"`
	CanPrint   bool   `json:"CanPrint"`
	DataScope  string `json:"DataScope"`
	Rowversion int64  `json:"Rowversion"`
	RowVersion int64  `json:"RowVersion"`
}

type RootMenuRoleAssignment struct {
	Id           string `json:"Id"`
	GroupId      string `json:"GroupId"`
	RootMenuId   string `json:"RootMenuId"`
	Key          string `json:"Key"`
	RootMenuKey  string `json:"RootMenuKey"`
	Label        string `json:"Label"`
	RootMenuName string `json:"RootMenuName"`
	Icon         string `json:"Icon"`
	OrderSeq     int    `json:"OrderSeq"`
	View         bool   `json:"View"`
	CanView      bool   `json:"CanView"`
	Rowversion   int64  `json:"Rowversion"`
	RowVersion   int64  `json:"RowVersion"`
}

type RolePermService struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewRolePermService(db *sql.DB, logger *zap.Logger) *RolePermService {
	return &RolePermService{
		db:     db,
		logger: logger,
	}
}
