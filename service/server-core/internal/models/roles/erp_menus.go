package roles

// ERPMenus corresponds to the _ERPMenus table
type ERPMenus struct {
	Id            interface{} `db:"Id" json:"Id"`
	MenuRootId    interface{} `db:"MenuRootId" json:"MenuRootId"`
	IdxNo         *int        `db:"IdxNo" json:"IdxNo"`
	MenuSubRootId interface{} `db:"MenuSubRootId" json:"MenuSubRootId"`
	Key           *string     `db:"Key" json:"Key"`
	Label         *string     `db:"Label" json:"Label"`
	Link          *string     `db:"Link" json:"Link"`
	Type          *string     `db:"Type" json:"Type"`
	OrderSeq      *int        `db:"OrderSeq" json:"OrderSeq"`
	DictSeq       interface{} `db:"DictSeq" json:"DictSeq"`
	RowVersion    int64       `db:"RowVersion" json:"RowVersion"`
	CreatedBy     interface{} `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedByName *string     `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt     interface{} `db:"CreatedAt" json:"CreatedAt,omitempty"`
	UpdatedBy     interface{} `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedByName *string     `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt     interface{} `db:"UpdatedAt" json:"UpdatedAt,omitempty"`

	// Virtual fields from joins for MenuRootName and MenuSubRootName
	MenuRootName    *string `db:"MenuRootName" json:"MenuRootName,omitempty"`
	MenuSubRootName *string `db:"MenuSubRootName" json:"MenuSubRootName,omitempty"`
}

type ERPMenusWEB = ERPMenus
