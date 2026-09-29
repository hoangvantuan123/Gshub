package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"service-datahub/models"
	"service-datahub/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AuthHandler struct {
	authService *services.AuthService
	logger      *zap.Logger
}

func NewAuthHandler(authService *services.AuthService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// Login handles POST /api/v2/acc/p2/login and POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var env models.AuthLoginEnvelope
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: "4001",
			Error:   "Dữ liệu yêu cầu không hợp lệ",
			Code:    4001,
		})
		return
	}

	login := env.Result.Login
	if login == "" {
		login = env.Result.Username
	}
	if login == "" {
		login = env.Username
	}
	if login == "" {
		login = env.Login
	}

	password := env.Result.Password
	if password == "" {
		password = env.Password
	}

	deviceInfo := map[string]interface{}{
		"deviceInfoWeb":  env.Result.DeviceInfoWeb,
		"deviceInfoSoft": env.Result.DeviceInfoSoft,
		"deviceInfoApp":  env.Result.DeviceInfoApp,
		"platformStatus": env.Result.PlatformStatus,
	}

	resp, err := h.authService.Login(
		c.Request.Context(),
		login,
		password,
		deviceInfo,
		c.ClientIP(),
		c.Request.UserAgent(),
	)

	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4001,
			Error: gin.H{
				"message": err.Error(),
				"code":    "INVALID_CREDENTIALS",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data:    resp,
	})
}

// Logout handles POST /api/v2/acc/p2/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")

	_ = h.authService.Logout(c.Request.Context(), token)

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"loggedOut": true,
			"message":   "Đăng xuất thành công",
		},
	})
}

// ChangePass handles POST /api/v2/acc/p2/change-password
func (h *AuthHandler) ChangePass(c *gin.Context) {
	var env models.ChangePassEnvelope
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: "4001",
			Error:   err.Error(),
		})
		return
	}

	empId := env.Result.EmployeeId
	if empId == "" {
		empId = env.EmployeeId
	}
	if empId == "" {
		if uid, ok := c.Get("user_id"); ok {
			empId, _ = uid.(string)
		}
	}

	oldPass := env.Result.OldPassword
	if oldPass == "" {
		oldPass = env.OldPassword
	}
	newPass := env.Result.NewPassword
	if newPass == "" {
		newPass = env.NewPassword
	}

	err := h.authService.ChangePass(c.Request.Context(), empId, oldPass, newPass)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4002,
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"message": "Đổi mật khẩu thành công",
		},
	})
}

// UsersAuthA handles POST /api/v2/acc/UsersAuthA (User Registration)
func (h *AuthHandler) UsersAuthA(c *gin.Context) {
	var env models.UserAuthEnvelope
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: "4001",
			Error:   err.Error(),
		})
		return
	}

	userReq := models.ERPUser{
		UserId:      env.Result.UserId,
		UserName:    env.Result.UserName,
		EmpID:       env.Result.EmpID,
		EmpCode:     env.Result.EmpCode,
		EmpName:     env.Result.EmpName,
		DeptName:    env.Result.DeptName,
		Email:       env.Result.Email,
		LanguageSeq: env.Result.LanguageSeq,
	}
	if userReq.UserId == "" {
		userReq.UserId = env.UserId
	}
	if userReq.UserName == "" {
		userReq.UserName = env.UserName
	}

	pass := env.Result.Password
	if pass == "" {
		pass = env.Password
	}
	if pass == "" {
		pass = env.Result.Password2
	}
	if pass == "" {
		pass = env.Password2
	}

	createdBy := ""
	if uid, ok := c.Get("user_id"); ok {
		createdBy, _ = uid.(string)
	}

	createdUser, err := h.authService.UsersAuthA(c.Request.Context(), userReq, pass, createdBy)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4003,
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data:    createdUser,
	})
}

// UsersAuthU handles POST /api/v2/acc/UsersAuthU
func (h *AuthHandler) UsersAuthU(c *gin.Context) {
	var env models.UserAuthEnvelope
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: "4001",
			Error:   err.Error(),
		})
		return
	}

	userReq := models.ERPUser{
		UserSeq:     env.Result.UserSeq,
		UserId:      env.Result.UserId,
		UserName:    env.Result.UserName,
		EmpName:     env.Result.EmpName,
		DeptName:    env.Result.DeptName,
		Email:       env.Result.Email,
		LanguageSeq: env.Result.LanguageSeq,
	}
	if userReq.UserId == "" {
		userReq.UserId = env.UserId
	}

	updatedBy := ""
	if uid, ok := c.Get("user_id"); ok {
		updatedBy, _ = uid.(string)
	}

	err := h.authService.UsersAuthU(c.Request.Context(), userReq, updatedBy)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4004,
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"updated": true,
		},
	})
}

// UsersAuthD handles POST /api/v2/acc/UsersAuthD
func (h *AuthHandler) UsersAuthD(c *gin.Context) {
	var req struct {
		UserSeq string `json:"UserSeq"`
		UserId  string `json:"UserId"`
		Result  struct {
			UserSeq string `json:"UserSeq"`
			UserId  string `json:"UserId"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	id := req.Result.UserSeq
	if id == "" {
		id = req.Result.UserId
	}
	if id == "" {
		id = req.UserSeq
	}
	if id == "" {
		id = req.UserId
	}

	err := h.authService.UsersAuthD(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4005,
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"deleted": true,
		},
	})
}

// UsersAuthQ handles POST /api/v2/acc/UsersAuthQ
func (h *AuthHandler) UsersAuthQ(c *gin.Context) {
	var req struct {
		Keyword string `json:"keyword"`
		Limit   int    `json:"limit"`
		Offset  int    `json:"offset"`
		Page    int    `json:"page"`
		Result  struct {
			Keyword string `json:"keyword"`
			Limit   int    `json:"limit"`
			Offset  int    `json:"offset"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	kw := req.Result.Keyword
	if kw == "" {
		kw = req.Keyword
	}
	limit := req.Result.Limit
	if limit == 0 {
		limit = req.Limit
	}
	if limit == 0 {
		limit = 50
	}
	offset := req.Result.Offset
	if offset == 0 {
		offset = req.Offset
	}

	users, total, err := h.authService.UsersAuthQ(c.Request.Context(), kw, limit, offset)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Code:    4006,
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data:    users,
		Meta: gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}

// UsersAuthUStatusAcc handles POST /api/v2/acc/UsersAuthUStatusAcc
func (h *AuthHandler) UsersAuthUStatusAcc(c *gin.Context) {
	var req struct {
		UserId    string `json:"UserId"`
		StatusAcc bool   `json:"StatusAcc"`
		Result    struct {
			UserId    string `json:"UserId"`
			StatusAcc bool   `json:"StatusAcc"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	userId := req.Result.UserId
	if userId == "" {
		userId = req.UserId
	}
	status := req.Result.StatusAcc
	if req.StatusAcc {
		status = req.StatusAcc
	}

	err := h.authService.UsersAuthUStatusAcc(c.Request.Context(), userId, status)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"statusAcc": status,
		},
	})
}

// UpdatePasswords handles POST /api/v2/acc/UPass2
func (h *AuthHandler) UpdatePasswords(c *gin.Context) {
	var req struct {
		UserId      string `json:"UserId"`
		NewPassword string `json:"NewPassword"`
		Password    string `json:"Password"`
		Result      struct {
			UserId      string `json:"UserId"`
			NewPassword string `json:"NewPassword"`
			Password    string `json:"Password"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	userId := req.Result.UserId
	if userId == "" {
		userId = req.UserId
	}
	newPass := req.Result.NewPassword
	if newPass == "" {
		newPass = req.Result.Password
	}
	if newPass == "" {
		newPass = req.NewPassword
	}
	if newPass == "" {
		newPass = req.Password
	}

	err := h.authService.UpdatePasswords(c.Request.Context(), userId, newPass)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: gin.H{
			"message": "Cập nhật mật khẩu thành công",
		},
	})
}

// MenuQ handles POST /api/v2/menu/MenuQ
func (h *AuthHandler) MenuQ(c *gin.Context) {
	menus, err := h.authService.MenuQ(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: menus})
}

// RootMenuQ handles POST /api/v2/menu/RootMenuQ
func (h *AuthHandler) RootMenuQ(c *gin.Context) {
	rootMenus, err := h.authService.RootMenuQ(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: rootMenus})
}

// RoleQ handles POST /api/v2/role/RoleQ
func (h *AuthHandler) RoleQ(c *gin.Context) {
	roles, err := h.authService.RoleQ(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: roles})
}

// UserRoleQ handles POST /api/v2/role/UserRoleQ
func (h *AuthHandler) UserRoleQ(c *gin.Context) {
	userId := c.Query("userId")
	if userId == "" {
		var req struct {
			UserId string `json:"UserId"`
			Result struct {
				UserId string `json:"UserId"`
			} `json:"result"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			userId = req.Result.UserId
			if userId == "" {
				userId = req.UserId
			}
		}
	}

	roles, err := h.authService.RoleUserQ(c.Request.Context(), userId)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: roles})
}

// UserRoleA handles POST /api/v2/role/UserRoleA
func (h *AuthHandler) UserRoleA(c *gin.Context) {
	var role models.ERPRolesUser
	if err := c.ShouldBindJSON(&role); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	if err := h.authService.RoleUserA(c.Request.Context(), role); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: role})
}

// UserRoleU handles POST /api/v2/role/UserRoleU
func (h *AuthHandler) UserRoleU(c *gin.Context) {
	var role models.ERPRolesUser
	if err := c.ShouldBindJSON(&role); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	if err := h.authService.RoleUserU(c.Request.Context(), role); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: role})
}

// UserRoleD handles POST /api/v2/role/UserRoleD
func (h *AuthHandler) UserRoleD(c *gin.Context) {
	var req struct {
		Id int64 `json:"Id"`
	}
	_ = c.ShouldBindJSON(&req)
	idStr := c.Query("id")
	if idStr != "" {
		req.Id, _ = strconv.ParseInt(idStr, 10, 64)
	}

	if err := h.authService.RoleUserD(c.Request.Context(), req.Id); err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}
