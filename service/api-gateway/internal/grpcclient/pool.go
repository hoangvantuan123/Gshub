package grpcclient

import (
	"fmt"
	"math"
	"sync"
	"sync/atomic"
	"time"

	"api-gateway/internal/worker"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

const ConnsPerHost = 5

type Pool struct {
	mu         sync.RWMutex
	conns      map[string][]*grpc.ClientConn
	index      map[string]*uint32
	logger     *zap.Logger
	WorkerPool *worker.Pool
}

// New creates a new Pool.
func New(logger *zap.Logger, wp *worker.Pool) *Pool {
	return &Pool{
		conns:      make(map[string][]*grpc.ClientConn),
		index:      make(map[string]*uint32),
		logger:     logger,
		WorkerPool: wp,
	}
}

func (p *Pool) Get(host string) (*grpc.ClientConn, error) {
	p.mu.RLock()
	conns, ok := p.conns[host]
	idxPtr := p.index[host]
	p.mu.RUnlock()

	if ok && len(conns) == ConnsPerHost {
		idx := atomic.AddUint32(idxPtr, 1)
		return conns[idx%uint32(len(conns))], nil
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	conns, ok = p.conns[host]
	idxPtr = p.index[host]
	if ok && len(conns) == ConnsPerHost {
		idx := atomic.AddUint32(idxPtr, 1)
		return conns[idx%uint32(len(conns))], nil
	}

	if !ok {
		p.conns[host] = make([]*grpc.ClientConn, 0, ConnsPerHost)
		var initialIdx uint32 = 0
		p.index[host] = &initialIdx
	}
	idxPtr = p.index[host]

	for len(p.conns[host]) < ConnsPerHost {
		conn, err := p.dial(host)
		if err != nil {
			return nil, err
		}
		p.conns[host] = append(p.conns[host], conn)
		p.logger.Info("gRPC connection established",
			zap.String("host", host),
			zap.Int("conn_index", len(p.conns[host])))
	}

	return p.conns[host][0], nil
}

func (p *Pool) dial(host string) (*grpc.ClientConn, error) {
	kaParams := keepalive.ClientParameters{
		Time:                1 * time.Minute,  // ping server every 1 min
		Timeout:             10 * time.Second, // wait 10s for pong
		PermitWithoutStream: false,            // do not send pings without active RPCs
	}

	conn, err := grpc.NewClient(
		host,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(kaParams),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(math.MaxInt32),
			grpc.MaxCallSendMsgSize(math.MaxInt32),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("grpc dial %s: %w", host, err)
	}
	return conn, nil
}

func (p *Pool) WarmUp(hosts []string) {
	for _, host := range hosts {
		if _, err := p.Get(host); err != nil {
			p.logger.Warn("gRPC warm-up failed", zap.String("host", host), zap.Error(err))
		}
	}
}

func (p *Pool) Close() {
	p.mu.Lock()
	defer p.mu.Unlock()
	for host, conns := range p.conns {
		for _, conn := range conns {
			if err := conn.Close(); err != nil {
				p.logger.Error("error closing gRPC conn", zap.String("host", host), zap.Error(err))
			}
		}
	}
}
