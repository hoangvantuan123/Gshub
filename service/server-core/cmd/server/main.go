package main

//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/auth/login.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/auth/users.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/auth/log_login.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/app/group_role.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/app/screens.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/app/tabs.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/app/user_role.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/langs/langs.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/langs/dicts.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/menu.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/root_menu.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/role.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_actions.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_scopes.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_fields.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_resource_fields.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_resource_actions.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/roles/perm_resource_scopes.proto

//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/technique/tbl_grp.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/technique/tbl_grp_item.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/technique/tbl_grp_perm.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/technique/tbl_grp_perm_role.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/system/sys_attr_groups.proto
//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/users/system/sys_attr_items.proto

import (
	"context"
	"fmt"
	"server-core/internal/app"
	"server-core/internal/config"
	"server-core/internal/database"
	"server-core/internal/logger"
	"server-core/internal/middleware"
	"server-core/internal/worker"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
)

func main() {
	// 1. Load Config
	config.Load()

	// 2. Init Logger
	log, err := logger.Init()
	if err != nil {
		fmt.Printf("Error initializing logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	log.Info("Starting User Microservice (Go)")

	// 3. Connect to Database (Legacy GORM & SQLX)
	if err := database.Connect(log); err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}

	// 3.1 Connect to PGXPOOL (High Performance - Big Data)
	if err := database.ConnectPgx(log); err != nil {
		log.Fatal("Failed to connect to database via pgxpool", zap.Error(err))
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// High concurrency worker pool for async background execution
	wp := worker.NewPool(200, 50000, log)
	wp.Start(ctx)
	defer wp.Stop()

	//worker.RunStressTest(wp, log)

	// 4. Initialize Application Container (Dependency Injection)
	container, err := app.NewAppContainer(log, wp)
	if err != nil {
		log.Fatal("Failed to initialize app container", zap.Error(err))
	}

	// 5. Start gRPC Server with Middlewares (Interceptors)
	addr := fmt.Sprintf(":%d", config.Cfg.PortGrpc)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal("Failed to listen", zap.Error(err))
	}

	// CẤU TRÚC BẢO MẬT & TỐI ƯU KẾT NỐI: Config Keepalive EnforcementPolicy & ServerParameters
	kaPolicy := keepalive.EnforcementPolicy{
		MinTime:             5 * time.Second, // Cho phép Client ping tối thiểu 5s/lần
		PermitWithoutStream: true,            // Cho phép Client ping ngay cả khi không có active RPC stream
	}
	kaParams := keepalive.ServerParameters{
		MaxConnectionIdle: 15 * time.Minute, // Đóng kết nối nếu rảnh rỗi quá 15 phút
		Time:              2 * time.Hour,    // Kiểm tra kết nối định kỳ
		Timeout:           20 * time.Second, // Chờ phản hồi trong 20s
	}

	s := grpc.NewServer(
		grpc.KeepaliveEnforcementPolicy(kaPolicy),
		grpc.KeepaliveParams(kaParams),
		grpc.MaxConcurrentStreams(100000), // Cho phép tối đa 100,000 active streams song song
		grpc.MaxRecvMsgSize(100*1024*1024), // 100MB payload support
		grpc.MaxSendMsgSize(100*1024*1024), // 100MB payload support
		grpc.ChainUnaryInterceptor(
			middleware.RecoveryInterceptor(log),                  // Bảo vệ server khỏi crash (Panic)
			middleware.RateLimitInterceptor,                      // Giới hạn tần suất request (Anti Brute-force)
			middleware.AuthInterceptor,                           // Bảo mật: Kiểm tra Token gRPC & set User info vào context
			middleware.LoggingInterceptor(container.AuditLogSvc), // Full Audit Log (Asynchronous)
		),
	)

	// Register reflection for debugging
	reflection.Register(s)

	// 6. Register All Module Services
	container.RegisterServices(s)

	log.Info("gRPC Server listening", zap.String("addr", addr))

	// Graceful shutdown
	go func() {
		if err := s.Serve(lis); err != nil {
			log.Fatal("Failed to serve", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")
	s.GracefulStop()
	log.Info("Server stopped cleanly")
}
