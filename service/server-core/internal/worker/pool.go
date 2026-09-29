package worker

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

// Job represents a single unit of work
type Job interface {
	Execute(ctx context.Context) error
}

// Pool manages a group of workers to process jobs concurrently
type Pool struct {
	workersCount int
	jobs         chan Job
	wg           sync.WaitGroup
	log          *zap.Logger
}

// NewPool creates a new worker pool for concurrent processing
func NewPool(workersCount int, jobQueueSize int, log *zap.Logger) *Pool {
	return &Pool{
		workersCount: workersCount,
		jobs:         make(chan Job, jobQueueSize),
		log:          log,
	}
}

// Start boots up the worker pool
func (p *Pool) Start(ctx context.Context) {
	for i := 1; i <= p.workersCount; i++ {
		p.wg.Add(1)
		go p.worker(ctx, i)
	}
	p.log.Info("Worker pool started", zap.Int("workers", p.workersCount))
}

func (p *Pool) worker(ctx context.Context, id int) {
	defer p.wg.Done()
	for {
		select {
		case <-ctx.Done():
			p.log.Info("Worker shutting down", zap.Int("worker_id", id))
			return
		case job, ok := <-p.jobs:
			if !ok {
				return // jobs channel closed
			}
			if err := job.Execute(ctx); err != nil {
				p.log.Error("Job execution failed", zap.Int("worker_id", id), zap.Error(err))
			}
		}
	}
}

// Submit sends a job to the pool
func (p *Pool) Submit(job Job) {
	p.jobs <- job
}

// Stop gracefully shuts down the pool
func (p *Pool) Stop() {
	close(p.jobs)
	p.wg.Wait()
	p.log.Info("Worker pool stopped")
}
