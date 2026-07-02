package caching

import (
	"context"
	"errors"
	"time"

	"github.com/go-redis/cache/v9"
)

type ReadOnlyCache interface {
	Get(ctx context.Context, key string, target any) error
}

type Cache interface {
	ReadOnlyCache
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

func UseCache[T any](ctx context.Context, cash Cache, key string, ttl time.Duration, callback func() (T, error)) (T, error) {
	var v T
	err := cash.Get(ctx, key, &v)
	if !errors.Is(err, cache.ErrCacheMiss) {
		return v, err
	}

	v, err = callback()
	if err != nil {
		return v, err
	}

	// fire and forget
	//nolint:errcheck
	cash.Set(ctx, key, v, ttl)
	return v, nil
}

func UseCacheWithRO[T any](ctx context.Context, roCash ReadOnlyCache, cash Cache, key string, ttl time.Duration, callback func() (T, error)) (T, error) {
	var v T
	err := roCash.Get(ctx, key, &v)
	if !errors.Is(err, cache.ErrCacheMiss) {
		return v, err
	}

	v, err = callback()
	if err != nil {
		return v, err
	}
	// fire and forget
	//nolint:errcheck
	cash.Set(ctx, key, v, ttl)
	return v, nil
}
