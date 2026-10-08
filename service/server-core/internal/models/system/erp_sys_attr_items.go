package system

import "time"

// ERPSysAttrItems tương ứng với bảng _ERPSysAttrItems (Đăng ký chi tiết giá trị thuộc tính)
type ERPSysAttrItems struct {
	IdSeq         string     `db:"IdSeq" json:"IdSeq"`
	AttrGroupSeq  *string    `db:"AttrGroupSeq" json:"AttrGroupSeq"` // Lưu IdSeq của bảng _ERPSysAttrGroups
	GroupCode     *string    `db:"GroupCode" json:"GroupCode,omitempty"`
	GroupName     *string    `db:"GroupName" json:"GroupName,omitempty"`
	CodeHelp      *int64     `db:"CodeHelp" json:"CodeHelp,omitempty"`
	GroupLangKey  *string    `db:"GroupLangKey" json:"GroupLangKey,omitempty"`
	AttrValueCode string     `db:"AttrValueCode" json:"AttrValueCode"`
	AttrValueName *string    `db:"AttrValueName" json:"AttrValueName"`
	LangKey       *string    `db:"LangKey" json:"LangKey"`
	ExtraValue    *string    `db:"ExtraValue" json:"ExtraValue"` // Cấu hình giá trị / SQL template (1=1, Status = 0...)
	Comment       *string    `db:"Comment" json:"Comment"`
	IsActive      bool       `db:"IsActive" json:"IsActive"`
	RowVersion    int64      `db:"RowVersion" json:"RowVersion"`
	IdxNo         *int       `db:"IdxNo" json:"IdxNo"`
	CreatedBy     *string    `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName *string    `db:"CreatedByName" json:"CreatedByName"`
	CreatedAt     *time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string    `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName *string    `db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt     *time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
