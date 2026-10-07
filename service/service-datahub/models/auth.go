package models

import (
	"time"
)

// ERPUser represents the main user account entity in DATAHUB/ERP database (_ERPUsers)
type ERPUser struct {
	UserSeq            string     `gorm:"primaryKey;column:UserSeq;type:varchar(36)" json:"UserSeq"`
	CompanySeq         int        `gorm:"column:CompanySeq;default:1" json:"CompanySeq"`
	IdxNo              int        `gorm:"column:IdxNo;default:1" json:"IdxNo"`
	EmpID              string     `gorm:"column:EmpID;type:varchar(50);index" json:"EmpID"`
	EmpCode            string     `gorm:"column:EmpCode;type:varchar(50);index" json:"EmpCode"`
	EmpName            string     `gorm:"column:EmpName;type:varchar(255)" json:"EmpName"`
	DeptName           string     `gorm:"column:DeptName;type:varchar(255)" json:"DeptName"`
	ManagerName        string     `gorm:"column:ManagerName;type:varchar(255)" json:"ManagerName"`
	UserId             string     `gorm:"column:UserId;type:varchar(100);uniqueIndex;not null" json:"UserId"`
	UserType           int        `gorm:"column:UserType;default:1" json:"UserType"`
	UserName           string     `gorm:"column:UserName;type:varchar(255)" json:"UserName"`
	EmpSeq             int        `gorm:"column:EmpSeq;default:1" json:"EmpSeq"`
	LoginPwd           *string    `gorm:"column:LoginPwd;type:text" json:"-"`
	Password1          *string    `gorm:"column:Password1;type:text" json:"-"`
	Password2          *string    `gorm:"column:Password2;type:text" json:"-"`
	Password3          *string    `gorm:"column:Password3;type:text" json:"-"`
	LoginStatus        int        `gorm:"column:LoginStatus;default:0" json:"LoginStatus"`
	LoginDate          string     `gorm:"column:LoginDate;type:varchar(50)" json:"LoginDate"`
	PwdChgDate         string     `gorm:"column:PwdChgDate;type:varchar(50)" json:"PwdChgDate"`
	PassHis            string     `gorm:"column:PassHis;type:text" json:"PassHis,omitempty"`
	Email              string     `gorm:"column:Email;type:varchar(255)" json:"Email"`
	IsOtpVerified      bool       `gorm:"column:IsOtpVerified;default:false" json:"IsOtpVerified"`
	IsEmailVerified    bool       `gorm:"column:IsEmailVerified;default:false" json:"IsEmailVerified"`
	LoginFailCnt       int        `gorm:"column:LoginFailCnt;default:0" json:"LoginFailCnt"`
	PwdType            string     `gorm:"column:PwdType;type:varchar(50)" json:"PwdType"`
	LoginType          int        `gorm:"column:LoginType;default:1" json:"LoginType"`
	ManagementType     int        `gorm:"column:ManagementType;default:1" json:"ManagementType"`
	LastUserSeq        string     `gorm:"column:LastUserSeq;type:varchar(36)" json:"LastUserSeq"`
	LastDateTime       *time.Time `gorm:"column:LastDateTime" json:"LastDateTime"`
	Dsn                string     `gorm:"column:Dsn;type:varchar(255)" json:"Dsn"`
	Remark             string     `gorm:"column:Remark;type:text" json:"Remark"`
	UserlimitDate      string     `gorm:"column:UserlimitDate;type:varchar(50)" json:"UserlimitDate"`
	LoginFailFirstTime *time.Time `gorm:"column:LoginFailFirstTime" json:"LoginFailFirstTime"`
	IsLayoutAdmin      int        `gorm:"column:IsLayoutAdmin;default:0" json:"IsLayoutAdmin"`
	IsGroupWareUser    string     `gorm:"column:IsGroupWareUser;type:varchar(10);default:'0'" json:"IsGroupWareUser"`
	SMUserType         int        `gorm:"column:SMUserType;default:0" json:"SMUserType"`
	LicenseType        int        `gorm:"column:LicenseType;default:1" json:"LicenseType"`
	CheckPass1         bool       `gorm:"column:CheckPass1;default:true" json:"CheckPass1"`
	StatusAcc          bool       `gorm:"column:StatusAcc;default:false" json:"StatusAcc"`
	Status             string     `gorm:"column:Status;type:varchar(50);default:'ACTIVE'" json:"Status"`
	Active             bool       `gorm:"column:Active;default:true;index" json:"Active"`
	LanguageSeq        int        `gorm:"column:LanguageSeq;default:6" json:"LanguageSeq"`
	CreatedBy          string     `gorm:"column:CreatedBy;type:varchar(36)" json:"CreatedBy"`
	CreatedAt          time.Time  `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy          string     `gorm:"column:UpdatedBy;type:varchar(36)" json:"UpdatedBy"`
	UpdatedAt          time.Time  `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion         int64      `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion         int64      `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPUser) TableName() string {
	return "_ERPUsers"
}

// ERPRolesUser represents the permission mapping between users and menus/roles (_ERPRolesUsers)
type ERPRolesUser struct {
	Id         int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	GroupId    *int64    `gorm:"column:GroupId;index" json:"GroupId"`
	UserId     string    `gorm:"column:UserId;type:varchar(100);index" json:"UserId"`
	MenuId     *int64    `gorm:"column:MenuId;index" json:"MenuId"`
	RootMenuId *int64    `gorm:"column:RootMenuId;index" json:"RootMenuId"`
	Type       string    `gorm:"column:Type;type:varchar(50)" json:"Type"` // 'rootmenu', 'menu', 'menuitem'
	Name       string    `gorm:"column:Name;type:varchar(255)" json:"Name"`
	View       bool      `gorm:"column:View;default:true" json:"View"`
	Create     bool      `gorm:"column:Create;default:true" json:"Create"`
	Edit       bool      `gorm:"column:Edit;default:true" json:"Edit"`
	Delete     bool      `gorm:"column:Delete;default:true" json:"Delete"`
	Import     bool      `gorm:"column:Import;default:true" json:"Import"`
	Export     bool      `gorm:"column:Export;default:true" json:"Export"`
	CreatedBy  string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt  time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy  string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt  time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion int64     `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPRolesUser) TableName() string {
	return "_ERPRolesUsers"
}

// ERPRootMenu represents the high-level root menu entity (_ERPRootMenus)
type ERPRootMenu struct {
	Id         int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	Key        string    `gorm:"column:Key;type:varchar(100);index" json:"Key"`
	IdxNo      int       `gorm:"column:IdxNo;default:0" json:"IdxNo"`
	Label      string    `gorm:"column:Label;type:varchar(255)" json:"Label"`
	Icon       string    `gorm:"column:Icon;type:varchar(100)" json:"Icon"`
	Link       string    `gorm:"column:Link;type:varchar(255)" json:"Link"`
	Utilities  bool      `gorm:"column:Utilities;default:true" json:"Utilities"`
	View       bool      `gorm:"column:View;default:true" json:"View"`
	Create     bool      `gorm:"column:Create;default:true" json:"Create"`
	Edit       bool      `gorm:"column:Edit;default:true" json:"Edit"`
	Delete     bool      `gorm:"column:Delete;default:true" json:"Delete"`
	Import     bool      `gorm:"column:Import;default:true" json:"Import"`
	Export     bool      `gorm:"column:Export;default:true" json:"Export"`
	CreatedBy  string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt  time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy  string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt  time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion int64     `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPRootMenu) TableName() string {
	return "_ERPRootMenus"
}

// ERPMenu represents submenus and menu items (_ERPMenus)
type ERPMenu struct {
	Id            int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	MenuRootId    *int64    `gorm:"column:MenuRootId;index" json:"MenuRootId"`
	MenuSubRootId *int64    `gorm:"column:MenuSubRootId;index" json:"MenuSubRootId"`
	Key           string    `gorm:"column:Key;type:varchar(100);index" json:"Key"`
	Label         string    `gorm:"column:Label;type:varchar(255)" json:"Label"`
	Link          string    `gorm:"column:Link;type:varchar(255)" json:"Link"`
	Type          string    `gorm:"column:Type;type:varchar(50);default:'menu'" json:"Type"`
	Icon          string    `gorm:"column:Icon;type:varchar(100)" json:"Icon"`
	OrderSeq      int       `gorm:"column:OrderSeq;default:0" json:"OrderSeq"`
	DictSeq       int       `gorm:"column:DictSeq;default:0" json:"DictSeq"`
	IdxNo         int       `gorm:"column:IdxNo;default:0" json:"IdxNo"`
	View          bool      `gorm:"column:View;default:true" json:"View"`
	Create        bool      `gorm:"column:Create;default:true" json:"Create"`
	Edit          bool      `gorm:"column:Edit;default:true" json:"Edit"`
	Delete        bool      `gorm:"column:Delete;default:true" json:"Delete"`
	Import        bool      `gorm:"column:Import;default:true" json:"Import"`
	Export        bool      `gorm:"column:Export;default:true" json:"Export"`
	CreatedBy     string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt     time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy     string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt     time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion    int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion    int64     `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPMenu) TableName() string {
	return "_ERPMenus"
}

// ERPRole represents role groups / roles (_ERPRoles)
type ERPRole struct {
	Id            int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	Name          string    `gorm:"column:Name;type:varchar(255);not null" json:"Name"`
	Comment       string    `gorm:"column:Comment;type:text" json:"Comment"`
	CreatedByName string    `gorm:"column:CreatedByName;type:varchar(255)" json:"CreatedByName"`
	IdxNo         int       `gorm:"column:IdxNo;default:1" json:"IdxNo"`
	Status        string    `gorm:"column:Status;type:varchar(50);default:'ACTIVE'" json:"Status"`
	CreatedBy     string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt     time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy     string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt     time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion    int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion    int64     `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPRole) TableName() string {
	return "_ERPRoles"
}

// ERPRoleMenu represents the menu permission matrix for roles (_ERPRoleMenus)
type ERPRoleMenu struct {
	Id         int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	RoleID     int64     `gorm:"column:RoleID;not null;index" json:"RoleID"`
	MenuID     int64     `gorm:"column:MenuID;not null;index" json:"MenuID"`
	View       bool      `gorm:"column:View;default:true" json:"View"`
	CanCreate  bool      `gorm:"column:CanCreate;default:true" json:"CanCreate"`
	CanEdit    bool      `gorm:"column:CanEdit;default:true" json:"CanEdit"`
	CanDelete  bool      `gorm:"column:CanDelete;default:true" json:"CanDelete"`
	CanExport  bool      `gorm:"column:CanExport;default:true" json:"CanExport"`
	CanPrint   bool      `gorm:"column:CanPrint;default:true" json:"CanPrint"`
	DataScope  string    `gorm:"column:DataScope;type:varchar(50);default:'ALL'" json:"DataScope"`
	CreatedBy  string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt  time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy  string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt  time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
	RowVersion int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion int64     `gorm:"-" json:"Rowversion,omitempty"`
}

func (ERPRoleMenu) TableName() string {
	return "_ERPRoleMenus"
}

// ERPGroup represents legacy role groups (_ERPGroups)
type ERPGroup struct {
	Id         int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	Name       string    `gorm:"column:Name;type:varchar(255);not null" json:"Name"`
	Comment    string    `gorm:"column:Comment;type:text" json:"Comment"`
	IdxNo      int       `gorm:"column:IdxNo;default:0" json:"IdxNo"`
	RowVersion int64     `gorm:"column:RowVersion;default:1" json:"RowVersion"`
	Rowversion int64     `gorm:"-" json:"Rowversion,omitempty"`
	CreatedBy  string    `gorm:"column:CreatedBy;type:varchar(100)" json:"CreatedBy"`
	CreatedAt  time.Time `gorm:"column:CreatedAt" json:"CreatedAt"`
	UpdatedBy  string    `gorm:"column:UpdatedBy;type:varchar(100)" json:"UpdatedBy"`
	UpdatedAt  time.Time `gorm:"column:UpdatedAt" json:"UpdatedAt"`
}

func (ERPGroup) TableName() string {
	return "_ERPGroups"
}

// ERPLoginLog represents user login history records (_ERPLoginLogs)
type ERPLoginLog struct {
	Id         int64     `gorm:"primaryKey;autoIncrement;column:Id" json:"Id"`
	UserId     string    `gorm:"column:UserId;type:varchar(100);index" json:"UserId"`
	UserSeq    string    `gorm:"column:UserSeq;type:varchar(36)" json:"UserSeq"`
	Status     string    `gorm:"column:Status;type:varchar(50)" json:"Status"`
	IpAddress  string    `gorm:"column:IpAddress;type:varchar(50)" json:"IpAddress"`
	UserAgent  string    `gorm:"column:UserAgent;type:varchar(500)" json:"UserAgent"`
	DeviceInfo string    `gorm:"column:DeviceInfo;type:text" json:"DeviceInfo,omitempty"`
	CreatedAt  time.Time `gorm:"column:CreatedAt;index" json:"CreatedAt"`
}

func (ERPLoginLog) TableName() string {
	return "_ERPLoginLogs"
}

// --- DTOs for Auth Endpoints ---

// AuthLoginEnvelope is the frontend login wrapper: { result: { login, password, ... } }
type AuthLoginEnvelope struct {
	Result struct {
		Login          string `json:"login"`
		Username       string `json:"username"`
		Password       string `json:"password"`
		DeviceInfoWeb  string `json:"deviceInfoWeb"`
		DeviceInfoSoft string `json:"deviceInfoSoft"`
		DeviceInfoApp  string `json:"deviceInfoApp"`
		PlatformStatus string `json:"platformStatus"`
	} `json:"result"`
	// Flat fallback
	Username  string `json:"username"`
	Login     string `json:"login"`
	Password  string `json:"password"`
	ConfigKey string `json:"config_key"`
}

// ChangePassEnvelope is the password change payload
type ChangePassEnvelope struct {
	Result struct {
		EmployeeId  string `json:"employeeId"`
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	} `json:"result"`
	EmployeeId  string `json:"employeeId"`
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

// UserAuthEnvelope for User CRUD actions
type UserAuthEnvelope struct {
	Result struct {
		UserSeq     string `json:"UserSeq"`
		UserId      string `json:"UserId"`
		UserName    string `json:"UserName"`
		EmpID       string `json:"EmpID"`
		EmpCode     string `json:"EmpCode"`
		EmpName     string `json:"EmpName"`
		DeptName    string `json:"DeptName"`
		Email       string `json:"Email"`
		Password    string `json:"Password"`
		Password2   string `json:"Password2"`
		LanguageSeq int    `json:"LanguageSeq"`
		StatusAcc   bool   `json:"StatusAcc"`
		CheckPass1  bool   `json:"CheckPass1"`
		Active      bool   `json:"Active"`
	} `json:"result"`
	UserId    string `json:"UserId"`
	UserName  string `json:"UserName"`
	Password  string `json:"Password"`
	Password2 string `json:"Password2"`
	StatusAcc *bool  `json:"StatusAcc"`
}
