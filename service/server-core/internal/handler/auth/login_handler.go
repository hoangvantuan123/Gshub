package auth

import (
	"context"
	"strings"
	"time"

	models "server-core/internal/models/auth"
	"server-core/internal/utils"
	pb_login "server-core/proto/users/auth/login"

	"go.uber.org/zap"
	"google.golang.org/grpc/metadata"
)

type LoginHandler struct {
	pb_login.UnimplementedLoginServiceServer
	authService models.AuthService
	log         *zap.Logger
}

func NewLoginHandler(authSvc models.AuthService, log *zap.Logger) *LoginHandler {
	return &LoginHandler{
		authService: authSvc,
		log:         log,
	}
}

// Login implements LoginServiceServer.Login
func (h *LoginHandler) Login(ctx context.Context, req *pb_login.Request) (*pb_login.Response, error) {
	if req.Result == nil {
		return &pb_login.Response{
			Success: false,
			Message: "Dữ liệu yêu cầu không hợp lệ (Result is null)",
		}, nil
	}

	login := req.Result.Login
	password := req.Result.Password

	deviceInfo := map[string]interface{}{
		"deviceInfoWeb":  req.Result.DeviceInfoWeb,
		"deviceInfoSoft": req.Result.DeviceInfoSoft,
		"deviceInfoApp":  req.Result.DeviceInfoApp,
		"web":            req.Result.DeviceInfoWeb,
		"soft":           req.Result.DeviceInfoSoft,
		"app":            req.Result.DeviceInfoApp,
		"platformStatus": req.Result.PlatformStatus,
	}

	result, err := h.authService.LoginUserB(ctx, login, password, deviceInfo)
	if err != nil {
		if appErr, ok := err.(*models.AuthError); ok {
			numCode := utils.NormalizeCode(appErr.Code, false)
			h.log.Warn("[SERVER] Login Auth Failed",
				zap.String("code", numCode),
				zap.String("errCode", appErr.Code),
				zap.String("login", login),
			)
			errInfo := &pb_login.ErrorInfo{
				Code:    appErr.Code,
				Message: numCode,
			}
			return utils.ErrorWithCodeResponse[pb_login.Response](numCode, numCode, errInfo), nil
		}

		h.log.Error("[SERVER] Login System Error", zap.Error(err), zap.String("login", login))
		return utils.ErrorResponse[pb_login.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_login.Response]("2000", result), nil
}

// ChangePass implements LoginServiceServer.ChangePass
func (h *LoginHandler) ChangePass(ctx context.Context, req *pb_login.ChangePassRequest) (*pb_login.Response, error) {
	if req.Result == nil {
		return &pb_login.Response{
			Success: false,
			Message: "4001",
		}, nil
	}

	empId := req.Result.EmployeeId
	oldPass := req.Result.OldPassword
	newPass := req.Result.NewPassword

	result, err := h.authService.ChangePass(ctx, empId, oldPass, newPass)
	if err != nil {
		if appErr, ok := err.(*models.AuthError); ok {
			numCode := utils.NormalizeCode(appErr.Code, false)
			h.log.Warn("[SERVER] ChangePass Auth Failed",
				zap.String("code", numCode),
				zap.String("errCode", appErr.Code),
				zap.String("employeeId", empId),
			)
			errInfo := &pb_login.ErrorInfo{
				Code:    appErr.Code,
				Message: numCode,
			}
			return utils.ErrorWithCodeResponse[pb_login.Response](numCode, numCode, errInfo), nil
		}

		h.log.Error("[SERVER] ChangePass System Error", zap.Error(err), zap.String("employeeId", empId))
		return utils.ErrorResponse[pb_login.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_login.Response]("2000", result), nil
}

// Logout implements LoginServiceServer.Logout
func (h *LoginHandler) Logout(ctx context.Context, req *pb_login.Request) (*pb_login.Response, error) {
	token := ""
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if authHeader := md["authorization"]; len(authHeader) > 0 && authHeader[0] != "" {
			token = strings.TrimPrefix(authHeader[0], "Bearer ")
		}
	}

	if token == "" && req != nil && req.Result != nil && req.Result.Login != "" {
		token = req.Result.Login
	}

	userId := ""
	if ctxUserId, ok := ctx.Value("user_id").(string); ok {
		userId = ctxUserId
	}

	if token != "" {
		claims, err := utils.VerifyToken(token)
		exp := time.Now().Add(8 * time.Hour)
		if err == nil && claims != nil && claims.ExpiresAt != nil {
			exp = claims.ExpiresAt.Time
			if userId == "" {
				userId = claims.UserId
			}
		}
		utils.GlobalBlacklist.Revoke(token, exp)
		h.log.Info("[SERVER] User Logged Out & Token Revoked", zap.String("userId", userId))
	}

	return utils.SuccessResponse[pb_login.Response]("2000", map[string]interface{}{
		"loggedOut": true,
		"message":   "Đăng xuất thành công",
	}), nil
}
