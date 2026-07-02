package container

import (
	"os"

	"booking-service/internal/grpc"
	"booking-service/internal/grpc_server"
	"booking-service/internal/pkg/caching"
	"booking-service/internal/pkg/db"
	"booking-service/internal/pkg/pubsub"
	redisPubsub "booking-service/internal/pkg/pubsub/redis"
	"booking-service/internal/services"
	"booking-service/internal/utils/env"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/extra/bundebug"
)

func NewContainer() *do.Injector {
	injector := do.New()

	_, err := env.EnvsRequired(
		"DB_DSN",
		"DB_PASSWORD",
		"DB_READONLY_DSN",
		"DB_READONLY_PASSWORD",
		"REDIS_URL",
		"REDIS_CACHE_URL",
		"REDIS_CACHE_READONLY_URL",
		"REDIS_LIMITER_URL",
		"REDIS_PUBSUB_URL",
		"REDIS_PUBSUB_READONLY_URL",
	)
	if err != nil {
		panic(err)
	}

	do.Provide(injector, provideDatabase)
	do.ProvideNamed(injector, "readonly-db", provideReadonlyDatabase)

	do.ProvideNamed(injector, "redis-db", provideRedisDb)
	do.ProvideNamed(injector, "redis-cache-db", provideRedisCacheDb)
	do.ProvideNamed(injector, "redis-cache-readonly-db", provideRedisReadOnlyCacheDb)
	do.ProvideNamed(injector, "redis-pubsub-db", provideRedisPubsubDb)
	do.ProvideNamed(injector, "redis-pubsub-readonly-db", provideRedisPubsubReadonlyDb)

	do.Provide(injector, provideRedisCache)
	do.Provide(injector, provideRedisCacheReadOnly)
	do.Provide(injector, provideRedisPubsub)
	do.Provide(injector, provideOutboxClient)
	do.Provide(injector, provideBookingService)
	do.Provide(injector, provideMovieClient)
	do.Provide(injector, provideAuthClient)
	do.Provide(injector, provideBookingServer)

	return injector
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
	if os.Getenv("API_MODE") != "production" {
		db.AddQueryHook(bundebug.NewQueryHook())
	}

	return db, nil
}

func provideReadonlyDatabase(_ *do.Injector) (*bun.DB, error) {
	d, err := db.NewPostgres(&db.PostgresConfig{
		DSN:          os.Getenv("DB_READONLY_DSN"),
		Password:     os.Getenv("DB_READONLY_PASSWORD"),
		MaxOpenConns: 800,
		MaxIdleConns: 800,
	})
	if err != nil {
		return nil, err
	}
	if os.Getenv("API_MODE") != "production" {
		d.AddQueryHook(bundebug.NewQueryHook())
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

func provideRedisCacheDb(_ *do.Injector) (redis.UniversalClient, error) {
	clusterUrl := os.Getenv("REDIS_CACHE_CLUSTER_URL")
	if clusterUrl != "" {
		clusterOpts, err := redis.ParseClusterURL(clusterUrl)
		if err != nil {
			return nil, err
		}
		return redis.NewClusterClient(clusterOpts), nil
	}

	return db.NewRedis(&db.RedisConfig{
		URL: os.Getenv("REDIS_CACHE_URL"),
	})
}

func provideRedisReadOnlyCacheDb(_ *do.Injector) (redis.UniversalClient, error) {
	clusterUrl := os.Getenv("REDIS_CACHE_READONLY_CLUSTER_URL")
	if clusterUrl != "" {
		clusterOpts, err := redis.ParseClusterURL(clusterUrl)
		if err != nil {
			return nil, err
		}
		return redis.NewClusterClient(clusterOpts), nil
	}

	return db.NewRedis(&db.RedisConfig{
		URL: os.Getenv("REDIS_CACHE_READONLY_URL"),
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

func provideRedisCache(i *do.Injector) (caching.Cache, error) {
	redisCache, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-db")
	if err != nil {
		return nil, err
	}
	return caching.NewRedisClient(redisCache, false)
}

func provideRedisCacheReadOnly(i *do.Injector) (caching.ReadOnlyCache, error) {
	redisCacheReadOnly, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-readonly-db")
	if err != nil {
		return nil, err
	}
	return caching.NewRedisClient(redisCacheReadOnly, false)
}

func provideBookingService(i *do.Injector) (*services.BookingService, error) {
	return services.NewBookingService(i)
}

func provideMovieClient(_ *do.Injector) (*grpc.MovieClient, error) {
	return grpc.NewMovieClient()
}

func provideAuthClient(_ *do.Injector) (*grpc.AuthClient, error) {
	return grpc.NewAuthClient()
}

func provideOutboxClient(_ *do.Injector) (*grpc.OutboxClient, error) {
	return grpc.NewOutboxClient()
}

func provideBookingServer(i *do.Injector) (*grpc_server.BookingServer, error) {
	return grpc_server.NewBookingServer(i)
}
