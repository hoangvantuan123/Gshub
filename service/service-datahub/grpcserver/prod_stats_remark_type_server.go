package grpcserver

import (
	"context"
	"encoding/json"
	"errors"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"service-datahub/auth"
	pb "service-datahub/pb/datahub"
	"service-datahub/services/report/prod_stats_remark_type"
)

type prodStatsRemarkTypeServer struct {
	pb.UnimplementedProdStatsRemarkTypeServiceServer
	svc    *prod_stats_remark_type.ProdStatsRemarkTypeService
	logger *zap.Logger
}

func (s *prodStatsRemarkTypeServer) ProdStatsRemarkTypeA(ctx context.Context, req *pb.ProdStatsRemarkTypeRequest) (*pb.ProdStatsRemarkTypeResponse, error) {
	return s.execute(ctx, "A", req)
}
func (s *prodStatsRemarkTypeServer) ProdStatsRemarkTypeU(ctx context.Context, req *pb.ProdStatsRemarkTypeRequest) (*pb.ProdStatsRemarkTypeResponse, error) {
	return s.execute(ctx, "U", req)
}
func (s *prodStatsRemarkTypeServer) ProdStatsRemarkTypeD(ctx context.Context, req *pb.ProdStatsRemarkTypeRequest) (*pb.ProdStatsRemarkTypeResponse, error) {
	return s.execute(ctx, "D", req)
}
func (s *prodStatsRemarkTypeServer) ProdStatsRemarkTypeQ(ctx context.Context, req *pb.ProdStatsRemarkTypeRequest) (*pb.ProdStatsRemarkTypeResponse, error) {
	return s.execute(ctx, "Q", req)
}

func (s *prodStatsRemarkTypeServer) execute(ctx context.Context, operation string, req *pb.ProdStatsRemarkTypeRequest) (*pb.ProdStatsRemarkTypeResponse, error) {
	userSeq := ""
	if user := auth.AuthenticatedUserFromContext(ctx); user != nil {
		userSeq = user.UserSeq
	}
	result, err := s.svc.Execute(ctx, operation, []byte(req.FiltersJson), userSeq)
	if err != nil {
		var apiErr *prod_stats_remark_type.APIError
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
		s.logger.Error("ProdStatsRemarkType RPC failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "Lỗi xử lý dữ liệu phân loại")
	}
	data, err := json.Marshal(result.Data)
	if err != nil {
		return nil, status.Error(codes.Internal, "Không thể mã hóa dữ liệu")
	}
	resp := &pb.ProdStatsRemarkTypeResponse{Success: true, DataJson: string(data)}
	if result.PageInfo != nil {
		page, err := json.Marshal(result.PageInfo)
		if err != nil {
			return nil, status.Error(codes.Internal, "Không thể mã hóa phân trang")
		}
		resp.Page = string(page)
	}
	return resp, nil
}
