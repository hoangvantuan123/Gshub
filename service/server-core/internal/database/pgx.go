package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"server-core/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

var PgPool *pgxpool.Pool

func ConnectPgx(log *zap.Logger) error {
	maxConns := config.Cfg.PostgresMaxConns
	minConns := config.Cfg.PostgresMinConns
	if maxConns <= 0 {
		maxConns = 35
	}
	if minConns <= 0 {
		minConns = 8
	}

	encodedPass := url.QueryEscape(config.Cfg.PostgresPass)
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable&pool_max_conns=%d&pool_min_conns=%d&pool_max_conn_lifetime=1h",
		config.Cfg.PostgresUser,
		encodedPass,
		config.Cfg.PostgresHost,
		config.Cfg.PostgresPort,
		config.Cfg.PostgresDB,
		maxConns,
		minConns,
	)

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse pgx config: %w", err)
	}

	// Tối ưu connection pool cho big data và tải cao
	cfg.MaxConns = int32(maxConns)
	cfg.MinConns = int32(minConns)
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres via pgxpool: %w", err)
	}

	// Ping check
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	PgPool = pool
	log.Info("Successfully connected to Database via PGXPOOL (High Performance Mode)")
	return nil
}
