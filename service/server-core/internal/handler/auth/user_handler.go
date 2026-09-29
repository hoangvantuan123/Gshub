package auth

import (
	"context"
	"encoding/json"
	"strings"

	models "server-core/internal/models/auth"
	userService "server-core/internal/service/auth/user"
	"server-core/internal/utils"
	pb_users "server-core/proto/users/auth/users"

	"go.uber.org/zap"
)

type UserHandler struct {
	pb_users.UnimplementedUsersServiceServer
	userService *userService.UserAuthService
	log         *zap.Logger
}

func NewUserHandler(userSvc *userService.UserAuthService, log *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userSvc,
		log:         log,
	}
}

// UsersAuthA implements UsersServiceServer.UsersAuthA
func (h *UserHandler) UsersAuthA(ctx context.Context, req *pb_users.UsersAuthARequest) (*pb_users.Response, error) {
	if len(req.Result) == 0 {
		return &pb_users.Response{
			Success: false,
			Message: "Dữ liệu yêu cầu trống",
		}, nil
	}

	var users []models.ERPUsers
	for _, r := range req.Result {
		idxNo := int(r.IdxNo)
		createdBy := r.CreatedBy
		userId := r.UserId
		userName := r.UserName
		empID := r.EmpID
		email := r.Email

		users = append(users, models.ERPUsers{
			IdxNo:     &idxNo,
			UserId:    &userId,
			UserName:  &userName,
			EmpID:     &empID,
			Email:     &email,
			CreatedBy: &createdBy,
		})
	}

	result, err := h.userService.UsersAuthA(ctx, users)
	if err != nil {
		h.log.Error("[SERVER] UsersAuthA Failed", zap.Error(err))
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	h.log.Info("[SERVER] Success: /users.auth.users.UsersService/UsersAuthA",
		zap.Bool("success", true),
	)

	return utils.SuccessResponse[pb_users.Response]("Thêm mới người dùng thành công", result), nil
}

// UsersAuthU implements UsersServiceServer.UsersAuthU
func (h *UserHandler) UsersAuthU(ctx context.Context, req *pb_users.UsersAuthURequest) (*pb_users.Response, error) {
	var users []models.ERPUsers
	for _, r := range req.Result {
		idxNo := int(r.IdxNo)
		updatedBy := r.UpdatedBy
		seq := r.UserSeq
		userName := r.UserName
		empID := r.EmpID
		email := r.Email

		users = append(users, models.ERPUsers{
			UserSeq:   seq,
			IdxNo:     &idxNo,
			UserName:  &userName,
			EmpID:     &empID,
			Email:     &email,
			UpdatedBy: &updatedBy,
		})
	}

	result, err := h.userService.UsersAuthU(ctx, users)
	if err != nil {
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_users.Response]("Cập nhật người dùng thành công", result), nil
}

// UsersAuthD implements UsersServiceServer.UsersAuthD
func (h *UserHandler) UsersAuthD(ctx context.Context, req *pb_users.UsersAuthDRequest) (*pb_users.Response, error) {
	var ids []string
	for _, r := range req.Result {
		ids = append(ids, r.UserSeq)
	}

	result, err := h.userService.UsersAuthD(ctx, ids)
	if err != nil {
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_users.Response]("Xóa người dùng thành công", result), nil
}

// UsersAuthQ implements UsersServiceServer.UsersAuthQ
func (h *UserHandler) UsersAuthQ(ctx context.Context, req *pb_users.UsersAuthQRequest) (*pb_users.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	if h.log != nil {
		h.log.Info("[gRPC Server UsersAuthQ] Nhận dữ liệu tìm kiếm",
			zap.Any("req.Result", req.Result),
			zap.Any("filters_parsed", filters),
		)
	}

	result, pageInfo, err := h.userService.UsersAuthQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pb_users.Response]("Truy vấn thành công", result, pageStr), nil
}

// UsersAuthUStatusAcc implements UsersServiceServer.UsersAuthUStatusAcc
func (h *UserHandler) UsersAuthUStatusAcc(ctx context.Context, req *pb_users.UsersAuthUStatusAccRequest) (*pb_users.Response, error) {
	var users []models.ERPUsers
	for _, r := range req.Result {
		user := models.ERPUsers{
			UserSeq:   r.UserSeq,
			StatusAcc: r.StatusAcc,
		}
		idx := int(r.IdxNo)
		user.IdxNo = &idx
		users = append(users, user)
	}

	result, err := h.userService.UsersAuthUStatusAcc(ctx, users)
	if err != nil {
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_users.Response]("Cập nhật trạng thái tài khoản thành công", result), nil
}

// UpdatePasswords implements UsersServiceServer.UpdatePasswords
func (h *UserHandler) UpdatePasswords(ctx context.Context, req *pb_users.UpdatePasswordsRequest) (*pb_users.Response, error) {
	var users []models.ERPUsers
	for _, r := range req.Result {
		seq := r.UserSeq
		userId := r.UserId
		users = append(users, models.ERPUsers{
			UserSeq: seq,
			UserId:  &userId,
		})
	}

	result, err := h.userService.UPasswordForUsers(ctx, users)
	if err != nil {
		return utils.ErrorResponse[pb_users.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_users.Response]("Đặt lại mật khẩu thành công", result), nil
}
