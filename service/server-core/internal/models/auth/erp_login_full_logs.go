package auth

import (
	"time"
)

// ERPLoginFullLogs corresponds to the _ERPLoginFullLogs table in ERPLOG database
type ERPLoginFullLogs struct {
	IdSeq            string    `db:"IdSeq" json:"IdSeq"`
	UserSeq          interface{} `db:"UserSeq" json:"UserSeq"`
	Login            string    `db:"Login" json:"Login"`
	IdxNo            *int      `db:"IdxNo" json:"IdxNo"`
	DeviceId         *string   `db:"DeviceId" json:"DeviceId"`
	StatusLogs       *string   `db:"StatusLogs" json:"StatusLogs"`
	DeviceInfoWeb    *string   `db:"DeviceInfoWeb" json:"DeviceInfoWeb"`
	DeviceInfoSoft   *string   `db:"DeviceInfoSoft" json:"DeviceInfoSoft"`
	DeviceInfoApp    *string   `db:"DeviceInfoApp" json:"DeviceInfoApp"`
	DeviceInfoWebIV  *string   `db:"DeviceInfoWebIV" json:"DeviceInfoWebIV"`
	DeviceInfoSoftIV *string   `db:"DeviceInfoSoftIV" json:"DeviceInfoSoftIV"`
	DeviceInfoAppIV  *string   `db:"DeviceInfoAppIV" json:"DeviceInfoAppIV"`
	PlatformStatus   *string   `db:"PlatformStatus" json:"PlatformStatus"`
	CreatedAt        time.Time `db:"CreatedAt" json:"CreatedAt"`
}
