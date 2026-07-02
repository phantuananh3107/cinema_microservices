package container

import (
	"os"

	roomBusiness "movie-service/internal/module/room/business"
	roomPostgres "movie-service/internal/module/room/repository/postgres"

	seatBusiness "movie-service/internal/module/seat/business"
	seatPostgres "movie-service/internal/module/seat/repository/postgres"

	showtimeBusiness "movie-service/internal/module/showtime/business"
	showtimePostgres "movie-service/internal/module/showtime/repository/postgres"

	"movie-service/internal/module/movie/business"
	"movie-service/internal/module/movie/repository/grpc"
	"movie-service/internal/module/movie/repository/postgres"
	"movie-service/internal/pkg/caching"
	"movie-service/internal/pkg/db"
	"movie-service/internal/pkg/pubsub"
	redisPubsub "movie-service/internal/pkg/pubsub/redis"
	"movie-service/internal/utils/env"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/extra/bundebug"
)

func NewContainer() *do.Injector {
	injector := do.New()

	err := env.EnvsRequired(
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

	do.Provide(injector, provideDatabase)
	do.ProvideNamed(injector, "readonly-db", provideReadonlyDatabase)

	do.ProvideNamed(injector, "redis-db", provideRedisDb)
	do.ProvideNamed(injector, "redis-cache-db", provideRedisCacheDb)
	do.ProvideNamed(injector, "redis-cache-readonly-db", provideRedisReadOnlyCacheDb)
	do.ProvideNamed(injector, "redis-pubsub-db", provideRedisPubsubDb)
	do.ProvideNamed(injector, "redis-pubsub-readonly-db", provideRedisPubsubReadOnlyDb)

	do.Provide(injector, provideRedisCache)
	do.Provide(injector, provideReadisCacheReadOnly)
	do.Provide(injector, provideRedisPubsub)

	// Movie module
	do.Provide(injector, provideMovieRepository)
	do.Provide(injector, provideMovieBusiness)
	do.Provide(injector, provideAuthService)

	// Room module
	do.Provide(injector, provideRoomRepository)
	do.Provide(injector, provideRoomBusiness)

	// Seat module
	do.Provide(injector, provideSeatRepository)
	do.Provide(injector, provideSeatBusiness)

	// Showtime module
	do.Provide(injector, provideShowtimeRepository)
	do.Provide(injector, provideShowtimeBusiness)

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
	db, err := db.NewPostgres(&db.PostgresConfig{
		DSN:          os.Getenv("DB_READONLY_DSN"),
		Password:     os.Getenv("DB_READONLY_PASSWORD"),
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

func provideRedisCache(i *do.Injector) (caching.Cache, error) {
	redisCache, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-db")
	if err != nil {
		return nil, err
	}
	return caching.NewRedisClient(redisCache, false)
}

func provideReadisCacheReadOnly(i *do.Injector) (caching.ReadOnlyCache, error) {
	redisCacheReadOnly, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-readonly-db")
	if err != nil {
		return nil, err
	}
	return caching.NewRedisClient(redisCacheReadOnly, false)
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

func provideRedisPubsubReadOnlyDb(_ *do.Injector) (redis.UniversalClient, error) {
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

// Movie providers
func provideMovieRepository(i *do.Injector) (business.MovieRepository, error) {
	return postgres.NewMovieRepository(i)
}

func provideMovieBusiness(i *do.Injector) (business.MovieBiz, error) {
	return business.NewBusiness(i)
}

func provideAuthService(i *do.Injector) (*grpc.AuthGrpcClient, error) {
	return grpc.NewAuthGrpcClient(i)
}

// Room providers
func provideRoomRepository(i *do.Injector) (roomBusiness.RoomRepository, error) {
	return roomPostgres.NewRoomRepository(i)
}

func provideRoomBusiness(i *do.Injector) (roomBusiness.RoomBiz, error) {
	return roomBusiness.NewBusiness(i)
}

// Seat providers
func provideSeatRepository(i *do.Injector) (seatBusiness.SeatRepository, error) {
	return seatPostgres.NewSeatRepository(i)
}

func provideSeatBusiness(i *do.Injector) (seatBusiness.SeatBiz, error) {
	return seatBusiness.NewBusiness(i)
}

// Showtime providers
func provideShowtimeRepository(i *do.Injector) (showtimeBusiness.ShowtimeRepository, error) {
	return showtimePostgres.NewShowtimeRepository(i)
}

func provideShowtimeBusiness(i *do.Injector) (showtimeBusiness.ShowtimeBiz, error) {
	return showtimeBusiness.NewBusiness(i)
}
