package auth

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"server-core/internal/config"
	domain "server-core/internal/models/auth"
	"server-core/internal/proof"
	"server-core/internal/worker"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type authService struct {
	db     *sqlx.DB
	dbLogs *sqlx.DB
	wp     *worker.Pool
	log    *zap.Logger
}

func NewAuthService(db *sqlx.DB, dbLogs *sqlx.DB, wp *worker.Pool, log *zap.Logger) domain.AuthService {
	return &authService{
		db:     db,
		dbLogs: dbLogs,
		wp:     wp,
		log:    log,
	}
}

type loginLogJob struct {
	dbLogs   *sqlx.DB
	query    string
	logEntry domain.ERPLoginFullLogs
	log      *zap.Logger
	login    string
}

func (j *loginLogJob) Execute(ctx context.Context) error {
	_, err := j.dbLogs.NamedExecContext(ctx, j.query, j.logEntry)
	if err != nil {
		j.log.Error("Failed to write login log asynchronously", zap.Error(err), zap.String("login", j.login))
	}
	return err
}

func (s *authService) asBool(v interface{}) bool {
	if v == nil {
		return false
	}
	switch b := v.(type) {
	case bool:
		return b
	case int64:
		return b != 0
	case int32:
		return b != 0
	case int:
		return b != 0
	case float64:
		return b != 0
	case []byte:
		str := strings.TrimSpace(string(b))
		return strings.ToLower(str) == "true" || str == "1" || str == "t"
	case string:
		str := strings.TrimSpace(b)
		return strings.ToLower(str) == "true" || str == "1" || str == "t"
	}
	return false
}

func (s *authService) asInt(v interface{}) int {
	if v == nil {
		return 0
	}
	switch i := v.(type) {
	case int64:
		return int(i)
	case int32:
		return int(i)
	case int:
		return i
	case float64:
		return int(i)
	case float32:
		return int(i)
	case []byte:
		val, _ := strconv.Atoi(strings.TrimSpace(string(i)))
		return val
	case string:
		val, _ := strconv.Atoi(strings.TrimSpace(i))
		return val
	}
	return 0
}

func (s *authService) LoginUserB(ctx context.Context, login, password string, deviceInfo any) (any, error) {
	// 1. Decode Password (matching Buffer.from(password, 'base64').toString('utf8'))
	decodedPass, err := base64.StdEncoding.DecodeString(password)
	actualPassword := password
	if err == nil {
		actualPassword = string(decodedPass)
	}

	// 2. Sanitize Login
	login = s.sanitizeInput(login)

	// 3. Find User
	var user domain.ERPUsers
	err = s.db.GetContext(ctx, &user, `SELECT * FROM "_ERPUsers" WHERE LOWER("UserId") = LOWER($1) OR "EmpID" = $1 OR "EmpCode" = $1`, login)
	if err != nil {
		if s.log != nil {
			s.log.Error("[LoginUserB] Query user failed", zap.Error(err), zap.String("login", login))
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("load login account: %w", err)
		}
		s.writeLog(ctx, login, "", "USER_NOT_FOUND", deviceInfo)
		return nil, &domain.AuthError{Code: "USER_NOT_FOUND", Message: "Thông tin đăng nhập không hợp lệ"}
	}

	// 4. Compare Password
	if user.Password2 == nil {
		return nil, errors.New("account configuration error")
	}

	err = bcrypt.CompareHashAndPassword([]byte(*user.Password2), []byte(actualPassword))
	if err != nil {
		s.writeLog(ctx, login, user.UserSeq, "INVALID_CREDENTIALS", deviceInfo)
		return nil, &domain.AuthError{Code: "INVALID_CREDENTIALS", Message: "Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu"}
	}

	// 5. Check Status
	if user.StatusAcc {
		s.writeLog(ctx, login, user.UserSeq, "ACCOUNT_LOCKED", deviceInfo)
		return nil, &domain.AuthError{Code: "ACCOUNT_LOCKED", Message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ."}
	}

	if !user.CheckPass1 {
		s.writeLog(ctx, login, user.UserSeq, "ACCOUNT_NOT_ACTIVATED", deviceInfo)
		return nil, &domain.AuthError{Code: "ACCOUNT_NOT_ACTIVATED", Message: "Tài khoản chưa được kích hoạt. Vui lòng đổi mật khẩu để tiếp tục."}
	}

	// 6. Generate Main Token
	jwtSecret := config.Cfg.JwtSecret

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"UserId":     user.UserId,
		"Login":      user.UserName,
		"UserSeq":    user.UserSeq,
		"EmpSeq":     user.EmpSeq,
		"Remark":     user.Remark,
		"CompanySeq": user.CompanySeq,
		"cnf":        map[string]string{"jkt": proof.SessionKey(ctx)},
		"exp":        time.Now().Add(time.Hour * 8).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	canonicalUserID := login
	if user.UserId != nil {
		canonicalUserID = *user.UserId
	}
	rolesUserMenu, _, err := s.getDataRolesUserRaw(ctx, canonicalUserID, user.UserSeq)
	if err != nil {
		return nil, fmt.Errorf("load permissions: %w", err)
	}

	// The snapshot is signed; HTTPS protects the login response in transit.
	rolesTokenString, err := signRolesSnapshot(user.UserSeq, rolesUserMenu, time.Now().Add(time.Hour*8))
	if err != nil {
		return nil, err
	}

	s.writeLog(ctx, login, user.UserSeq, "SUCCESS", deviceInfo)

	langSeq := user.LanguageSeq
	if langSeq == 0 {
		langSeq = 6
	}

	return map[string]interface{}{
		"user": map[string]interface{}{
			"UserId":     user.UserId,
			"UserName":   user.UserName,
			"CompanySeq": user.CompanySeq,
			"UserType":   user.UserType,
			"EmpSeq":     user.EmpSeq,
			"UserSeq":    user.UserSeq,
		},
		"token":              tokenString,
		"tokenRolesUserMenu": rolesTokenString,
		"typeLanguage":       langSeq,
	}, nil
}

func (s *authService) sanitizeInput(input string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9@._]`)
	return re.ReplaceAllString(input, "")
}

func (s *authService) getDataRolesUserRaw(ctx context.Context, userId string, userSeq interface{}) ([]map[string]interface{}, []map[string]interface{}, error) {
	var groupIds []interface{}
	err := s.db.SelectContext(ctx, &groupIds, `SELECT DISTINCT "GroupId" FROM "_ERPRolesUsers" WHERE "Type" = 'user' AND "UserSeq" = $1`, userSeq)
	if err != nil {
		return nil, nil, err
	}
	if len(groupIds) == 0 {
		// Keep the complete response shape and still load direct table grants.
		groupIds = []interface{}{nil}
	}

	queryData := `
		SELECT r."Id" AS "Id",
			r."View" AS "View",
			r."Edit" AS "Edit",
			r."Create" AS "Create",
			r."Delete" AS "Delete",
			COALESCE((to_jsonb(r)->>'Import')::boolean, false) AS "Import",
			COALESCE((to_jsonb(r)->>'Export')::boolean, false) AS "Export",
			r."MenuId" AS "MenuId",
			r."GroupId" AS "GroupId",
			r."UserId" AS "UserId",
			r."RootMenuId" AS "RootMenuId",
			r."Type" AS "Type",
			r."Name" AS "Name",
			m."Key" AS "MenuKey",
			m."Label" AS "MenuLabel",
			m."Link" AS "MenuLink",
			m."Type" AS "MenuType",
			m."MenuSubRootId" AS "MenuSubRootId",
			m."MenuRootId" AS "MenuRootId",
			m."OrderSeq" AS "OrderSeq",
			rm."Key" AS "RootMenuKey",
			rm."Label" AS "RootMenuLabel",
			rm."Icon" AS "RootMenuIcon",
			rm."Link" AS "RootMenuLink",
			rm."Utilities" AS "RootMenuUtilities",
			rm."IdxNo" AS "RootMenuOrderSeq"
		FROM "_ERPRolesUsers" r
		LEFT JOIN "_ERPMenus" m ON r."MenuId" = m."Id" AND r."Type" IN ('menu', 'submenu', 'menuitem', 'action')
		LEFT JOIN "_ERPRootMenus" rm ON r."RootMenuId" = rm."Id" AND r."Type" IN ('rootmenu', 'root')
		WHERE r."GroupId" IN (?) AND r."Type" IN ('rootmenu', 'root', 'menu', 'submenu', 'menuitem', 'action')
	`
	query, args, err := sqlx.In(queryData, groupIds)
	if err != nil {
		return nil, nil, err
	}
	query = s.db.Rebind(query)

	rows, err := s.db.QueryxContext(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var rawDatas []map[string]interface{}
	for rows.Next() {
		m := make(map[string]interface{})
		if err := rows.MapScan(m); err != nil {
			return nil, nil, err
		}
		rawDatas = append(rawDatas, m)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, nil, err
	}

	queryRoleTable := `
		SELECT 
			p."TblGrpPermSeq" AS "TblGrpPermSeq",
			p."TblGrpSeq" AS "TblGrpSeq",
			g."KeyCode" AS "GroupKeyCode",
			p."TblGrpItemSeq" AS "TblGrpItemSeq",
			i."KeyCode" AS "ItemKeyCode",
			p."TypeRole" AS "TypeRole",
			p."View" AS "View",
			p."Edit" AS "Edit"
		FROM "_ERPTblGrpPermRole" p
		LEFT JOIN "_ERPTblGrp" g ON p."TblGrpSeq" = g."IdSeq"
		LEFT JOIN "_ERPTblGrpItem" i ON p."TblGrpItemSeq" = i."IdSeq"
		WHERE p."TblGrpPermSeq" = (
			SELECT "TblGrpPermSeq"
			FROM "_ERPTblGrpPermRole"
			WHERE "UserSeq" = $1 AND "TypeRole" = 'User'
			ORDER BY "IdSeq" DESC
			LIMIT 1
		)
		ORDER BY p."IdxNo" ASC
	`
	rowsRT, err := s.db.QueryxContext(ctx, queryRoleTable, userSeq)
	if err != nil {
		return nil, nil, err
	}
	defer rowsRT.Close()
	roleTables := make([]map[string]interface{}, 0)
	for rowsRT.Next() {
		m := make(map[string]interface{})
		if err := rowsRT.MapScan(m); err != nil {
			return nil, nil, err
		}
		roleTables = append(roleTables, m)
	}
	if err := rowsRT.Err(); err != nil {
		return nil, nil, err
	}

	merged := s.mergePermissions(rawDatas)
	if err := s.addNavigationAncestors(ctx, merged); err != nil {
		return nil, nil, err
	}

	result := []map[string]interface{}{
		{"menu": merged["menu"]},
		{"rootMenu": merged["rootMenu"]},
		{"menuItem": merged["menuItem"]},
		{"roleTable": roleTables},
		{"action": merged["action"]},
	}

	return result, nil, nil
}

// normalizePermissionRow handles both SQL driver bytes and regular maps.
func normalizePermissionRow(item map[string]interface{}) map[string]interface{} {
	row := make(map[string]interface{}, len(item))
	for key, value := range item {
		if bytes, ok := value.([]byte); ok {
			value = string(bytes)
		}
		row[strings.ToLower(key)] = value
	}
	return row
}

func (s *authService) mergePermissions(data []map[string]interface{}) map[string]interface{} {
	menus := make(map[int]map[string]interface{})
	roots := make(map[int]map[string]interface{})
	items := make(map[int]map[string]interface{})
	grants := make(map[int]map[string]bool)
	operations := []string{"View", "Create", "Edit", "Delete", "Import", "Export"}
	for _, source := range data {
		row := normalizePermissionRow(source)
		kind := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["type"])))
		var target map[string]interface{}
		if kind == "rootmenu" || kind == "root" {
			id := s.asInt(row["rootmenuid"])
			if id <= 0 {
				continue
			}
			target = roots[id]
			if target == nil {
				target = map[string]interface{}{
					"Id": id, "RootMenuId": id, "Type": "rootmenu",
					"RootMenuKey": row["rootmenukey"], "RootMenuLabel": row["rootmenulabel"],
					"RootMenuIcon": row["rootmenuicon"], "RootMenuLink": row["rootmenulink"],
					"RootMenuUtilities": s.asBool(row["rootmenuutilities"]),
					"OrderSeq":          s.asInt(row["rootmenuorderseq"]),
				}
				roots[id] = target
			}
		} else if kind == "menu" || kind == "submenu" || kind == "menuitem" || kind == "action" {
			id := s.asInt(row["menuid"])
			if id <= 0 {
				continue
			}
			menuType := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["menutype"])))
			if menuType == "<nil>" || menuType == "" {
				menuType = kind
				if menuType == "action" {
					menuType = "menu"
				}
			}
			bucket := menus
			if kind == "menuitem" || menuType == "menuitem" {
				bucket = items
			}
			target = bucket[id]
			if kind == "action" {
				key, _ := row["name"].(string)
				key = strings.ToUpper(strings.TrimSpace(key))
				if key == "" {
					continue
				}
				if grants[id] == nil {
					grants[id] = make(map[string]bool)
				}
				grants[id][key] = grants[id][key] || s.asBool(row["view"])
				// An action may exist without a legacy menu grant. Keep it only
				// when its MenuId still resolves to a real catalogue entry.
				if target == nil && (row["menukey"] == nil || row["menukey"] == "") {
					continue
				}
			}
			if target == nil {
				target = map[string]interface{}{
					"Id": id, "MenuId": id, "Type": menuType, "MenuType": menuType,
					"MenuKey": row["menukey"], "MenuLabel": row["menulabel"], "MenuLink": row["menulink"],
					"MenuRootId": s.asInt(row["menurootid"]), "MenuSubRootId": s.asInt(row["menusubrootid"]),
					"OrderSeq": s.asInt(row["orderseq"]),
				}
				bucket[id] = target
			}
			if kind == "action" {
				continue
			}
		} else {
			continue
		}
		for _, operation := range operations {
			target[operation] = s.asBool(target[operation]) || s.asBool(row[strings.ToLower(operation)])
		}
	}

	actions := make([]map[string]interface{}, 0)
	for _, bucket := range []map[int]map[string]interface{}{menus, items} {
		for id, menu := range bucket {
			menuActions := make(map[string]bool)
			for _, operation := range operations {
				menu[operation] = s.asBool(menu[operation])
				menuActions["BTN_"+strings.ToUpper(operation)] = s.asBool(menu[operation])
			}
			for key, allow := range grants[id] {
				menuActions[key] = menuActions[key] || allow
				menu[key] = allow
				operation := strings.TrimPrefix(key, "BTN_")
				for _, field := range operations {
					if strings.EqualFold(field, operation) {
						menu[field] = s.asBool(menu[field]) || allow
					}
				}
			}
			// The nested map is the complete source for standard and custom actions.
			for _, operation := range operations {
				menuActions["BTN_"+strings.ToUpper(operation)] = s.asBool(menu[operation])
			}
			menu["actions"] = menuActions
			keys := make([]string, 0, len(menuActions))
			for key := range menuActions {
				keys = append(keys, key)
			}
			sort.Strings(keys)
			for _, key := range keys {
				actions = append(actions, map[string]interface{}{"MenuId": id, "MenuKey": menu["MenuKey"], "ActionKey": key, "Allow": menuActions[key]})
			}
		}
	}
	sort.Slice(actions, func(i, j int) bool {
		a, b := s.asInt(actions[i]["MenuId"]), s.asInt(actions[j]["MenuId"])
		if a != b {
			return a < b
		}
		return fmt.Sprint(actions[i]["ActionKey"]) < fmt.Sprint(actions[j]["ActionKey"])
	})
	return map[string]interface{}{"menu": sortedPermissionRows(menus), "rootMenu": sortedPermissionRows(roots), "menuItem": sortedPermissionRows(items), "action": actions}
}

func sortedPermissionRows(rows map[int]map[string]interface{}) []map[string]interface{} {
	ids := make([]int, 0, len(rows))
	for id := range rows {
		ids = append(ids, id)
	}
	sort.Ints(ids)
	result := make([]map[string]interface{}, 0, len(ids))
	for _, id := range ids {
		result = append(result, rows[id])
	}
	return result
}

func (s *authService) writeLog(ctx context.Context, login string, userSeq interface{}, status string, deviceInfo any) {
	emptyStr := ""
	logEntry := domain.ERPLoginFullLogs{
		IdSeq:            uuid.Must(uuid.NewV7()).String(),
		Login:            login,
		UserSeq:          userSeq,
		StatusLogs:       &status,
		CreatedAt:        time.Now(),
		DeviceInfoWeb:    &emptyStr,
		DeviceInfoSoft:   &emptyStr,
		DeviceInfoApp:    &emptyStr,
		DeviceInfoWebIV:  &emptyStr,
		DeviceInfoSoftIV: &emptyStr,
		DeviceInfoAppIV:  &emptyStr,
		PlatformStatus:   &emptyStr,
	}

	if deviceInfo != nil {
		if m, ok := deviceInfo.(map[string]interface{}); ok {
			if platform, ok := m["platformStatus"].(string); ok && platform != "" {
				logEntry.PlatformStatus = &platform
			}

			softData, softIV := parseDeviceInfoField(m, "deviceInfoSoft", "soft")
			logEntry.DeviceInfoSoft = softData
			logEntry.DeviceInfoSoftIV = softIV

			webData, webIV := parseDeviceInfoField(m, "deviceInfoWeb", "web")
			logEntry.DeviceInfoWeb = webData
			logEntry.DeviceInfoWebIV = webIV

			appData, appIV := parseDeviceInfoField(m, "deviceInfoApp", "app")
			logEntry.DeviceInfoApp = appData
			logEntry.DeviceInfoAppIV = appIV
		}
	}

	query := `INSERT INTO "_ERPLoginFullLogs" (
		"IdSeq", "UserSeq", "Login", "StatusLogs", 
		"DeviceInfoWeb", "DeviceInfoSoft", "DeviceInfoApp",
		"DeviceInfoWebIV", "DeviceInfoSoftIV", "DeviceInfoAppIV",
		"PlatformStatus", "CreatedAt"
	) VALUES (
		:IdSeq, :UserSeq, :Login, :StatusLogs,
		:DeviceInfoWeb, :DeviceInfoSoft, :DeviceInfoApp,
		:DeviceInfoWebIV, :DeviceInfoSoftIV, :DeviceInfoAppIV,
		:PlatformStatus, :CreatedAt
	)`

	if s.wp != nil {
		s.wp.Submit(&loginLogJob{
			dbLogs:   s.dbLogs,
			query:    query,
			logEntry: logEntry,
			log:      s.log,
			login:    login,
		})
	} else {
		go func(bgCtx context.Context) {
			if bgCtx == nil {
				bgCtx = context.Background()
			}
			_, err := s.dbLogs.NamedExecContext(bgCtx, query, logEntry)
			if err != nil {
				s.log.Error("Failed to write login log asynchronously", zap.Error(err), zap.String("login", login))
			}
		}(ctx)
	}
}

// ChangePass xử lý đổi mật khẩu và tự động kích hoạt tài khoản (CheckPass1 = true)
func (s *authService) ChangePass(ctx context.Context, employeeId, oldPassword, newPassword string) (any, error) {
	// 1. Tự động giải mã Base64 nếu chuỗi mật khẩu được mã hóa Base64
	if decoded, err := base64.StdEncoding.DecodeString(oldPassword); err == nil && len(decoded) > 0 {
		oldPassword = string(decoded)
	}
	if decoded, err := base64.StdEncoding.DecodeString(newPassword); err == nil && len(decoded) > 0 {
		newPassword = string(decoded)
	}

	employeeId = s.sanitizeInput(employeeId)
	if employeeId == "" || oldPassword == "" || newPassword == "" {
		return nil, &domain.AuthError{Code: "INVALID_INPUT", Message: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu cũ và mật khẩu mới"}
	}

	// 1.1. Kiểm tra tuyệt đối không cho phép khoảng trắng trong mật khẩu mới
	if strings.ContainsAny(newPassword, " \t\r\n") {
		return nil, &domain.AuthError{Code: "INVALID_INPUT", Message: "Mật khẩu mới không được chứa khoảng trắng"}
	}

	// 1.2. Kiểm tra độ dài tối thiểu
	if len(newPassword) < 6 {
		return nil, &domain.AuthError{Code: "INVALID_INPUT", Message: "Mật khẩu mới phải có ít nhất 6 ký tự"}
	}

	// 1.3. Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
	if newPassword == oldPassword {
		return nil, &domain.AuthError{Code: "INVALID_INPUT", Message: "Mật khẩu mới không được trùng với mật khẩu hiện tại"}
	}

	// 2. Tìm người dùng theo UserId hoặc EmpID
	var user domain.ERPUsers
	err := s.db.GetContext(ctx, &user, `SELECT * FROM "_ERPUsers" WHERE "UserId" = $1 OR "EmpID" = $1`, employeeId)
	if err != nil {
		return nil, &domain.AuthError{Code: "USER_NOT_FOUND", Message: "Không tìm thấy thông tin tài khoản"}
	}

	// 3. Xác thực mật khẩu cũ
	if user.Password2 == nil || *user.Password2 == "" {
		return nil, &domain.AuthError{Code: "INVALID_CREDENTIALS", Message: "Tài khoản chưa khởi tạo mật khẩu"}
	}
	err = bcrypt.CompareHashAndPassword([]byte(*user.Password2), []byte(oldPassword))
	if err != nil {
		s.writeLog(ctx, employeeId, user.UserSeq, "CHANGE_PASS_FAILED", nil)
		return nil, &domain.AuthError{Code: "INVALID_CREDENTIALS", Message: "Mật khẩu cũ không chính xác"}
	}

	// 4. Băm mật khẩu mới bằng bcrypt
	hashedNew, err := bcrypt.GenerateFromPassword([]byte(newPassword), 10)
	if err != nil {
		return nil, err
	}
	hashedStr := string(hashedNew)

	// 5. Cập nhật mật khẩu mới và kích hoạt tài khoản (CheckPass1 = true)
	_, err = s.db.ExecContext(ctx, `UPDATE "_ERPUsers" SET "Password2" = $1, "CheckPass1" = true, "UpdatedAt" = NOW() WHERE "UserSeq" = $2`, hashedStr, user.UserSeq)
	if err != nil {
		return nil, err
	}

	s.writeLog(ctx, employeeId, user.UserSeq, "PASSWORD_CHANGED_ACTIVATED", nil)

	return map[string]interface{}{
		"Message": "Đổi mật khẩu và kích hoạt tài khoản thành công",
		"UserId":  user.UserId,
	}, nil
}

func parseDeviceInfoField(m map[string]interface{}, key1, key2 string) (dataPtr *string, ivPtr *string) {
	emptyStr := ""
	val, ok := m[key1]
	if !ok || val == nil || val == "" {
		val, ok = m[key2]
	}
	if !ok || val == nil {
		return &emptyStr, &emptyStr
	}

	// 1. Check if val implements protobuf DeviceInfo getter interface (GetData / GetIv)
	if dev, ok := val.(interface {
		GetData() string
		GetIv() string
	}); ok && dev != nil {
		dStr := dev.GetData()
		ivStr := dev.GetIv()
		return &dStr, &ivStr
	}

	// 2. Check if map[string]interface{}
	if obj, ok := val.(map[string]interface{}); ok {
		dStr := emptyStr
		ivStr := emptyStr
		if d, ok := obj["data"].(string); ok {
			dStr = d
		}
		if iv, ok := obj["iv"].(string); ok {
			ivStr = iv
		}
		return &dStr, &ivStr
	}

	// 3. Check if JSON string
	if str, ok := val.(string); ok && str != "" {
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(str), &parsed); err == nil {
			dStr := emptyStr
			ivStr := emptyStr
			if d, ok := parsed["data"].(string); ok {
				dStr = d
			}
			if iv, ok := parsed["iv"].(string); ok {
				ivStr = iv
			}
			if dStr != "" || ivStr != "" {
				return &dStr, &ivStr
			}
		}
		return &str, &emptyStr
	}

	// 4. Fallback: Marshal to JSON and unmarshal to map
	if bytes, err := json.Marshal(val); err == nil {
		var parsed map[string]interface{}
		if err := json.Unmarshal(bytes, &parsed); err == nil {
			dStr := emptyStr
			ivStr := emptyStr
			if d, ok := parsed["data"].(string); ok {
				dStr = d
			}
			if iv, ok := parsed["iv"].(string); ok {
				ivStr = iv
			}
			if dStr != "" || ivStr != "" {
				return &dStr, &ivStr
			}
		}
	}

	return &emptyStr, &emptyStr
}
