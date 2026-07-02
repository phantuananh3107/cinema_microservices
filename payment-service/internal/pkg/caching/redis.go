package caching

import (
	"context"
	"strings"
	"time"

	"github.com/sirupsen/logrus"

	"github.com/go-redis/cache/v9"
	"github.com/redis/go-redis/v9"
)

type CacheRedisClient struct {
	instance *cache.Cache
}

func NewRedisClient(client redis.UniversalClient, withLocalCache bool) (*CacheRedisClient, error) {
	var localCache cache.LocalCache
	if withLocalCache {
		localCache = cache.NewTinyLFU(1000, time.Minute)
	}

	return &CacheRedisClient{
		instance: cache.New(&cache.Options{
			Redis:      client,
			LocalCache: localCache,
		}),
	}, nil
}

func (c *CacheRedisClient) Get(ctx context.Context, key string, target any) error {
	return c.instance.Get(ctx, key, target)
}

func (c *CacheRedisClient) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	return c.instance.Set(&cache.Item{
		Ctx:   ctx,
		Key:   key,
		Value: value,
		TTL:   ttl,
	})
}

func (c *CacheRedisClient) Delete(ctx context.Context, key string) error {
	return c.instance.Delete(ctx, key)
}

type RedisClient interface {
	Keys(ctx context.Context, pattern string) *redis.StringSliceCmd
	Del(ctx context.Context, keys ...string) *redis.IntCmd
	Scan(ctx context.Context, cursor uint64, match string, count int64) *redis.ScanCmd
}

/*
Deletes all keys in redis that match the pattern.

It uses SCAN to iterate over the keys and delete them in batches of 100.

Wildcard (*) is supported in the pattern, but it should be used carefully, as it can be extremely slow on production with large datasets.
*/
func DeleteKeys(ctx context.Context, client redis.UniversalClient, pattern string) error {
	clusterClient, ok := client.(*redis.ClusterClient)
	if ok {
		_ = clusterClient.ForEachMaster(ctx, func(ctx context.Context, c *redis.Client) error {
			deleteKeys(ctx, c, pattern)
			return nil
		})
	} else {
		deleteKeys(ctx, client, pattern)
	}

	return nil
}

func deleteKeys(ctx context.Context, client RedisClient, pattern string) {
	if !strings.Contains(pattern, "*") {
		err := client.Del(ctx, pattern).Err()
		logrus.Println("Deleted key", pattern, err)
		return
	}

	cursor := uint64(0)
	for {
		keys, cursor, err := client.Scan(ctx, cursor, pattern, 10000).Result()
		for _, key := range keys {
			err := client.Del(ctx, key).Err()
			logrus.Println("Deleted key", key, err)
		}
		if cursor <= 0 || err != nil {
			break
		}
	}
}
