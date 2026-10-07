package system

import (
	"encoding/json"
	"net/http"

	"service-datahub/models"
	"service-datahub/services/system/user_auth"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type UserAuthHandler struct {
	userService *user_auth.UserAuthService
	logger      *zap.Logger
}

func NewUserAuthHandler(userService *user_auth.UserAuthService, logger *zap.Logger) *UserAuthHandler {
	return &UserAuthHandler{
		userService: userService,
		logger:      logger,
	}
}

// ─── USER QUERY (Q) ───
func (h *UserAuthHandler) UsersAuthQ(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var params user_auth.QueryUserParams
	if len(req.Result) > 0 {
		_ = json.Unmarshal(req.Result, &params)
	}

	result, err := h.userService.QueryUsers(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data:    result.Data,
		Meta: gin.H{
			"total":    result.Total,
			"totalAll": result.TotalAll,
			"page":     result.Page,
			"pageSize": result.PageSize,
		},
	})
}

// ─── USER INSERT (A) ───
func (h *UserAuthHandler) UsersAuthA(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []user_auth.UserItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single user_auth.UserItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	inserted, err := h.userService.AddUsers(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: inserted})
}

// ─── USER UPDATE (U) ───
func (h *UserAuthHandler) UsersAuthU(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []user_auth.UserItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single user_auth.UserItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	updated, err := h.userService.UpdateUsers(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: updated})
}

// ─── USER DELETE (D) ───
func (h *UserAuthHandler) UsersAuthD(c *gin.Context) {
	var req struct {
		UserIds []string `json:"userIds"`
		Result  struct {
			UserSeq string `json:"UserSeq"`
			UserId  string `json:"UserId"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	userIds := req.UserIds
	if len(userIds) == 0 {
		id := req.Result.UserSeq
		if id == "" {
			id = req.Result.UserId
		}
		if id != "" {
			userIds = append(userIds, id)
		}
	}

	err := h.userService.DeleteUsers(c.Request.Context(), userIds)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}
