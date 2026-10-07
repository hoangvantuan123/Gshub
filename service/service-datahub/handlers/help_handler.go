package handlers

import (
	"encoding/json"
	"net/http"

	"service-datahub/models"
	"service-datahub/services/help"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type HelpHandler struct {
	helpService *help.CodeHelpService
	logger      *zap.Logger
}

func NewHelpHandler(helpService *help.CodeHelpService, logger *zap.Logger) *HelpHandler {
	return &HelpHandler{
		helpService: helpService,
		logger:      logger,
	}
}

// CodeHelpQ & CodeHelpCmnQ handler
func (h *HelpHandler) CodeHelpQ(c *gin.Context) {
	var params help.CodeHelpParams

	// Đọc từ query params trước
	params.CodeHelpName = c.Query("CodeHelpName")
	params.TableName = c.Query("TableName")
	params.KeyType = c.Query("KeyType")
	params.KeyValue = c.Query("KeyValue")
	params.Search = c.Query("search")
	params.KeyItem1 = c.Query("KeyItem1")
	params.KeyItem2 = c.Query("KeyItem2")
	params.KeyItem3 = c.Query("KeyItem3")

	// Nếu là POST body
	var body struct {
		Result json.RawMessage `json:"result"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && len(body.Result) > 0 {
		_ = json.Unmarshal(body.Result, &params)
	}

	data, err := h.helpService.QueryCodeHelp(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{
			Success: false,
			Message: err.Error(),
			Data:    []interface{}{},
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data:    data,
	})
}

// LangH handler
func (h *HelpHandler) LangH(c *gin.Context) {
	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Message: "2000",
		Data: []map[string]interface{}{
			{"LanguageSeq": 6, "LanguageName": "Tiếng Việt (vi-VN)", "Code": "vi-VN"},
			{"LanguageSeq": 1, "LanguageName": "English (en-US)", "Code": "en-US"},
			{"LanguageSeq": 2, "LanguageName": "Korean (ko-KR)", "Code": "ko-KR"},
		},
	})
}

// UsersH handler
func (h *HelpHandler) UsersH(c *gin.Context) {
	params := help.CodeHelpParams{CodeHelpName: "USERS"}
	data, _ := h.helpService.QueryCodeHelp(c.Request.Context(), params)
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: data})
}

// MenuH handler
func (h *HelpHandler) MenuH(c *gin.Context) {
	params := help.CodeHelpParams{CodeHelpName: "MENU"}
	data, _ := h.helpService.QueryCodeHelp(c.Request.Context(), params)
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: data})
}

// RootMenuH handler
func (h *HelpHandler) RootMenuH(c *gin.Context) {
	params := help.CodeHelpParams{CodeHelpName: "ROOT_MENU"}
	data, _ := h.helpService.QueryCodeHelp(c.Request.Context(), params)
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: data})
}

// SubMenuH handler
func (h *HelpHandler) SubMenuH(c *gin.Context) {
	params := help.CodeHelpParams{CodeHelpName: "SUBMENU"}
	data, _ := h.helpService.QueryCodeHelp(c.Request.Context(), params)
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: data})
}
