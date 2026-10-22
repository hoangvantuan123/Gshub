package grpcserver

import (
	"context"
	"encoding/json"
	"errors"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"service-datahub/auth"
	pb "service-datahub/pb/datahub"
	"service-datahub/services/report/prod_machine_registration"
)

type prodMachineRegistrationServer struct {
	pb.UnimplementedProdMachineRegistrationServiceServer
	svc    *prod_machine_registration.Service
	logger *zap.Logger
}

func (s *prodMachineRegistrationServer) ProdMachineRegistrationA(ctx context.Context, req *pb.ProdMachineRegistrationRequest) (*pb.ProdMachineRegistrationResponse, error) {
	return s.execute(ctx, "A", req)
}
func (s *prodMachineRegistrationServer) ProdMachineRegistrationD(ctx context.Context, req *pb.ProdMachineRegistrationRequest) (*pb.ProdMachineRegistrationResponse, error) {
	return s.execute(ctx, "D", req)
}
func (s *prodMachineRegistrationServer) ProdMachineRegistrationQ(ctx context.Context, req *pb.ProdMachineRegistrationRequest) (*pb.ProdMachineRegistrationResponse, error) {
	return s.execute(ctx, "Q", req)
}

func (s *prodMachineRegistrationServer) execute(ctx context.Context, operation string, req *pb.ProdMachineRegistrationRequest) (*pb.ProdMachineRegistrationResponse, error) {
	userID := ""
	if user := auth.AuthenticatedUserFromContext(ctx); user != nil {
		userID = user.UserId
		if userID == "" {
			userID = user.UserSeq
		}
	}
	if userID == "" {
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			for _, key := range []string{"user_id", "x-user-id"} {
				if values := md.Get(key); len(values) > 0 && values[0] != "" {
					userID = values[0]
					break
				}
			}
		}
	}
	result, err := s.svc.Execute(ctx, operation, []byte(req.GetFiltersJson()), userID)
	if err != nil {
		var apiErr *prod_machine_registration.APIError
		if errors.As(err, &apiErr) {
			code := codes.InvalidArgument
			if apiErr.Status == 401 {
				code = codes.Unauthenticated
			}
			return nil, status.Error(code, apiErr.Message)
		}
		s.logger.Error("ProdMachineRegistration RPC failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "Lỗi xử lý đăng ký báo cáo máy")
	}
	data, err := json.Marshal(result.Data)
	if err != nil {
		return nil, status.Error(codes.Internal, "Không thể mã hóa dữ liệu")
	}
	response := &pb.ProdMachineRegistrationResponse{Success: result.Success, DataJson: string(data)}
	if result.PageInfo != nil {
		page, err := json.Marshal(result.PageInfo)
		if err != nil {
			return nil, status.Error(codes.Internal, "Không thể mã hóa phân trang")
		}
		response.Page = string(page)
	}
	return response, nil
}
