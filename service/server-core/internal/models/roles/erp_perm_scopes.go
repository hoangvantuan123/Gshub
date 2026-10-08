package roles

import "time"

// ERPPermScopes tương ứng với bảng _ERPPermScopes (Đăng ký phạm vi dữ liệu)
type ERPPermScopes struct {
	IdSeq                  string    `db:"IdSeq" json:"IdSeq"`
	ScopeCode              *string   `db:"ScopeCode" json:"ScopeCode"`
	ScopeName              *string   `db:"ScopeName" json:"ScopeName"`
	LangKey                *string   `db:"LangKey" json:"LangKey"`
	PermActionSeq          *string   `db:"PermActionSeq" json:"PermActionSeq"`             // Lưu IdSeq bảng _ERPPermActions
	OperationCode          *string   `db:"OperationCode" json:"OperationCode,omitempty"`   // Mã hành động hiển thị
	OperationName          *string   `db:"OperationName" json:"OperationName,omitempty"`   // Tên hành động hiển thị
	ScopeLevelSeq          *string   `db:"ScopeLevelSeq" json:"ScopeLevelSeq"`             // Lưu IdSeq bảng _ERPSysAttrItems (Group: SCOPE_LEVEL)
	DefaultScopeLevel      *string   `db:"DefaultScopeLevel" json:"DefaultScopeLevel,omitempty"`
	DefaultScopeLevelLabel *string   `db:"DefaultScopeLevelLabel" json:"DefaultScopeLevelLabel,omitempty"`
	RuleConditionSeq       *string   `db:"RuleConditionSeq" json:"RuleConditionSeq"`       // Lưu IdSeq bảng _ERPSysAttrItems (Group: RULE_CONDITION)
	RuleCondition          *string   `db:"RuleCondition" json:"RuleCondition,omitempty"`
	RuleConditionLabel     *string   `db:"RuleConditionLabel" json:"RuleConditionLabel,omitempty"`
	ConditionSql           *string   `db:"ConditionSql" json:"ConditionSql"`               // Biểu thức WHERE SQL điều kiện lọc
	Comment                *string   `db:"Comment" json:"Comment"`
	RowVersion             int64     `db:"RowVersion" json:"RowVersion"`
	IdxNo                  *int      `db:"IdxNo" json:"IdxNo"`
	CreatedBy              *string   `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName          *string   `db:"CreatedByName" json:"CreatedByName,omitempty"`
	CreatedAt              time.Time `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy              *string   `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName          *string   `db:"UpdatedByName" json:"UpdatedByName,omitempty"`
	UpdatedAt              time.Time `db:"UpdatedAt" json:"UpdatedAt"`
}
