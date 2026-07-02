package business

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"movie-service/internal/module/movie/entity"
	"movie-service/internal/pkg/caching"
	"movie-service/internal/pkg/paging"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
)

var (
	ErrInvalidMovieData        = fmt.Errorf("invalid movie data")
	ErrInvalidStatusTransition = fmt.Errorf("invalid status transition")
	ErrMovieNotFound           = fmt.Errorf("movie not found")
	ErrMovieNotShowing         = fmt.Errorf("movie is not in SHOWING status")
)

type MovieBiz interface {
	GetMovieById(ctx context.Context, id string) (*entity.Movie, error)
	GetMovies(ctx context.Context, page, size int, search string, status string) ([]*entity.Movie, int, error)
	GetMovieStats(ctx context.Context) ([]*entity.MovieStat, error)
	GetGenres(ctx context.Context) ([]*entity.Genre, error)
	CreateMovie(ctx context.Context, movie *entity.Movie, genreIds []string) error
	UpdateMovie(ctx context.Context, movie *entity.Movie, genreIds []string) error
	DeleteMovie(ctx context.Context, id string) error
	UpdateMovieStatus(ctx context.Context, id string, status entity.MovieStatus) error
	ValidateMovieForShowtime(ctx context.Context, movieId string) error
}

type MovieRepository interface {
	GetByID(ctx context.Context, id string) (*entity.Movie, error)
	GetMany(ctx context.Context, limit, offset int, search string, status string) ([]*entity.Movie, error)
	GetTotalCount(ctx context.Context, search string, status string) (int, error)
	GetMovieStats(ctx context.Context) ([]*entity.MovieStat, error)
	GetGenres(ctx context.Context) ([]*entity.Genre, error)
	Create(ctx context.Context, movie *entity.Movie, genreIds []string) error
	Update(ctx context.Context, movie *entity.Movie, genreIds []string) error
	Delete(ctx context.Context, id string) error
}

type business struct {
	repository  MovieRepository
	cache       caching.Cache
	roCache     caching.ReadOnlyCache
	redisClient redis.UniversalClient
}

func NewBusiness(i *do.Injector) (MovieBiz, error) {
	cache, err := do.Invoke[caching.Cache](i)
	if err != nil {
		return nil, err
	}

	roCache, err := do.Invoke[caching.ReadOnlyCache](i)
	if err != nil {
		return nil, err
	}

	repository, err := do.Invoke[MovieRepository](i)
	if err != nil {
		return nil, err
	}

	redisClient, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-db")
	if err != nil {
		return nil, err
	}

	return &business{
		repository:  repository,
		cache:       cache,
		roCache:     roCache,
		redisClient: redisClient,
	}, nil
}

func (b *business) GetMovieById(ctx context.Context, id string) (*entity.Movie, error) {
	if id == "" {
		return nil, ErrInvalidMovieData
	}

	callback := func() (*entity.Movie, error) {
		return b.repository.GetByID(ctx, id)
	}

	movie, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisMovieDetail(id), CACHE_TTL_1_HOUR, callback)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrMovieNotFound
		}
		return nil, fmt.Errorf("failed to get movie: %w", err)
	}

	return movie, nil
}

func (b *business) GetMovies(ctx context.Context, page, size int, search string, status string) ([]*entity.Movie, int, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 10
	}
	if size > 100 {
		size = 100
	}

	limit := size
	offset := (page - 1) * size

	pagingInfo := &paging.Paging{
		Limit:  limit,
		Offset: offset,
	}

	totalCallback := func() (int, error) {
		return b.repository.GetTotalCount(ctx, search, status)
	}

	total, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisTotalMovieCount(search, status), CACHE_TTL_1_HOUR, totalCallback)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	moviesCallback := func() ([]*entity.Movie, error) {
		return b.repository.GetMany(ctx, limit, offset, search, status)
	}

	movies, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisPagingListMovie(pagingInfo, search, status), CACHE_TTL_1_HOUR, moviesCallback)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get movies: %w", err)
	}

	return movies, total, nil
}

func (b *business) CreateMovie(ctx context.Context, movie *entity.Movie, genreIds []string) error {
	if movie == nil {
		return ErrInvalidMovieData
	}

	if !movie.IsValid() {
		return ErrInvalidMovieData
	}

	if movie.Status == "" {
		movie.Status = entity.MovieStatusUpcoming
	}

	err := b.repository.Create(ctx, movie, genreIds)
	if err != nil {
		return fmt.Errorf("failed to create movie: %w", err)
	}

	b.invalidateMoviesListCache(ctx)

	return nil
}

func (b *business) UpdateMovie(ctx context.Context, movie *entity.Movie, genreIds []string) error {
	if movie == nil || movie.Id == "" {
		return ErrInvalidMovieData
	}

	if !movie.IsValid() {
		return ErrInvalidMovieData
	}

	existingMovie, err := b.repository.GetByID(ctx, movie.Id)
	if err != nil {
		return ErrMovieNotFound
	}

	if movie.Status != existingMovie.Status {
		if !existingMovie.CanTransitionTo(movie.Status) {
			fmt.Println("Invalid status transition:", existingMovie.Status, "->", movie.Status)
			return ErrInvalidStatusTransition
		}
	}

	err = b.repository.Update(ctx, movie, genreIds)
	if err != nil {
		return fmt.Errorf("failed to update movie: %w", err)
	}

	b.invalidateMovieCache(ctx, movie.Id)
	b.invalidateMoviesListCache(ctx)

	return nil
}

func (b *business) DeleteMovie(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("movie id is required")
	}

	_, err := b.repository.GetByID(ctx, id)
	if err != nil {
		return ErrMovieNotFound
	}

	err = b.repository.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete movie: %w", err)
	}

	b.invalidateMovieCache(ctx, id)
	b.invalidateMoviesListCache(ctx)

	return nil
}

func (b *business) UpdateMovieStatus(ctx context.Context, id string, status entity.MovieStatus) error {
	if id == "" {
		return fmt.Errorf("movie id is required")
	}

	movie, err := b.repository.GetByID(ctx, id)
	if err != nil {
		return ErrMovieNotFound
	}

	if !movie.CanTransitionTo(status) {
		return ErrInvalidStatusTransition
	}

	movie.Status = status
	err = b.repository.Update(ctx, movie, nil)
	if err != nil {
		return fmt.Errorf("failed to update movie status: %w", err)
	}

	b.invalidateMovieCache(ctx, id)
	b.invalidateMoviesListCache(ctx)

	return nil
}

func (b *business) GetGenres(ctx context.Context) ([]*entity.Genre, error) {
	callback := func() ([]*entity.Genre, error) {
		return b.repository.GetGenres(ctx)
	}

	genres, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, "genres", CACHE_TTL_1_HOUR, callback)
	if err != nil {
		return nil, err
	}

	return genres, nil
}

func (b *business) GetMovieStats(ctx context.Context) ([]*entity.MovieStat, error) {
	callback := func() ([]*entity.MovieStat, error) {
		return b.repository.GetMovieStats(ctx)
	}

	stats, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, keyMovieStats, CACHE_TTL_15_MINS, callback)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (b *business) ValidateMovieForShowtime(ctx context.Context, movieId string) error {
	if movieId == "" {
		return ErrInvalidMovieData
	}

	movie, err := b.GetMovieById(ctx, movieId)
	if err != nil {
		return err
	}

	if movie.Status != entity.MovieStatusShowing {
		return ErrMovieNotShowing
	}

	return nil
}

func (b *business) invalidateMovieCache(ctx context.Context, movieId string) {
	_ = b.cache.Delete(ctx, redisMovieDetail(movieId))
}

func (b *business) invalidateMoviesListCache(ctx context.Context) {
	_ = caching.DeleteKeys(ctx, b.redisClient, keyTotalMovieCountPattern)
	_ = caching.DeleteKeys(ctx, b.redisClient, keyPagingListMoviePattern)
	_ = caching.DeleteKeys(ctx, b.redisClient, keyMovieDetailPattern)
}
