package tbl_grp_perm_role

import (
	"github.com/jmoiron/sqlx"
)

type TblGrpPermRoleService struct {
	db *sqlx.DB
}

func NewTblGrpPermRoleService(db *sqlx.DB) *TblGrpPermRoleService {
	return &TblGrpPermRoleService{db: db}
}
