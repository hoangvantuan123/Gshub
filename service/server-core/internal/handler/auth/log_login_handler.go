package auth

import (
	"context"
	"encoding/json"
	"strings"

	auth_svc "server-core/internal/service/auth"
	"server-core/internal/utils"
	pb_log_login "server-core/proto/users/auth/log_login"

	"go.uber.org/zap"
)

type LogLoginHandler struct {
	pb_log_login.UnimplementedLogLoginServiceServer
	logService *auth_svc.LogLoginService
	log        *zap.Logger
}

func NewLogLoginHandler(logSvc *auth_svc.LogLoginService, log *zap.Logger) *LogLoginHandler {
	return &LogLoginHandler{
		logService: logSvc,
		log:        log,
	}
}

// LogLoginQ implements LogLoginServiceServer.LogLoginQ
func (h *LogLoginHandler) LogLoginQ(ctx context.Context, req *pb_log_login.LogLoginQRequest) (*pb_log_login.Response, error) {
	filters := make(map[string]string)
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	if req.Result != nil {
		if req.Result.KeyItem1 != "" {
			filters["KeyItem1"] = req.Result.KeyItem1
			filters["Login"] = req.Result.KeyItem1
		}
		if req.Result.KeyItem2 != "" {
			filters["KeyItem2"] = req.Result.KeyItem2
			filters["PlatformStatus"] = req.Result.KeyItem2
		}
		if req.Result.KeyItem3 != "" {
			filters["KeyItem3"] = req.Result.KeyItem3
			filters["StatusLogs"] = req.Result.KeyItem3
		}
		if req.Result.KeyItem4 != "" {
			filters["KeyItem4"] = req.Result.KeyItem4
		}
	}

	if h.log != nil {
		h.log.Info("[gRPC Server LogLoginQ] Nhận yêu cầu truy vấn log đăng nhập", zap.Any("filters", filters))
	}

	result, pageInfo, err := h.logService.LogLoginQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponse[pb_log_login.Response](err.Error()), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pb_log_login.Response]("Truy vấn danh sách log đăng nhập thành công", result, pageStr), nil
}

// LogLoginD implements LogLoginServiceServer.LogLoginD
func (h *LogLoginHandler) LogLoginD(ctx context.Context, req *pb_log_login.LogLoginDRequest) (*pb_log_login.Response, error) {
	if len(req.Result) == 0 {
		return utils.ErrorResponse[pb_log_login.Response]("Danh sách ID xóa trống"), nil
	}

	var ids []string
	for _, item := range req.Result {
		if item.IdSeq != "" {
			ids = append(ids, item.IdSeq)
		}
	}

	result, err := h.logService.LogLoginD(ctx, ids)
	if err != nil {
		return utils.ErrorResponse[pb_log_login.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_log_login.Response]("Xóa log đăng nhập thành công", result), nil
}
