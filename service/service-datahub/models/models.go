package models

import (
	"time"
)

// ErpConfig stores system endpoint configuration in PostgreSQL DATAHUB database
type ErpConfig struct {
	ConfigKey          string    `gorm:"primaryKey;column:ConfigKey;type:varchar(100)" json:"config_key"`
	ConfigName         string    `gorm:"column:ConfigName;type:varchar(255);not null" json:"config_name"`
	Provider           string    `gorm:"column:Provider;type:varchar(50);default:'Bravo'" json:"provider"`
	AuthUrl            string    `gorm:"column:AuthUrl;type:varchar(500);not null" json:"auth_url"`
	BaseApiUrl         string    `gorm:"column:BaseApiUrl;type:varchar(500);not null" json:"base_api_url"`
	Referer            string    `gorm:"column:Referer;type:varchar(500)" json:"referer"`
	ClientId           string    `gorm:"column:ClientId;type:varchar(255)" json:"client_id"`
	ClientSecret       string    `gorm:"column:ClientSecret;type:varchar(255)" json:"client_secret"`
	DeviceCode         string    `gorm:"column:DeviceCode;type:varchar(255)" json:"device_code"`
	ConnectionName     string    `gorm:"column:ConnectionName;type:varchar(100);default:'Default'" json:"connection_name"`
	GrantType          string    `gorm:"column:GrantType;type:varchar(50);default:'password'" json:"grant_type"`
	Scope              string    `gorm:"column:Scope;type:varchar(255);default:'ApiGateway offline_access'" json:"scope"`
	InsecureSkipVerify bool      `gorm:"column:InsecureSkipVerify;default:true" json:"insecure_skip_verify"`
	ExtraParams        string    `gorm:"column:ExtraParams;type:text" json:"extra_params,omitempty"`
	IsActive           bool      `gorm:"column:IsActive;default:true" json:"is_active"`
	CreatedAt          time.Time `gorm:"column:CreatedAt" json:"created_at"`
	UpdatedAt          time.Time `gorm:"column:UpdatedAt" json:"updated_at"`
}

func (ErpConfig) TableName() string {
	return "ErpConfig"
}

// TokenSession stores active OAuth token sessions obtained from ERP systems
type TokenSession struct {
	Id           uint      `gorm:"primaryKey;autoIncrement;column:Id" json:"id"`
	ConfigKey    string    `gorm:"column:ConfigKey;type:varchar(100);not null;uniqueIndex:idx_config_user" json:"config_key"`
	Username     string    `gorm:"column:Username;type:varchar(100);not null;uniqueIndex:idx_config_user" json:"username"`
	AccessToken  string    `gorm:"column:AccessToken;type:text;not null" json:"access_token"`
	TokenType    string    `gorm:"column:TokenType;type:varchar(50);default:'Bearer'" json:"token_type"`
	RefreshToken string    `gorm:"column:RefreshToken;type:text" json:"refresh_token,omitempty"`
	ExpiresIn    int64     `gorm:"column:ExpiresIn" json:"expires_in"`
	ExpiresAt    time.Time `gorm:"column:ExpiresAt;index" json:"expires_at"`
	Scope        string    `gorm:"column:Scope;type:varchar(255)" json:"scope"`
	RawResponse  string    `gorm:"column:RawResponse;type:text" json:"raw_response,omitempty"`
	CreatedAt    time.Time `gorm:"column:CreatedAt" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:UpdatedAt" json:"updated_at"`
}

func (TokenSession) TableName() string {
	return "TokenSession"
}

// AuditLog records all API requests & login activities
type AuditLog struct {
	Id             uint      `gorm:"primaryKey;autoIncrement;column:Id" json:"id"`
	TraceId        string    `gorm:"column:TraceId;type:varchar(64);index" json:"trace_id"`
	ConfigKey      string    `gorm:"column:ConfigKey;type:varchar(100);index" json:"config_key"`
	Username       string    `gorm:"column:Username;type:varchar(100)" json:"username"`
	Method         string    `gorm:"column:Method;type:varchar(10)" json:"method"`
	Endpoint       string    `gorm:"column:Endpoint;type:varchar(500)" json:"endpoint"`
	TargetUrl      string    `gorm:"column:TargetUrl;type:varchar(500)" json:"target_url"`
	StatusCode     int       `gorm:"column:StatusCode" json:"status_code"`
	LatencyMs      int64     `gorm:"column:LatencyMs" json:"latency_ms"`
	ClientIp       string    `gorm:"column:ClientIp;type:varchar(50)" json:"client_ip"`
	UserAgent      string    `gorm:"column:UserAgent;type:varchar(500)" json:"user_agent"`
	RequestPayload string    `gorm:"column:RequestPayload;type:text" json:"request_payload,omitempty"`
	ResponseBrief  string    `gorm:"column:ResponseBrief;type:text" json:"response_brief,omitempty"`
	ErrorMessage   string    `gorm:"column:ErrorMessage;type:text" json:"error_message,omitempty"`
	CreatedAt      time.Time `gorm:"column:CreatedAt;index" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "AuditLog"
}

// LoginRequest received from Frontend
type LoginRequest struct {
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required"`
	ConfigKey string `json:"config_key"` // Optional, default to BravoDefault
}

// LoginResponse sent to Frontend
type LoginResponse struct {
	Success      bool          `json:"success"`
	ConfigKey    string        `json:"config_key"`
	Username     string        `json:"username"`
	AccessToken  string        `json:"access_token"`
	TokenType    string        `json:"token_type"`
	ExpiresIn    int64         `json:"expires_in"`
	ExpiresAt    string        `json:"expires_at"`
	Scope        string        `json:"scope,omitempty"`
	TokenSession *TokenSession `json:"session,omitempty"`
}

// BravoOAuthTokenResponse from external Bravo ERP OAuth server
type BravoOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	Error        string `json:"error,omitempty"`
	ErrorDesc    string `json:"error_description,omitempty"`
}

// ProxyForwardRequest payload for sending arbitrary queries through DataHub to ERP
type ProxyForwardRequest struct {
	ConfigKey string            `json:"config_key"` // Which ERP config to use
	Username  string            `json:"username"`   // Which user token to use
	Method    string            `json:"method"`     // GET, POST, PUT, DELETE
	Path      string            `json:"path"`       // e.g. /api/v1/orders
	Headers   map[string]string `json:"headers"`    // Additional headers
	Params    map[string]string `json:"params"`     // Query parameters
	Body      interface{}       `json:"body"`       // JSON body payload
}

// ApiResponse standard wrapper for JSON responses
type ApiResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}
