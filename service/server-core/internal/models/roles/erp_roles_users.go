package roles

type ERPRolesUsers struct {
	Id         string  `db:"Id" json:"Id"`
	View       bool    `db:"View" json:"View"`
	IdxNo      *int    `db:"IdxNo" json:"IdxNo"`
	Edit       bool    `db:"Edit" json:"Edit"`
	Create     bool    `db:"Create" json:"Create"`
	Delete     bool    `db:"Delete" json:"Delete"`
	RootMenuId *string `db:"RootMenuId" json:"RootMenuId"`
	MenuId     *string `db:"MenuId" json:"MenuId"`
	GroupId    *string `db:"GroupId" json:"GroupId"`
	UserId     *string `db:"UserId" json:"UserId"`
	UserSeq    *string `db:"UserSeq" json:"UserSeq"`
	Type       *string `db:"Type" json:"Type"`
	Name       *string `db:"Name" json:"Name"`
	CreatedBy  *string `db:"CreatedBy" json:"CreatedBy"`
	RowVersion int64   `db:"RowVersion" json:"RowVersion"`
	CreatedAt  *string `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy  *string `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedAt  *string `db:"UpdatedAt" json:"UpdatedAt"`
}

type ERPRolesUsersWEB = ERPRolesUsers
