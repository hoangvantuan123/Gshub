package system

import "time"

// ERPSysFullAuditLog corresponds to the _SysFullAuditLog table in ERPLOG database
type ERPSysFullAuditLog struct {
	IdSeq        string      `db:"IdSeq" json:"IdSeq"`               // UUIDv7
	ModuleName   string      `db:"ModuleName" json:"ModuleName"`     // server-core
	ServiceName  string      `db:"ServiceName" json:"ServiceName"`   // e.g., UsersService
	MethodName   string      `db:"MethodName" json:"MethodName"`     // e.g., UsersAuthA
	ActionType   string      `db:"ActionType" json:"ActionType"`     // A, U, D, Q, L
	UrlPath      string      `db:"UrlPath" json:"UrlPath"`           // Full Method Path
	RequestData  string      `db:"RequestData" json:"RequestData"`   // Input JSON
	ResponseData string      `db:"ResponseData" json:"ResponseData"` // Output JSON or Error
	StatusCode   int         `db:"StatusCode" json:"StatusCode"`     // 200, 400, 500, etc.
	StatusMsg    string      `db:"StatusMsg" json:"StatusMsg"`       // Success or Error Message
	DurationMs   int64       `db:"DurationMs" json:"DurationMs"`     // Execution time in ms
	UserSeq      interface{} `db:"UserSeq" json:"UserSeq"`           // Executing user ID (UUIDv7 or string/int)
	UserLogin    string      `db:"UserLogin" json:"UserLogin"`       // Executing user login
	ClientIp     string      `db:"ClientIp" json:"ClientIp"`
	Token        string      `db:"Token" json:"Token"` // Session Token
	CreatedAt    time.Time   `db:"CreatedAt" json:"CreatedAt"`
}
