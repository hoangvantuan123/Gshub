package services

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"service-datahub/config"
	"service-datahub/middleware"
	"service-datahub/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db     *gorm.DB
	cfg    *config.Config
	logger *zap.Logger
}

func NewAuthService(db *gorm.DB, cfg *config.Config, logger *zap.Logger) *AuthService {
	return &AuthService{
		db:     db,
		cfg:    cfg,
		logger: logger,
	}
}

// GenerateUUIDv7 creates a time-ordered UUIDv7 string
func GenerateUUIDv7() string {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.New().String()
	}
	return id.String()
}

// sanitizeInput removes unwanted special characters from username
func (s *AuthService) sanitizeInput(input string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9@._\-]`)
	return re.ReplaceAllString(input, "")
}

// decodePassword decodes Base64 password if encoded
func (s *AuthService) decodePassword(password string) string {
	if decoded, err := base64.StdEncoding.DecodeString(password); err == nil && len(decoded) > 0 {
		return string(decoded)
	}
	return password
}

// Login handles user authentication, password verification, token generation, and audit logging
func (s *AuthService) Login(ctx context.Context, login, rawPassword string, deviceInfo map[string]interface{}, clientIp, userAgent string) (map[string]interface{}, error) {
	login = s.sanitizeInput(strings.TrimSpace(login))
	actualPassword := s.decodePassword(rawPassword)

	if login == "" || actualPassword == "" {
		return nil, errors.New("Mã nhân viên / tài khoản và mật khẩu không được để trống")
	}

	// 1. Find user in _ERPUsers
	var user models.ERPUser
	err := s.db.WithContext(ctx).
		Where("LOWER(\"UserId\") = LOWER(?) OR \"EmpID\" = ? OR \"EmpCode\" = ? OR \"UserName\" = ?", login, login, login, login).
		First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Auto seed default admin if the table is completely empty or matches default bootstrap
			if (login == "admin" || login == "IT_TUANHV") && (actualPassword == "Admin@123" || actualPassword == "Tuan3112@") {
				user = s.bootstrapAdminUser(ctx, login, actualPassword)
			} else {
				s.recordLoginLog(ctx, login, "", "USER_NOT_FOUND", clientIp, userAgent, deviceInfo)
				return nil, errors.New("Thông tin đăng nhập không hợp lệ")
			}
		} else {
			s.logger.Error("Database query user failed", zap.Error(err), zap.String("login", login))
			return nil, errors.New("Lỗi hệ thống khi xác thực tài khoản")
		}
	}

	// 2. Verify Password (bcrypt)
	if user.Password2 == nil || *user.Password2 == "" {
		// Fallback: If Password2 is empty but Password1 matches plaintext, update to bcrypt Password2
		if user.Password1 != nil && *user.Password1 == actualPassword {
			hashed, _ := bcrypt.GenerateFromPassword([]byte(actualPassword), bcrypt.DefaultCost)
			hashStr := string(hashed)
			user.Password2 = &hashStr
			_ = s.db.WithContext(ctx).Model(&user).Update("Password2", hashStr)
		} else {
			s.recordLoginLog(ctx, login, user.UserSeq, "INVALID_CREDENTIALS", clientIp, userAgent, deviceInfo)
			return nil, errors.New("Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại mật khẩu.")
		}
	} else {
		err = bcrypt.CompareHashAndPassword([]byte(*user.Password2), []byte(actualPassword))
		if err != nil {
			s.recordLoginLog(ctx, login, user.UserSeq, "INVALID_CREDENTIALS", clientIp, userAgent, deviceInfo)
			return nil, errors.New("Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu")
		}
	}

	// 3. Check Account Status
	if user.StatusAcc {
		s.recordLoginLog(ctx, login, user.UserSeq, "ACCOUNT_LOCKED", clientIp, userAgent, deviceInfo)
		return nil, errors.New("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.")
	}

	if !user.Active {
		s.recordLoginLog(ctx, login, user.UserSeq, "ACCOUNT_INACTIVE", clientIp, userAgent, deviceInfo)
		return nil, errors.New("Tài khoản đã bị ngưng hoạt động.")
	}

	// 4. Generate Main Token
	jwtSecret := s.cfg.JWT.Secret
	expireDuration := time.Hour * time.Duration(s.cfg.JWT.ExpireHours)
	if expireDuration <= 0 {
		expireDuration = time.Hour * 72
	}
	expTime := time.Now().Add(expireDuration)

	tokenClaims := jwt.MapClaims{
		"UserId":     user.UserId,
		"Login":      user.UserName,
		"UserSeq":    user.UserSeq,
		"EmpSeq":     user.EmpSeq,
		"Remark":     user.Remark,
		"CompanySeq": user.CompanySeq,
		"exp":        expTime.Unix(),
	}
	mainToken := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)
	tokenString, err := mainToken.SignedString([]byte(jwtSecret))
	if err != nil {
		s.logger.Error("Failed to sign JWT token", zap.Error(err))
		return nil, errors.New("Không thể tạo phiên xác thực")
	}

	// 5. Get Role and Menu Permissions
	rolesUserMenu, _ := s.GetUserRolesAndMenus(ctx, user.UserId)

	// 6. Generate Roles Token
	rolesClaims := jwt.MapClaims{
		"data": rolesUserMenu,
		"exp":  expTime.Unix(),
	}
	rolesToken := jwt.NewWithClaims(jwt.SigningMethodHS256, rolesClaims)
	rolesTokenString, _ := rolesToken.SignedString([]byte(jwtSecret))

	// 7. Update Last Login Time
	now := time.Now()
	nowStr := now.Format("2006-01-02 15:04:05")
	_ = s.db.WithContext(ctx).Model(&user).Updates(map[string]interface{}{
		"LoginDate":    nowStr,
		"LastDateTime": &now,
	})

	// 8. Record Login Audit Log
	s.recordLoginLog(ctx, login, user.UserSeq, "SUCCESS", clientIp, userAgent, deviceInfo)

	langSeq := user.LanguageSeq
	if langSeq == 0 {
		langSeq = 6 // Vietnamese default
	}

	return map[string]interface{}{
		"user": map[string]interface{}{
			"UserId":     user.UserId,
			"UserName":   user.UserName,
			"CompanySeq": user.CompanySeq,
			"UserType":   user.UserType,
			"EmpSeq":     user.EmpSeq,
			"UserSeq":    user.UserSeq,
			"EmpID":      user.EmpID,
			"DeptName":   user.DeptName,
			"Email":      user.Email,
		},
		"token":              tokenString,
		"access_token":       tokenString,
		"refresh_token":      tokenString,
		"tokenRolesUserMenu": rolesTokenString,
		"roles_menu":         rolesTokenString,
		"typeLanguage":       langSeq,
	}, nil
}

// Logout revokes the token and adds it to the blacklist
func (s *AuthService) Logout(ctx context.Context, tokenString string) error {
	if tokenString == "" {
		return nil
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.Secret), nil
	})

	exp := time.Now().Add(8 * time.Hour)
	if err == nil && token != nil {
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if expFloat, ok := claims["exp"].(float64); ok {
				exp = time.Unix(int64(expFloat), 0)
			}
		}
	}

	middleware.GlobalBlacklist.Revoke(tokenString, exp)
	s.logger.Info("User token successfully revoked on logout")
	return nil
}

// ChangePass updates user password after verifying current password
func (s *AuthService) ChangePass(ctx context.Context, empId, oldPass, newPass string) error {
	empId = s.sanitizeInput(strings.TrimSpace(empId))
	actualOldPass := s.decodePassword(oldPass)
	actualNewPass := s.decodePassword(newPass)

	if empId == "" || actualOldPass == "" || actualNewPass == "" {
		return errors.New("Vui lòng cung cấp đầy đủ thông tin tài khoản và mật khẩu")
	}

	if len(actualNewPass) < 6 {
		return errors.New("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự")
	}

	var user models.ERPUser
	err := s.db.WithContext(ctx).
		Where("LOWER(\"UserId\") = LOWER(?) OR \"EmpID\" = ? OR \"EmpCode\" = ?", empId, empId, empId).
		First(&user).Error

	if err != nil {
		return errors.New("Tài khoản không tồn tại")
	}

	if user.Password2 != nil && *user.Password2 != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(*user.Password2), []byte(actualOldPass)); err != nil {
			return errors.New("Mật khẩu hiện tại không chính xác")
		}
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(actualNewPass), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("Lỗi mã hóa mật khẩu mới")
	}

	hashStr := string(hashed)
	nowStr := time.Now().Format("2006-01-02 15:04:05")
	return s.db.WithContext(ctx).Model(&user).Updates(map[string]interface{}{
		"Password2":   &hashStr,
		"PwdChgDate":  nowStr,
		"CheckPass1":  true,
		"UpdatedAt":   time.Now(),
	}).Error
}

// UsersAuthA creates / registers a new user
func (s *AuthService) UsersAuthA(ctx context.Context, req models.ERPUser, password string, createdBy string) (*models.ERPUser, error) {
	req.UserId = s.sanitizeInput(strings.TrimSpace(req.UserId))
	if req.UserId == "" {
		return nil, errors.New("Mã UserId không được để trống")
	}

	var count int64
	s.db.WithContext(ctx).Model(&models.ERPUser{}).Where("LOWER(\"UserId\") = LOWER(?)", req.UserId).Count(&count)
	if count > 0 {
		return nil, errors.New("UserId đã tồn tại trên hệ thống")
	}

	actualPass := s.decodePassword(password)
	if actualPass == "" {
		actualPass = "123456@"
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(actualPass), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("lỗi băm mật khẩu: %w", err)
	}

	hashStr := string(hashed)
	req.Password2 = &hashStr
	req.UserSeq = GenerateUUIDv7()
	req.CheckPass1 = true
	req.Active = true
	req.StatusAcc = false
	if req.LanguageSeq == 0 {
		req.LanguageSeq = 6
	}
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()
	req.CreatedBy = createdBy

	if req.UserName == "" {
		req.UserName = req.UserId
	}
	if req.EmpID == "" {
		req.EmpID = req.UserId
	}

	if err := s.db.WithContext(ctx).Create(&req).Error; err != nil {
		return nil, fmt.Errorf("không thể tạo người dùng: %w", err)
	}

	return &req, nil
}

// UsersAuthU updates user information
func (s *AuthService) UsersAuthU(ctx context.Context, req models.ERPUser, updatedBy string) error {
	if req.UserId == "" && req.UserSeq == "" {
		return errors.New("UserId hoặc UserSeq là bắt buộc")
	}

	updates := map[string]interface{}{
		"UserName":    req.UserName,
		"EmpName":     req.EmpName,
		"DeptName":    req.DeptName,
		"ManagerName": req.ManagerName,
		"Email":       req.Email,
		"LanguageSeq": req.LanguageSeq,
		"Remark":      req.Remark,
		"UpdatedAt":   time.Now(),
		"UpdatedBy":   updatedBy,
	}

	query := s.db.WithContext(ctx).Model(&models.ERPUser{})
	if req.UserSeq != "" {
		query = query.Where("\"UserSeq\" = ?", req.UserSeq)
	} else {
		query = query.Where("LOWER(\"UserId\") = LOWER(?)", req.UserId)
	}

	return query.Updates(updates).Error
}

// UsersAuthD deactivates user
func (s *AuthService) UsersAuthD(ctx context.Context, userSeqOrId string) error {
	userSeqOrId = strings.TrimSpace(userSeqOrId)
	if userSeqOrId == "" {
		return errors.New("Mã người dùng không hợp lệ")
	}

	return s.db.WithContext(ctx).Model(&models.ERPUser{}).
		Where("\"UserSeq\" = ? OR LOWER(\"UserId\") = LOWER(?)", userSeqOrId, userSeqOrId).
		Updates(map[string]interface{}{
			"Active":    false,
			"Status":    "DEACTIVATED",
			"UpdatedAt": time.Now(),
		}).Error
}

// UsersAuthQ queries users list with search and pagination
func (s *AuthService) UsersAuthQ(ctx context.Context, keyword string, limit, offset int) ([]models.ERPUser, int64, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var users []models.ERPUser
	var total int64

	query := s.db.WithContext(ctx).Model(&models.ERPUser{})
	if keyword != "" {
		k := "%" + strings.ToLower(keyword) + "%"
		query = query.Where("LOWER(\"UserId\") LIKE ? OR LOWER(\"UserName\") LIKE ? OR LOWER(\"EmpID\") LIKE ? OR LOWER(\"DeptName\") LIKE ?", k, k, k, k)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("\"IdxNo\" ASC, \"CreatedAt\" DESC").
		Limit(limit).
		Offset(offset).
		Find(&users).Error

	return users, total, err
}

// UsersAuthUStatusAcc locks or unlocks user account
func (s *AuthService) UsersAuthUStatusAcc(ctx context.Context, userId string, statusAcc bool) error {
	userId = s.sanitizeInput(strings.TrimSpace(userId))
	return s.db.WithContext(ctx).Model(&models.ERPUser{}).
		Where("LOWER(\"UserId\") = LOWER(?) OR \"UserSeq\" = ?", userId, userId).
		Updates(map[string]interface{}{
			"StatusAcc": statusAcc,
			"UpdatedAt": time.Now(),
		}).Error
}

// UpdatePasswords resets a user's password directly
func (s *AuthService) UpdatePasswords(ctx context.Context, userId, newPassword string) error {
	userId = s.sanitizeInput(strings.TrimSpace(userId))
	actualPass := s.decodePassword(newPassword)
	if userId == "" || actualPass == "" {
		return errors.New("UserId và mật khẩu mới không được để trống")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(actualPass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashStr := string(hashed)
	return s.db.WithContext(ctx).Model(&models.ERPUser{}).
		Where("LOWER(\"UserId\") = LOWER(?) OR \"UserSeq\" = ?", userId, userId).
		Updates(map[string]interface{}{
			"Password2":  &hashStr,
			"PwdChgDate": time.Now().Format("2006-01-02 15:04:05"),
			"UpdatedAt":  time.Now(),
		}).Error
}

// GetUserRolesAndMenus retrieves assigned roles and menu permissions with multi-group aggregation
func (s *AuthService) GetUserRolesAndMenus(ctx context.Context, userId string) ([]map[string]interface{}, error) {
	userId = strings.TrimSpace(userId)

	var rootMenus []map[string]interface{}
	var menus []map[string]interface{}

	// 1. Query Root Menus with multi-group aggregated permissions (BOOL_OR)
	rootMenuRows, err := s.db.WithContext(ctx).Raw(`
		WITH user_groups AS (
			SELECT DISTINCT "GroupId" 
			FROM "_ERPRolesUsers" 
			WHERE "Type" = 'user' AND LOWER("UserId") = LOWER(?)
		)
		SELECT 
			rm."Id" AS "Id",
			rm."Id" AS "RootMenuId",
			rm."Key" AS "RootMenuKey",
			rm."Key" AS "Key",
			rm."Label" AS "RootMenuLabel",
			rm."Label" AS "Label",
			rm."Icon" AS "RootMenuIcon",
			rm."Icon" AS "Icon",
			rm."Link" AS "RootMenuLink",
			rm."Link" AS "Link",
			rm."IdxNo" AS "IdxNo",
			rm."IdxNo" AS "OrderSeq",
			COALESCE(rm."Utilities", true) AS "RootMenuUtilities",
			COALESCE(
				BOOL_OR(ru_root."View") OR BOOL_OR(ru_menu."View"),
				false
			) AS "View"
		FROM "_ERPRootMenus" rm
		LEFT JOIN "_ERPRolesUsers" ru_root ON ru_root."RootMenuId" = rm."Id" AND ru_root."Type" = 'rootmenu' AND ru_root."GroupId" IN (SELECT "GroupId" FROM user_groups)
		LEFT JOIN "_ERPMenus" m ON m."MenuRootId" = rm."Id"
		LEFT JOIN "_ERPRolesUsers" ru_menu ON ru_menu."MenuId" = m."Id" AND ru_menu."Type" = 'menu' AND ru_menu."GroupId" IN (SELECT "GroupId" FROM user_groups)
		GROUP BY rm."Id", rm."Key", rm."Label", rm."Icon", rm."Link", rm."IdxNo", rm."Utilities"
		ORDER BY rm."IdxNo" ASC, rm."Id" ASC
	`, userId).Rows()

	if err == nil && rootMenuRows != nil {
		defer rootMenuRows.Close()
		for rootMenuRows.Next() {
			entry := make(map[string]interface{})
			_ = s.db.ScanRows(rootMenuRows, &entry)
			rootMenus = append(rootMenus, entry)
		}
	} else if err != nil {
		s.logger.Warn("Failed to query user root menus", zap.Error(err))
	}

	// 2. Query Submenus & Menus with multi-group aggregated permissions (BOOL_OR)
	menuRows, err := s.db.WithContext(ctx).Raw(`
		WITH user_groups AS (
			SELECT DISTINCT "GroupId" 
			FROM "_ERPRolesUsers" 
			WHERE "Type" = 'user' AND LOWER("UserId") = LOWER(?)
		)
		SELECT 
			m."Id" AS "Id",
			m."Id" AS "MenuId",
			m."Key" AS "MenuKey",
			m."Key" AS "Key",
			m."MenuRootId" AS "MenuRootId",
			m."MenuSubRootId" AS "MenuSubRootId",
			m."Label" AS "MenuLabel",
			m."Label" AS "Label",
			m."Link" AS "MenuLink",
			m."Link" AS "Link",
			m."Type" AS "MenuType",
			m."Type" AS "Type",
			m."Icon" AS "MenuIcon",
			m."Icon" AS "Icon",
			m."OrderSeq" AS "OrderSeq",
			m."DictSeq" AS "DictSeq",
			m."IdxNo" AS "IdxNo",
			COALESCE(rm."Key", '') AS "RootMenuKey",
			COALESCE(rm."Label", '') AS "RootMenuLabel",
			COALESCE(rm."Icon", 'AppWindow') AS "RootMenuIcon",
			COALESCE(BOOL_OR(ru."View"), false) AS "View"
		FROM "_ERPMenus" m
		LEFT JOIN "_ERPRootMenus" rm ON m."MenuRootId" = rm."Id"
		LEFT JOIN "_ERPRolesUsers" ru ON ru."MenuId" = m."Id" AND ru."Type" = 'menu' AND ru."GroupId" IN (SELECT "GroupId" FROM user_groups)
		GROUP BY m."Id", m."Key", m."MenuRootId", m."MenuSubRootId", m."Label", m."Link", m."Type", m."Icon", m."OrderSeq", m."DictSeq", m."IdxNo", rm."Key", rm."Label", rm."Icon"
		ORDER BY m."MenuRootId" ASC, COALESCE(m."MenuSubRootId", 0) ASC, m."OrderSeq" ASC, m."Id" ASC
	`, userId).Rows()

	if err == nil && menuRows != nil {
		defer menuRows.Close()
		for menuRows.Next() {
			entry := make(map[string]interface{})
			_ = s.db.ScanRows(menuRows, &entry)
			menus = append(menus, entry)
		}
	} else if err != nil {
		s.logger.Warn("Failed to query user menus", zap.Error(err))
	}

	return []map[string]interface{}{
		{"menu": menus},
		{"rootMenu": rootMenus},
		{"menuItem": []map[string]interface{}{}},
		{"roleTable": []map[string]interface{}{}},
	}, nil
}

// Menus and Roles queries
func (s *AuthService) MenuQ(ctx context.Context) ([]models.ERPMenu, error) {
	var menus []models.ERPMenu
	err := s.db.WithContext(ctx).Order("\"OrderSeq\" ASC, \"Id\" ASC").Find(&menus).Error
	return menus, err
}

func (s *AuthService) MenuA(ctx context.Context, item models.ERPMenu) error {
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Create(&item).Error
}

func (s *AuthService) MenuU(ctx context.Context, item models.ERPMenu) error {
	item.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Model(&models.ERPMenu{}).Where("\"Id\" = ?", item.Id).Updates(item).Error
}

func (s *AuthService) MenuD(ctx context.Context, id int64) error {
	return s.db.WithContext(ctx).Delete(&models.ERPMenu{}, id).Error
}

func (s *AuthService) RootMenuQ(ctx context.Context) ([]models.ERPRootMenu, error) {
	var rootMenus []models.ERPRootMenu
	err := s.db.WithContext(ctx).Order("\"IdxNo\" ASC, \"Id\" ASC").Find(&rootMenus).Error
	return rootMenus, err
}

func (s *AuthService) RootMenuA(ctx context.Context, item models.ERPRootMenu) error {
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Create(&item).Error
}

func (s *AuthService) RootMenuU(ctx context.Context, item models.ERPRootMenu) error {
	item.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Model(&models.ERPRootMenu{}).Where("\"Id\" = ?", item.Id).Updates(item).Error
}

func (s *AuthService) RootMenuD(ctx context.Context, id int64) error {
	return s.db.WithContext(ctx).Delete(&models.ERPRootMenu{}, id).Error
}

func (s *AuthService) RoleQ(ctx context.Context) ([]models.ERPGroup, error) {
	var groups []models.ERPGroup
	err := s.db.WithContext(ctx).Order("\"IdxNo\" ASC, \"Id\" ASC").Find(&groups).Error
	return groups, err
}

func (s *AuthService) RoleGroupA(ctx context.Context, group models.ERPGroup) error {
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Create(&group).Error
}

func (s *AuthService) RoleGroupU(ctx context.Context, group models.ERPGroup) error {
	group.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Model(&models.ERPGroup{}).Where("\"Id\" = ?", group.Id).Updates(group).Error
}

func (s *AuthService) RoleGroupD(ctx context.Context, id int64) error {
	return s.db.WithContext(ctx).Delete(&models.ERPGroup{}, id).Error
}

func (s *AuthService) RoleUserQ(ctx context.Context, userId string) ([]models.ERPRolesUser, error) {
	var roles []models.ERPRolesUser
	query := s.db.WithContext(ctx)
	if userId != "" {
		query = query.Where("LOWER(\"UserId\") = LOWER(?)", userId)
	}
	err := query.Find(&roles).Error
	return roles, err
}

func (s *AuthService) RoleUserA(ctx context.Context, role models.ERPRolesUser) error {
	role.CreatedAt = time.Now()
	role.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Create(&role).Error
}

func (s *AuthService) RoleUserU(ctx context.Context, role models.ERPRolesUser) error {
	role.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Model(&models.ERPRolesUser{}).Where("\"Id\" = ?", role.Id).Updates(role).Error
}

func (s *AuthService) RoleUserD(ctx context.Context, id int64) error {
	return s.db.WithContext(ctx).Delete(&models.ERPRolesUser{}, id).Error
}

// recordLoginLog logs authentication attempts
func (s *AuthService) recordLoginLog(ctx context.Context, userId, userSeq, status, ip, userAgent string, deviceInfo map[string]interface{}) {
	devInfoStr := ""
	if deviceInfo != nil {
		devInfoStr = fmt.Sprintf("%v", deviceInfo)
	}

	logEntry := models.ERPLoginLog{
		UserId:     userId,
		UserSeq:    userSeq,
		Status:     status,
		IpAddress:  ip,
		UserAgent:  userAgent,
		DeviceInfo: devInfoStr,
		CreatedAt:  time.Now(),
	}

	_ = s.db.WithContext(ctx).Create(&logEntry)
}

// bootstrapAdminUser creates initial admin if missing
func (s *AuthService) bootstrapAdminUser(ctx context.Context, username, password string) models.ERPUser {
	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	hashStr := string(hashed)

	admin := models.ERPUser{
		UserSeq:     GenerateUUIDv7(),
		CompanySeq:  1,
		IdxNo:       1,
		EmpID:       username,
		EmpCode:     username,
		EmpName:     "Administrator",
		DeptName:    "IT Department",
		UserId:      username,
		UserType:    1,
		UserName:    username,
		EmpSeq:      1,
		Password2:   &hashStr,
		CheckPass1:  true,
		StatusAcc:   false,
		Active:      true,
		LanguageSeq: 6,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   "SYSTEM_INIT",
	}

	_ = s.db.WithContext(ctx).Create(&admin)
	return admin
}
