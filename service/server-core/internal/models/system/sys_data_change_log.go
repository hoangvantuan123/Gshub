package system

import "time"

// SysDataChangeLog represents a batch data change execution (_SysDataChangeLog in ERPLOG)
type SysDataChangeLog struct {
	IdSeq          string      `db:"IdSeq" json:"IdSeq"`
	ApiMethod      string      `db:"ApiMethod" json:"ApiMethod"`
	TableName      string      `db:"TableName" json:"TableName"`
	TotalRecords   int         `db:"TotalRecords" json:"TotalRecords"`
	SuccessCount   int         `db:"SuccessCount" json:"SuccessCount"`
	FailedCount    int         `db:"FailedCount" json:"FailedCount"`
	OverallStatus  string      `db:"OverallStatus" json:"OverallStatus"`
	UserSeq        interface{} `db:"UserSeq" json:"UserSeq"`
	UserLogin      string      `db:"UserLogin" json:"UserLogin"`
	ClientIp       string      `db:"ClientIp" json:"ClientIp"`
	DeviceInfoWeb  string      `db:"DeviceInfoWeb" json:"DeviceInfoWeb"`
	DeviceInfoSoft string      `db:"DeviceInfoSoft" json:"DeviceInfoSoft"`
	DeviceInfoApp  string      `db:"DeviceInfoApp" json:"DeviceInfoApp"`
	PlatformStatus string      `db:"PlatformStatus" json:"PlatformStatus"`
	TraceId        string      `db:"TraceId" json:"TraceId"`
	CreatedAt      time.Time   `db:"CreatedAt" json:"CreatedAt"`
}

// SysDataChangeRowLog represents per-row outcome in a batch (_SysDataChangeRowLog in ERPLOG)
type SysDataChangeRowLog struct {
	IdSeq         string    `db:"IdSeq" json:"IdSeq"`
	ChangeLogSeq  string    `db:"ChangeLogSeq" json:"ChangeLogSeq"`
	TableName     string    `db:"TableName" json:"TableName"`
	RecordId      string    `db:"RecordId" json:"RecordId"`
	RowIdx        int       `db:"RowIdx" json:"RowIdx"`
	ActionType    string    `db:"ActionType" json:"ActionType"` // A, U, D
	Status        string    `db:"Status" json:"Status"`         // SUCCESS, FAILED
	ErrorCode     string    `db:"ErrorCode" json:"ErrorCode"`
	ErrorMsg      string    `db:"ErrorMsg" json:"ErrorMsg"`
	SubmittedData string    `db:"SubmittedData" json:"SubmittedData"`
	CreatedAt     time.Time `db:"CreatedAt" json:"CreatedAt"`
}

// SysDataChangeDetail represents field-level diff (Old -> New) (_SysDataChangeDetail in ERPLOG)
type SysDataChangeDetail struct {
	IdSeq        string    `db:"IdSeq" json:"IdSeq"`
	RowLogSeq    string    `db:"RowLogSeq" json:"RowLogSeq"`
	FieldName    string    `db:"FieldName" json:"FieldName"`
	OldValue     string    `db:"OldValue" json:"OldValue"`
	NewValue     string    `db:"NewValue" json:"NewValue"`
	CreatedAt    time.Time `db:"CreatedAt" json:"CreatedAt"`
}

// RowChangeItem packages a single row log with its associated field diff details
type RowChangeItem struct {
	RowLog  SysDataChangeRowLog
	Details []SysDataChangeDetail
}

// DataChangeBatchJob represents the full in-memory job passed to the background worker
type DataChangeBatchJob struct {
	Master SysDataChangeLog
	Rows   []RowChangeItem
}

// RowHistoryRecord represents the result of querying history for a single RecordId
type RowHistoryRecord struct {
	RowLogId       string                 `db:"RowLogId" json:"RowLogId"`
	TableName      string                 `db:"TableName" json:"TableName"`
	RecordId       string                 `db:"RecordId" json:"RecordId"`
	ActionType     string                 `db:"ActionType" json:"ActionType"`
	Status         string                 `db:"Status" json:"Status"`
	ErrorCode      string                 `db:"ErrorCode" json:"ErrorCode"`
	ErrorMsg       string                 `db:"ErrorMsg" json:"ErrorMsg"`
	SubmittedData  string                 `db:"SubmittedData" json:"SubmittedData"`
	ApiMethod      string                 `db:"ApiMethod" json:"ApiMethod"`
	UserLogin      string                 `db:"UserLogin" json:"UserLogin"`
	ClientIp       string                 `db:"ClientIp" json:"ClientIp"`
	DeviceInfoWeb  string                 `db:"DeviceInfoWeb" json:"DeviceInfoWeb"`
	DeviceInfoSoft string                 `db:"DeviceInfoSoft" json:"DeviceInfoSoft"`
	DeviceInfoApp  string                 `db:"DeviceInfoApp" json:"DeviceInfoApp"`
	PlatformStatus string                 `db:"PlatformStatus" json:"PlatformStatus"`
	CreatedAt      time.Time              `db:"CreatedAt" json:"CreatedAt"`
	FieldDiffs     []SysDataChangeDetail `json:"FieldDiffs,omitempty"`
}
