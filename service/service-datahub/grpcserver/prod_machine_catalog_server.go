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
	"service-datahub/services/report/prod_machine_catalog"
)

type prodMachineCatalogServer struct {
	pb.UnimplementedProdMachineCatalogServiceServer
	svc    *prod_machine_catalog.ProdMachineCatalogService
	logger *zap.Logger
}

func (s *prodMachineCatalogServer) ProdMachineCatalogA(ctx context.Context, req *pb.ProdMachineCatalogRequest) (*pb.ProdMachineCatalogResponse, error) {
	return s.execute(ctx, "A", req)
}
func (s *prodMachineCatalogServer) ProdMachineCatalogU(ctx context.Context, req *pb.ProdMachineCatalogRequest) (*pb.ProdMachineCatalogResponse, error) {
	return s.execute(ctx, "U", req)
}
func (s *prodMachineCatalogServer) ProdMachineCatalogD(ctx context.Context, req *pb.ProdMachineCatalogRequest) (*pb.ProdMachineCatalogResponse, error) {
	return s.execute(ctx, "D", req)
}
func (s *prodMachineCatalogServer) ProdMachineCatalogQ(ctx context.Context, req *pb.ProdMachineCatalogRequest) (*pb.ProdMachineCatalogResponse, error) {
	return s.execute(ctx, "Q", req)
}

func (s *prodMachineCatalogServer) execute(ctx context.Context, operation string, req *pb.ProdMachineCatalogRequest) (*pb.ProdMachineCatalogResponse, error) {
	userId := ""
	if user := auth.AuthenticatedUserFromContext(ctx); user != nil {
		if user.UserId != "" {
			userId = user.UserId
		} else {
			userId = user.UserSeq
		}
	}
	if userId == "" {
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			if vals := md.Get("user_id"); len(vals) > 0 && vals[0] != "" {
				userId = vals[0]
			} else if vals := md.Get("x-user-id"); len(vals) > 0 && vals[0] != "" {
				userId = vals[0]
			}
		}
	}
	if userId == "" && operation == "D" {
		userId = "SYSTEM"
	}
	s.logger.Info("DEBUG execute ProdMachineCatalog", zap.String("op", operation), zap.String("user_id", userId))
	result, err := s.svc.Execute(ctx, operation, []byte(req.FiltersJson), userId)
	if err != nil {
		var apiErr *prod_machine_catalog.APIError
		if errors.As(err, &apiErr) {
			code := codes.InvalidArgument
			switch apiErr.Status {
			case 401:
				code = codes.Unauthenticated
			case 404:
				code = codes.NotFound
			case 409:
				code = codes.FailedPrecondition
			}
			return nil, status.Error(code, apiErr.Message)
		}
		s.logger.Error("ProdMachineCatalog RPC failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "Lỗi xử lý dữ liệu danh mục máy móc")
	}
	data, err := json.Marshal(result.Data)
	if err != nil {
		return nil, status.Error(codes.Internal, "Không thể mã hóa dữ liệu")
	}
	resp := &pb.ProdMachineCatalogResponse{Success: true, DataJson: string(data)}
	if result.PageInfo != nil {
		page, err := json.Marshal(result.PageInfo)
		if err != nil {
			return nil, status.Error(codes.Internal, "Không thể mã hóa phân trang")
		}
		resp.Page = string(page)
	}
	return resp, nil
}
