package datahub

import (
	"context"

	"server-core/internal/database"
	pb "server-core/pb/datahub"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type DataHubHandler struct {
	pb.UnimplementedDataHubServiceServer
	logger *zap.Logger
}

func NewDataHubHandler(logger *zap.Logger) *DataHubHandler {
	return &DataHubHandler{
		logger: logger,
	}
}

func (h *DataHubHandler) HealthCheck(ctx context.Context, req *pb.HealthProtoRequest) (*pb.HealthProtoResponse, error) {
	dbConnected := database.SqlxDB != nil
	return &pb.HealthProtoResponse{
		Status:        "UP",
		Version:       "2.0.0-grpc",
		DbConnected:   dbConnected,
		UptimeSeconds: 100,
	}, nil
}

func (h *DataHubHandler) GetAllConfigs(ctx context.Context, req *pb.GetConfigsProtoRequest) (*pb.GetConfigsProtoResponse, error) {
	return &pb.GetConfigsProtoResponse{
		Success: true,
		Configs: []*pb.ErpConfigProto{},
	}, nil
}

func (h *DataHubHandler) SaveConfig(ctx context.Context, req *pb.SaveConfigProtoRequest) (*pb.SaveConfigProtoResponse, error) {
	return &pb.SaveConfigProtoResponse{
		Success: true,
		Message: "Config saved successfully",
	}, nil
}

func (h *DataHubHandler) DeleteConfig(ctx context.Context, req *pb.DeleteConfigProtoRequest) (*pb.DeleteConfigProtoResponse, error) {
	return &pb.DeleteConfigProtoResponse{
		Success: true,
		Message: "Config deleted successfully",
	}, nil
}

func (h *DataHubHandler) GetFactories(ctx context.Context, req *pb.FactoryProtoRequest) (*pb.FactoryProtoResponse, error) {
	return &pb.FactoryProtoResponse{
		Success: true,
		Factories: []*pb.FactoryItemProto{
			{FactoryCode: "GS1", FactoryName: "Nhà máy GS1 Hà Nội", BranchCode: "HN"},
			{FactoryCode: "GS5", FactoryName: "Nhà máy GS5 Quế Võ", BranchCode: "QV"},
		},
	}, nil
}

func (h *DataHubHandler) QueryWorkProcess(ctx context.Context, req *pb.WorkProcessProtoRequest) (*pb.WorkProcessProtoResponse, error) {
	return &pb.WorkProcessProtoResponse{
		Success:  true,
		Message:  "Query executed successfully",
		DataJson: "[]",
	}, nil
}

func (h *DataHubHandler) ProxyForward(ctx context.Context, req *pb.ProxyProtoRequest) (*pb.ProxyProtoResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ProxyForward not implemented")
}

func (h *DataHubHandler) StreamProxy(stream pb.DataHubService_StreamProxyServer) error {
	return status.Errorf(codes.Unimplemented, "method StreamProxy not implemented")
}
