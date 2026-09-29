package roles

import "time"

// ERPPermFields tương ứng với bảng _ERPPermFields (Đăng ký trường phân quyền dữ liệu)
type ERPPermFields struct {
	IdSeq         string    `db:"IdSeq" json:"IdSeq"`
	ResourceSeq   *string   `db:"ResourceSeq" json:"ResourceSeq"`             // Lưu Id bảng _ERPMenus
	ResourceCode  *string   `db:"ResourceCode" json:"ResourceCode,omitempty"` // Mã chức năng/menu hiển thị (qua JOIN)
	ResourceName  *string   `db:"ResourceName" json:"ResourceName,omitempty"` // Tên chức năng/menu hiển thị (qua JOIN)
	FieldCode     *string   `db:"FieldCode" json:"FieldCode"`
	FieldName     *string   `db:"FieldName" json:"FieldName"`
	DictSeq       *int64    `db:"DictSeq" json:"DictSeq"`
	LangKey       *string   `db:"LangKey" json:"LangKey"`
	IsMaskable    bool      `db:"IsMaskable" json:"IsMaskable"`
	IsSensitive   bool      `db:"IsSensitive" json:"IsSensitive"`
	OrderNo       int       `db:"OrderNo" json:"OrderNo"`
	Comment       *string   `db:"Comment" json:"Comment"`
	RowVersion    int64     `db:"RowVersion" json:"RowVersion"`
	IdxNo         *int      `db:"IdxNo" json:"IdxNo"`
	CreatedBy     *string   `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName *string   `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt     time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy     *string   `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName *string   `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt     time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
