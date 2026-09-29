package auth

import (
	"time"
)

// ERPUser corresponds to the _ERPUsers table with UUIDv7 IDs
type ERPUser struct {
	UserSeq            string     `db:"UserSeq" json:"UserSeq"`
	CompanySeq         *int       `db:"CompanySeq" json:"CompanySeq"`
	IdxNo              *int       `db:"IdxNo" json:"IdxNo"`
	EmpID              *string    `db:"EmpID" json:"EmpID"`
	EmpCode            *string    `db:"EmpCode" json:"EmpCode"`
	EmpName            *string    `db:"EmpName" json:"EmpName"`
	DeptName           *string    `db:"DeptName" json:"DeptName"`
	ManagerName        *string    `db:"ManagerName" json:"ManagerName"`
	UserId             *string    `db:"UserId" json:"UserId"`
	UserType           *int       `db:"UserType" json:"UserType"`
	UserName           *string    `db:"UserName" json:"UserName"`
	EmpSeq             *int       `db:"EmpSeq" json:"EmpSeq"`
	LoginPwd           *string    `db:"LoginPwd" json:"LoginPwd"`
	Password1          *string    `db:"Password1" json:"Password1"`
	Password2          *string    `db:"Password2" json:"Password2"`
	Password3          *string    `db:"Password3" json:"Password3"`
	LoginStatus        *int       `db:"LoginStatus" json:"LoginStatus"`
	LoginDate          *string    `db:"LoginDate" json:"LoginDate"`
	LastLoginDate      *string    `db:"LastLoginDate" json:"LastLoginDate"`
	PwdChgDate         *string    `db:"PwdChgDate" json:"PwdChgDate"`
	PassHis            *string    `db:"PassHis" json:"PassHis"`
	Email              *string    `db:"Email" json:"Email"`
	IsOtpVerified      bool       `db:"IsOtpVerified" json:"IsOtpVerified"`
	IsEmailVerified    bool       `db:"IsEmailVerified" json:"IsEmailVerified"`
	LoginFailCnt       *int       `db:"LoginFailCnt" json:"LoginFailCnt"`
	PwdType            *string    `db:"PwdType" json:"PwdType"`
	LoginType          *int       `db:"LoginType" json:"LoginType"`
	ManagementType     *int       `db:"ManagementType" json:"ManagementType"`
	LastUserSeq        *string    `db:"LastUserSeq" json:"LastUserSeq"`
	LastDateTime       *time.Time `db:"LastDateTime" json:"LastDateTime"`
	Dsn                *string    `db:"Dsn" json:"Dsn"`
	Remark             *string    `db:"Remark" json:"Remark"`
	UserlimitDate      *string    `db:"UserlimitDate" json:"UserlimitDate"`
	LoginFailFirstTime *time.Time `db:"LoginFailFirstTime" json:"LoginFailFirstTime"`
	IsLayoutAdmin      *int       `db:"IsLayoutAdmin" json:"IsLayoutAdmin"`
	IsGroupWareUser    *string    `db:"IsGroupWareUser" json:"IsGroupWareUser"`
	SMUserType         *int       `db:"SMUserType" json:"SMUserType"`
	LicenseType        *int       `db:"LicenseType" json:"LicenseType"`
	CheckPass1         bool       `db:"CheckPass1" json:"CheckPass1"`
	StatusAcc          bool       `db:"StatusAcc" json:"StatusAcc"`
	Status             *string    `db:"Status" json:"Status"`
	Active             bool       `db:"Active" json:"Active"`
	LanguageSeq        int        `db:"LanguageSeq" json:"LanguageSeq"`
	RowVersion         int64      `db:"RowVersion" json:"RowVersion"`
	CreatedBy          *string    `db:"CreatedBy" json:"CreatedBy"`
	CreatedByName      *string    `db:"CreatedByName" json:"CreatedByName"`
	CreatedAt          time.Time  `db:"CreatedAt" json:"CreatedAt"`
	UpdatedBy          *string    `db:"UpdatedBy" json:"UpdatedBy"`
	UpdatedByName      *string    `db:"UpdatedByName" json:"UpdatedByName"`
	UpdatedAt          time.Time  `db:"UpdatedAt" json:"UpdatedAt"`
}

type ERPUsers = ERPUser
type ERPUserWEB = ERPUser
