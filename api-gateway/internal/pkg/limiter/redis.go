package limiter

import (
	"context"
	"errors"

	"github.com/go-redis/redis_rate/v10"
	"github.com/redis/go-redis/v9"
)

type ctxKey string

const (
	ctxKeySkip ctxKey = "skip"
)

func Skip(ctx context.Context) context.Context {
	return context.WithValue(ctx, ctxKeySkip, true)
}

var ErrRateLimited = errors.New("rate limited")

type RedisLimiter struct {
	limiter *redis_rate.Limiter
}

func NewRedisLimiter(rdb redis.UniversalClient) (*RedisLimiter, error) {
	limiter := redis_rate.NewLimiter(rdb)
	return &RedisLimiter{limiter}, nil
}

func (l *RedisLimiter) Allow(ctx context.Context, key string, limit Limit) (*Result, error) {
	skip := ctx.Value(ctxKeySkip)
	if v, ok := skip.(bool); ok && v {
		return nil, nil
	}

	res, err := l.limiter.Allow(ctx, key, toRedisLimit(limit))
	if err != nil {
		return nil, err
	}

	if res.Allowed <= 0 {
		return fromRedisResult(res), ErrRateLimited
	}

	return fromRedisResult(res), nil
}

func toRedisLimit(limit Limit) redis_rate.Limit {
	return redis_rate.Limit{
		Rate:   limit.Rate,
		Burst:  limit.Burst,
		Period: limit.Period,
	}
}

func fromRedisResult(res *redis_rate.Result) *Result {
	return &Result{
		Limit:      Limit{Rate: res.Limit.Rate, Burst: res.Limit.Burst, Period: res.Limit.Period},
		Allowed:    res.Allowed,
		Remaining:  res.Remaining,
		RetryAfter: res.RetryAfter,
		ResetAfter: res.ResetAfter,
	}
}
