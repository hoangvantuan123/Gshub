package tbl_grp_item

import (
	"github.com/jmoiron/sqlx"
)

type TblGrpItemService struct {
	db *sqlx.DB
}

func NewTblGrpItemService(db *sqlx.DB) *TblGrpItemService {
	return &TblGrpItemService{db: db}
}
