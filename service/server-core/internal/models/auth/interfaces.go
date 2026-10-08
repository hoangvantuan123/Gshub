package auth

import "context"

// PageInfo holds pagination metadata for big data queries
type PageInfo struct {
	Total       int    `json:"total"`
	TotalAll    int    `json:"totalAll"`
	Page        int    `json:"page"`
	PageSize    int    `json:"pageSize"`
	TotalPages  int    `json:"totalPages"`
	LoadedCount int    `json:"loadedCount"`
	HasMore     bool   `json:"hasMore"`
	NextCursor  string `json:"nextCursor,omitempty"`
}

// UserAuthService defines the business logic for user-specific auth operations
type UserAuthService interface {
	UsersAuthA(ctx context.Context, users []ERPUser) (any, error)
	UsersAuthU(ctx context.Context, users []ERPUser) (any, error)
	UsersAuthUStatusAcc(ctx context.Context, users []ERPUser) (any, error)
	UsersAuthD(ctx context.Context, ids []string) (any, error)
	UPasswordForUsers(ctx context.Context, users []ERPUser) (any, error)
	UsersAuthQ(ctx context.Context, filters map[string]string) ([]ERPUser, *PageInfo, error)
}

// UserRepository defines the interface for ERPUser data operations
type UserRepository interface {
	GetByUserId(ctx context.Context, userId string) (*ERPUser, error)
	GetByUserSeq(ctx context.Context, userSeq string) (*ERPUser, error)
	Update(ctx context.Context, user *ERPUser) error
	
	// Complex queries for roles
	GetDataRolesUserRaw(ctx context.Context, userId string, userSeq interface{}) ([]map[string]interface{}, []map[string]interface{}, error)
}

// LogRepository defines the interface for ERPLoginFullLogs
type LogRepository interface {
	SaveLoginLog(ctx context.Context, log *ERPLoginFullLogs) error
}

// AuthService defines the business logic for authentication
type AuthService interface {
	LoginUserB(ctx context.Context, login, password string, deviceInfo any) (any, error)
	ChangePass(ctx context.Context, employeeId, oldPassword, newPassword string) (any, error)
}

// AuthError represents a structured error with a machine-readable code
type AuthError struct {
	Code    string
	Message string
}

func (e *AuthError) Error() string {
	return e.Message
}
