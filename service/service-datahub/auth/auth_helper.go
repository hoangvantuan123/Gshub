package auth

import (
	"context"
	"errors"
	"fmt"
	"os"
	"service-datahub/proof"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc/metadata"
	"gorm.io/gorm"
)

// AuthenticatedUser chứa thông tin danh tính người dùng chính chủ được trích xuất từ Token hợp lệ
type AuthenticatedUser struct {
	UserSeq  string `json:"user_seq"`
	UserId   string `json:"user_id"`
	UserName string `json:"user_name"`
	EmpName  string `json:"emp_name"`
	EmpCode  string `json:"emp_code"`
	UserType int    `json:"user_type"`
	IsAdmin  bool   `json:"is_admin"`
	RawToken string `json:"-"`
}

// ERPUserRecord struct tương ứng bảng _ERPUsers trong PostgreSQL
type ERPUserRecord struct {
	UserSeq  string `gorm:"column:UserSeq"`
	UserId   string `gorm:"column:UserId"`
	UserName string `gorm:"column:UserName"`
	EmpName  string `gorm:"column:EmpName"`
	EmpCode  string `gorm:"column:EmpCode"`
	UserType int    `gorm:"column:UserType"`
}

// CleanBearerToken chuẩn hóa chuỗi token, loại bỏ tiền tố Bearer và khoảng trắng thừa
func CleanBearerToken(raw string) string {
	t := strings.TrimSpace(raw)
	if strings.HasPrefix(strings.ToLower(t), "bearer ") {
		t = strings.TrimSpace(t[7:])
	}
	t = strings.Trim(t, "\"'")
	return t
}

// ExtractTokenFromContext trích xuất Token từ gRPC Metadata hoặc Context thông thường
func ExtractTokenFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}

	// 1. Kiểm tra gRPC Incoming Metadata
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		for _, key := range []string{"authorization", "token", "x-token", "x-access-token", "access_token"} {
			vals := md.Get(key)
			if len(vals) > 0 {
				token := CleanBearerToken(vals[0])
				if token != "" {
					return token
				}
			}
		}
	}

	// 2. Kiểm tra context value nếu request đi qua middleware
	for _, key := range []interface{}{"access_token", "authorization", "token", "Authorization"} {
		if val, ok := ctx.Value(key).(string); ok {
			token := CleanBearerToken(val)
			if token != "" {
				return token
			}
		}
	}

	return ""
}

// AuthenticateUser xác thực danh tính người dùng từ Context (gRPC hoặc HTTP).
// CẤM tuyệt đối tin tưởng client gửi lên, toàn bộ quyền hạn và UserSeq phải được giải mã từ Token ký điện tử.
func AuthenticateUser(ctx context.Context, db *gorm.DB) (*AuthenticatedUser, error) {
	tokenStr := ExtractTokenFromContext(ctx)
	if tokenStr == "" {
		return nil, errors.New("Thiếu token xác thực đăng nhập (Authorization Bearer). Vui lòng đăng nhập lại!")
	}
	return AuthenticateUserWithToken(ctx, db, tokenStr)
}

// AuthenticateUserWithToken xác thực danh tính người dùng bằng chuỗi Token JWT
func AuthenticateUserWithToken(ctx context.Context, db *gorm.DB, tokenStr string) (*AuthenticatedUser, error) {
	token := CleanBearerToken(tokenStr)
	if user := AuthenticatedUserFromContext(ctx); user != nil && user.RawToken == token {
		return user, nil
	}
	if token == "" {
		return nil, errors.New("Token rỗng")
	}

	// Danh sách các Secret Key đã cấu hình trên toàn hệ thống GsHub
	candidateSecrets := []string{
		os.Getenv("JWT_SECRET"),
		"syscore_datahub_super_secret_jwt_key_2026",
		"P@5sW0rD!$R3c3nT@2024",
		"P@5sW0rD!c3nT@2024", // Chuẩn hóa trường hợp .env unquoted biến $R3c3nT bị nội suy
		"syscore_gshub_super_secret_jwt_key_2026",
		"syscore_gshub_dev_jwt_key_2026",
	}

	var verifiedClaims jwt.MapClaims
	var isSignatureValid bool

	for _, secret := range candidateSecrets {
		if strings.TrimSpace(secret) == "" {
			continue
		}
		parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(secret), nil
		})
		if err == nil && parsedToken != nil && parsedToken.Valid {
			if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
				verifiedClaims = claims
				isSignatureValid = true
				break
			}
		}
	}

	// Kiểm tra nếu là session OAuth lưu trong bảng TokenSession của PostgreSQL
	if !isSignatureValid && db != nil {
		var session struct {
			Username  string    `gorm:"column:Username"`
			ExpiresAt time.Time `gorm:"column:ExpiresAt"`
		}
		errSession := db.WithContext(ctx).Table(`"TokenSession"`).
			Select(`"Username", "ExpiresAt"`).
			Where(`"AccessToken" = ?`, token).
			First(&session).Error

		if errSession == nil && session.Username != "" {
			if time.Now().Before(session.ExpiresAt) {
				return LoadUserFromDB(ctx, db, "", session.Username, token)
			}
			return nil, errors.New("Phiên đăng nhập ERP đã hết hạn. Vui lòng đăng nhập lại!")
		}
	}

	if !isSignatureValid {
		return nil, errors.New("Token không hợp lệ, chữ ký không khớp hoặc đã hết hạn!")
	}

	if cnf, ok := verifiedClaims["cnf"].(map[string]interface{}); ok {
		if expected, ok := cnf["jkt"].(string); ok && expected != "" {
			key := proof.VerifiedKey(ctx, token)
			if key == "" {
				md, _ := metadata.FromIncomingContext(ctx)
				get := func(k string) string {
					v := md.Get(k)
					if len(v) > 0 {
						return v[0]
					}
					return ""
				}
				var err error
				key, err = proof.Verify(get("dpop"), get("dpop-htm"), get("dpop-htu"), token, expected)
				if err != nil {
					return nil, errors.New("invalid session proof")
				}
			}
			if key != expected {
				return nil, errors.New("session key mismatch")
			}
		}
	}
	// Trích xuất UserSeq & UserId từ claims đã được xác thực an toàn
	var claimUserSeq string
	var claimUserId string
	var claimLogin string

	if v, ok := verifiedClaims["UserSeq"]; ok && v != nil {
		claimUserSeq = strings.TrimSpace(fmt.Sprint(v))
	}
	if v, ok := verifiedClaims["UserId"].(string); ok {
		claimUserId = strings.TrimSpace(v)
	}
	if v, ok := verifiedClaims["Login"].(string); ok {
		claimLogin = strings.TrimSpace(v)
	}
	if claimUserId == "" && claimLogin != "" {
		claimUserId = claimLogin
	}

	// Tải thông tin chi tiết người dùng từ bảng _ERPUsers trong PostgreSQL
	if db != nil && (claimUserSeq != "" || claimUserId != "") {
		user, err := LoadUserFromDB(ctx, db, claimUserSeq, claimUserId, token)
		if err == nil && user != nil {
			return user, nil
		}
	}

	// Trường hợp trong DB chưa có bản ghi nhưng Token đã ký hợp lệ
	isAdmin := strings.EqualFold(claimUserId, "admin") || strings.EqualFold(claimLogin, "admin")
	return &AuthenticatedUser{
		UserSeq:  claimUserSeq,
		UserId:   claimUserId,
		UserName: claimLogin,
		IsAdmin:  isAdmin,
		RawToken: token,
	}, nil
}

// LoadUserFromDB tìm kiếm thông tin người dùng trong bảng _ERPUsers
func LoadUserFromDB(ctx context.Context, db *gorm.DB, userSeq, userId, token string) (*AuthenticatedUser, error) {
	if db == nil {
		return nil, errors.New("db nil")
	}

	var u ERPUserRecord
	query := db.WithContext(ctx).Table(`"_ERPUsers"`)

	if userSeq != "" && userId != "" {
		query = query.Where(`"UserSeq"::text = ? OR LOWER("UserId") = LOWER(?)`, userSeq, userId)
	} else if userSeq != "" {
		query = query.Where(`"UserSeq"::text = ?`, userSeq)
	} else if userId != "" {
		query = query.Where(`LOWER("UserId") = LOWER(?) OR LOWER("EmpCode") = LOWER(?)`, userId, userId)
	} else {
		return nil, errors.New("không có định danh người dùng")
	}

	if err := query.First(&u).Error; err != nil {
		return nil, err
	}

	isAdmin := u.UserType == 1 || strings.EqualFold(u.UserId, "admin") || strings.EqualFold(u.UserName, "admin")

	return &AuthenticatedUser{
		UserSeq:  u.UserSeq,
		UserId:   u.UserId,
		UserName: u.UserName,
		EmpName:  u.EmpName,
		EmpCode:  u.EmpCode,
		UserType: u.UserType,
		IsAdmin:  isAdmin,
		RawToken: token,
	}, nil
}

// CanUserModifyOrDeleteBundle kiểm tra xem AuthenticatedUser có quyền chỉnh sửa / xóa gói dữ liệu hay không.
// Nguyên tắc:
// 1. Quản trị viên (Admin) có toàn quyền.
// 2. Người dùng chính chủ (UserSeq hoặc UserId hoặc UserName trùng khớp người tạo) mới được phép xóa/sửa.
// 3. Người dùng khác TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP can thiệp vào bản ghi của người khác.
func CanUserModifyOrDeleteBundle(ctx context.Context, db *gorm.DB, authUser *AuthenticatedUser, bundleCreatedBy string) (bool, string) {
	if authUser == nil {
		return false, "Chưa xác thực danh tính người dùng"
	}

	// 1. Admin hệ thống luôn có quyền
	if authUser.IsAdmin {
		return true, ""
	}

	targetCreator := strings.TrimSpace(bundleCreatedBy)
	if targetCreator == "" {
		// Bản ghi không ghi nhận creator -> chỉ admin mới được xóa
		return false, "Bản ghi hệ thống không rõ người tạo. Vui lòng liên hệ Quản trị viên!"
	}

	// 2. So khớp trực tiếp với các định danh của authUser
	myIdentifiers := []string{
		authUser.UserSeq,
		authUser.UserId,
		authUser.UserName,
		authUser.EmpCode,
		authUser.EmpName,
	}

	for _, ident := range myIdentifiers {
		if ident != "" && strings.EqualFold(ident, targetCreator) {
			return true, ""
		}
	}

	// 3. Tra cứu người tạo targetCreator trong bảng _ERPUsers để so khớp chéo (UUID vs UserId vs EmpName)
	if db != nil {
		var creatorUser ERPUserRecord
		err := db.WithContext(ctx).Table(`"_ERPUsers"`).
			Where(`"UserSeq"::text = ? OR LOWER("UserId") = LOWER(?) OR LOWER("EmpCode") = LOWER(?)`, targetCreator, targetCreator, targetCreator).
			First(&creatorUser).Error

		if err == nil {
			if (creatorUser.UserSeq != "" && strings.EqualFold(creatorUser.UserSeq, authUser.UserSeq)) ||
				(creatorUser.UserId != "" && strings.EqualFold(creatorUser.UserId, authUser.UserId)) ||
				(creatorUser.EmpCode != "" && strings.EqualFold(creatorUser.EmpCode, authUser.EmpCode)) {
				return true, ""
			}

			display := creatorUser.UserName
			if display == "" {
				display = creatorUser.EmpName
			}
			if display == "" {
				display = creatorUser.UserId
			}
			return false, fmt.Sprintf("Gói dữ liệu thuộc về người dùng [%s] (%s). Bạn không phải chính chủ nên không thể thao tác!", display, creatorUser.UserId)
		}
	}

	return false, fmt.Sprintf("Gói dữ liệu thuộc về người dùng [%s]. Bạn không có quyền thao tác trên bản ghi này!", targetCreator)
}
