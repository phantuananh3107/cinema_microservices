package limiter

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// MockRedisClient is a mock implementation of redis.UniversalClient for testing
type MockRedisClient struct {
	data map[string]interface{}
}

func (m *MockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	// Return a mock StringCmd
	cmd := &redis.StringCmd{}
	_ = m.data // use data to avoid unused variable
	return cmd
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	m.data[key] = value
	cmd := &redis.StatusCmd{}
	return cmd
}

func (m *MockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	for _, key := range keys {
		delete(m.data, key)
	}
	cmd := &redis.IntCmd{}
	return cmd
}

func (m *MockRedisClient) Ping(ctx context.Context, message ...string) *redis.StringCmd {
	cmd := &redis.StringCmd{}
	return cmd
}

func (m *MockRedisClient) Close() error {
	return nil
}

func TestRedisLimiter(t *testing.T) {
	// Try to use real Redis if available
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "",
		DB:       15, // use a test DB
	})

	defer func() {
		rdb.FlushDB(context.Background())
		rdb.Close()
	}()

	// Test if Redis is available
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Logf("Redis not available (%v), test will be skipped. To run this test, start Redis with: docker run -d -p 6379:6379 redis:latest", err)
		t.Skip("Redis not available, skipping test")
	}

	// Create limiter
	limiter, err := NewRedisLimiter(rdb)
	if err != nil {
		t.Fatalf("Failed to create Redis limiter: %v", err)
	}

	// Define rate limit
	limit := Limit{
		Rate:   20,
		Burst:  10,
		Period: time.Minute,
	}

	key := "test:user:123"

	// Test normal operation
	result, err := limiter.Allow(ctx, key, limit)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result == nil {
		t.Fatal("Expected result, got nil")
	}

	if result.Allowed <= 0 {
		t.Errorf("Expected allowed > 0, got: %d", result.Allowed)
	}

	if result.Remaining >= limit.Rate {
		t.Errorf("Expected remaining < rate, got remaining=%d, rate=%d", result.Remaining, limit.Rate)
	}

	skipCtx := Skip(ctx)
	skipResult, err := limiter.Allow(skipCtx, key, limit)
	if err != nil {
		t.Fatalf("Expected no error with skip context, got: %v", err)
	}

	if skipResult != nil {
		t.Error("Expected nil result with skip context")
	}

	// Test rate limiting
	// Make enough requests to exceed the rate limit
	for i := 0; i < limit.Rate+1; i++ {
		limiter.Allow(ctx, key, limit)
	}

	// This should now be rate limited
	result, err = limiter.Allow(ctx, key, limit)
	if !errors.Is(err, ErrRateLimited) {
		t.Errorf("Expected ErrRateLimited, got: %v", err)
	}

	if result == nil {
		t.Error("Expected result even when rate limited")
		return
	}
	if result.Remaining != 0 {
		t.Errorf("Expected remaining=0 when rate limited, got: %d", result.Remaining)
	}
}

// TestSkipContextBehavior - TC-GW-LIM-001
// Kiểm tra Skip context bỏ qua rate limiting
func TestSkipContextBehavior(t *testing.T) {
	ctx := context.Background()
	skipCtx := Skip(ctx)

	skip := skipCtx.Value(ctxKeySkip)
	if skip == nil {
		t.Error("Skip context should have skip flag set")
	}

	if skipVal, ok := skip.(bool); !ok || !skipVal {
		t.Error("Skip context flag should be bool and true")
	}
}

// TestLimitStructure - TC-GW-LIM-002
// Kiểm tra cấu trúc Limit
func TestLimitStructure(t *testing.T) {
	limit := Limit{
		Rate:   100,
		Burst:  10,
		Period: time.Minute,
	}

	if limit.Rate != 100 {
		t.Errorf("Expected rate=100, got %d", limit.Rate)
	}

	if limit.Burst != 10 {
		t.Errorf("Expected burst=10, got %d", limit.Burst)
	}

	if limit.Period != time.Minute {
		t.Errorf("Expected period=1m, got %v", limit.Period)
	}
}

// TestResultStructure - TC-GW-LIM-003
// Kiểm tra cấu trúc Result
func TestResultStructure(t *testing.T) {
	result := &Result{
		Limit: Limit{
			Rate:   50,
			Burst:  5,
			Period: time.Minute,
		},
		Allowed:    40,
		Remaining:  10,
		RetryAfter: time.Second,
		ResetAfter: 30 * time.Second,
	}

	if result.Allowed != 40 {
		t.Errorf("Expected allowed=40, got %d", result.Allowed)
	}

	if result.Remaining != 10 {
		t.Errorf("Expected remaining=10, got %d", result.Remaining)
	}
}

// TestErrRateLimitedError - TC-GW-LIM-004
// Kiểm tra lỗi ErrRateLimited
func TestErrRateLimitedError(t *testing.T) {
	if ErrRateLimited == nil {
		t.Fatal("ErrRateLimited should not be nil")
	}

	if ErrRateLimited.Error() != "rate limited" {
		t.Errorf("Expected error message 'rate limited', got '%s'", ErrRateLimited.Error())
	}
}
