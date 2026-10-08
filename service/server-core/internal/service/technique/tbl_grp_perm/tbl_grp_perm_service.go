package tbl_grp_perm

import (
	"github.com/jmoiron/sqlx"
)

type TblGrpPermService struct {
	db *sqlx.DB
}

func NewTblGrpPermService(db *sqlx.DB) *TblGrpPermService {
	return &TblGrpPermService{db: db}
}
