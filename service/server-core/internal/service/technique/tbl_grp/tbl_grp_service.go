package tbl_grp

import (
	"github.com/jmoiron/sqlx"
)

type TblGrpService struct {
	db *sqlx.DB
}

func NewTblGrpService(db *sqlx.DB) *TblGrpService {
	return &TblGrpService{db: db}
}
