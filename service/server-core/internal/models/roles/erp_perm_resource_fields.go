package roles

import "time"

// ERPPermResourceFields tương ứng với bảng _ERPPermResourceFields (Chi tiết trường dữ liệu theo Menu)
type ERPPermResourceFields struct {
	IdSeq           string    `db:"IdSeq" json:"IdSeq"`
	ResourceSeq     string    `db:"ResourceSeq" json:"ResourceSeq"`                         // FK -> _ERPPermResources / _ERPMenus
	ResourceCode    *string   `db:"ResourceCode" json:"ResourceCode,omitempty"`             // Mã menu hiển thị (qua JOIN)
	ResourceName    *string   `db:"ResourceName" json:"ResourceName,omitempty"`             // Tên menu hiển thị (qua JOIN)
	FieldSeq        string    `db:"FieldSeq" json:"FieldSeq"`                               // FK -> _ERPPermFields
	FieldCode       *string   `db:"FieldCode" json:"FieldCode,omitempty"`                   // Mã trường gốc (qua JOIN)
	FieldName       *string   `db:"FieldName" json:"FieldName,omitempty"`                   // Tên trường hiển thị kết hợp (COALESCE)
	DictSeq         *int64    `db:"DictSeq" json:"DictSeq,omitempty"`                       // Mã từ điển i18n gốc (qua JOIN)
	LangKey         *string   `db:"LangKey" json:"LangKey,omitempty"`                       // Lang key gốc (qua JOIN)
	CustomFieldName *string   `db:"CustomFieldName" json:"CustomFieldName,omitempty"`       // Tên tùy biến riêng theo menu
	IsMaskable      bool      `db:"IsMaskable" json:"IsMaskable"`
	IsSensitive     bool      `db:"IsSensitive" json:"IsSensitive"`
	OrderNo         int       `db:"OrderNo" json:"OrderNo"`
	Comment         *string   `db:"Comment" json:"Comment,omitempty"`
	RowVersion      int64     `db:"RowVersion" json:"RowVersion"`
	IdxNo           *int      `db:"IdxNo" json:"IdxNo,omitempty"`
	CreatedBy       *string   `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedByName   *string   `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt       time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy       *string   `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedByName   *string   `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt       time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
