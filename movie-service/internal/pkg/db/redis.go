package db

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisConfig struct {
	URL                  string
	IgnoreConnectionTest bool
}

func NewRedis(cfg *RedisConfig) (*redis.Client, error) {
	url := "redis://localhost:6379/0"
	if cfg.URL != "" {
		url = cfg.URL
	}

	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	if opts != nil && cfg.IgnoreConnectionTest {
		return client, nil
	}

	ctxPing, cancel := context.WithTimeout(context.Background(), time.Second*2)
	defer cancel()

	_, err = client.Ping(ctxPing).Result()
	return client, err
}
