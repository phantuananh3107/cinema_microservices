package container

import (
	"os"

	"worker-service/internal/datastore"

	"worker-service/internal/pkg/db"
	"worker-service/internal/pkg/logger"
	"worker-service/internal/pkg/pubsub"
	redisPubsub "worker-service/internal/pkg/pubsub/redis"

	"github.com/hiendaovinh/toolkit/pkg/env"
	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

func New() *do.Injector {
	injector := do.New()

	_, err := env.EnvsRequired(
		"DB_DSN",
		"DB_PASSWORD",
		"DB_READONLY_DSN",
		"DB_READONLY_PASSWORD",
		"REDIS_URL",
		"REDIS_CACHE_URL",
		"REDIS_CACHE_READONLY_URL",
		"REDIS_PUBSUB_URL",
		"REDIS_PUBSUB_READONLY_URL",
	)
	if err != nil {
		panic(err)
	}

	do.Provide(injector, provideLogger)

	do.Provide(injector, provideDatabase)
	do.ProvideNamed(injector, "readonly-db", provideReadonlyDatabase)

	do.ProvideNamed(injector, "redis-db", provideRedisDb)
	do.ProvideNamed(injector, "redis-pubsub-db", provideRedisPubsubDb)
	do.ProvideNamed(injector, "redis-pubsub-readonly-db", provideRedisPubsubReadonlyDb)

	do.Provide(injector, provideRedisPubsub)
	do.Provide(injector, provideOutboxRepository)
	do.Provide(injector, provideNewsArticleRepository)

	return injector
}

func provideLogger(_ *do.Injector) (logger.Logger, error) {
	return logger.NewLogger(), nil
}

func provideDatabase(_ *do.Injector) (*bun.DB, error) {
	db, err := db.NewPostgres(&db.PostgresConfig{
		DSN:          os.Getenv("DB_DSN"),
		Password:     os.Getenv("DB_PASSWORD"),
		MaxOpenConns: 100,
		MaxIdleConns: 100,
	})
	if err != nil {
		return nil, err
	}

	return db, nil
}

func provideReadonlyDatabase(_ *do.Injector) (*bun.DB, error) {
	d, err := db.NewPostgres(&db.PostgresConfig{
		DSN:          os.Getenv("DB_READONLY_DSN"),
		Password:     os.Getenv("DB_READONLY_PASSWORD"),
		MaxOpenConns: 100,
		MaxIdleConns: 100,
	})
	if err != nil {
		return nil, err
	}
	return d, nil
}

func provideRedisDb(_ *do.Injector) (redis.UniversalClient, error) {
	clusterUrl := os.Getenv("REDIS_CLUSTER_URL")
	if clusterUrl != "" {
		clusterOpts, err := redis.ParseClusterURL(clusterUrl)
		if err != nil {
			return nil, err
		}
		return redis.NewClusterClient(clusterOpts), nil
	}

	return db.NewRedis(&db.RedisConfig{
		URL: os.Getenv("REDIS_URL"),
	})
}

func provideRedisPubsubDb(_ *do.Injector) (redis.UniversalClient, error) {
	clusterUrl := os.Getenv("REDIS_PUBSUB_CLUSTER_URL")
	if clusterUrl != "" {
		clusterOpts, err := redis.ParseClusterURL(clusterUrl)
		if err != nil {
			return nil, err
		}
		return redis.NewClusterClient(clusterOpts), nil
	}

	return db.NewRedis(&db.RedisConfig{
		URL: os.Getenv("REDIS_PUBSUB_URL"),
	})
}

func provideRedisPubsubReadonlyDb(_ *do.Injector) (redis.UniversalClient, error) {
	clusterUrl := os.Getenv("REDIS_PUBSUB_READONLY_CLUSTER_URL")
	if clusterUrl != "" {
		clusterOpts, err := redis.ParseClusterURL(clusterUrl)
		if err != nil {
			return nil, err
		}
		return redis.NewClusterClient(clusterOpts), nil
	}

	return db.NewRedis(&db.RedisConfig{
		URL: os.Getenv("REDIS_PUBSUB_READONLY_URL"),
	})
}

func provideRedisPubsub(i *do.Injector) (pubsub.PubSub, error) {
	pubsub, err := do.InvokeNamed[redis.UniversalClient](i, "redis-pubsub-db")
	if err != nil {
		return nil, err
	}

	pubsubReadonly, err := do.InvokeNamed[redis.UniversalClient](i, "redis-pubsub-readonly-db")
	if err != nil {
		return nil, err
	}

	return redisPubsub.NewRedisPubsub(pubsubReadonly, pubsub), nil
}

func provideOutboxRepository(i *do.Injector) (datastore.OutboxRepository, error) {
	return datastore.NewOutboxRepository(i)
}

func provideNewsArticleRepository(i *do.Injector) (datastore.NewsArticleRepository, error) {
	return datastore.NewNewsArticleRepository(i)
}
