package business

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	movieBusiness "movie-service/internal/module/movie/business"
	roomBusiness "movie-service/internal/module/room/business"
	"movie-service/internal/module/showtime/entity"
	"movie-service/internal/pkg/caching"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
)

var (
	ErrInvalidShowtimeData     = fmt.Errorf("invalid showtime data")
	ErrInvalidStatusTransition = fmt.Errorf("invalid status transition")
	ErrShowtimeNotFound        = fmt.Errorf("showtime not found")
	ErrTimeConflict            = fmt.Errorf("showtime conflicts with existing schedule")
	ErrShowtimeInPast          = fmt.Errorf("cannot schedule showtime in the past")
	ErrMovieNotShowing         = fmt.Errorf("showtimes can only be created for movies with SHOWING status")
	ErrRoomNotActive           = fmt.Errorf("showtimes can only be created for rooms with ACTIVE status")
)

type ShowtimeBiz interface {
	GetShowtimeById(ctx context.Context, id string) (*entity.Showtime, error)
	GetShowtimesByIds(ctx context.Context, ids []string) ([]*entity.Showtime, error)
	GetShowtimes(ctx context.Context, page, size int, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) ([]*entity.Showtime, int, error)
	GetUpcomingShowtimes(ctx context.Context, limit int) ([]*entity.Showtime, error)
	CreateShowtime(ctx context.Context, showtime *entity.Showtime) error
	UpdateShowtime(ctx context.Context, id string, updates *entity.UpdateShowtimeRequest) error
	DeleteShowtime(ctx context.Context, id string) error
	UpdateShowtimeStatus(ctx context.Context, id string, status entity.ShowtimeStatus) error
	CheckTimeConflict(ctx context.Context, roomId string, startTime, endTime time.Time, excludeId string) (bool, error)
}

type ShowtimeRepository interface {
	GetByID(ctx context.Context, id string) (*entity.Showtime, error)
	GetByIds(ctx context.Context, ids []string) ([]*entity.Showtime, error)
	GetMany(ctx context.Context, limit, offset int, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) ([]*entity.Showtime, error)
	GetTotalCount(ctx context.Context, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) (int, error)
	GetByMovie(ctx context.Context, movieId string) ([]*entity.Showtime, error)
	GetUpcoming(ctx context.Context, limit int) ([]*entity.Showtime, error)
	Create(ctx context.Context, showtime *entity.Showtime) error
	Update(ctx context.Context, showtime *entity.Showtime) error
	Delete(ctx context.Context, id string) error
	CheckConflict(ctx context.Context, roomId string, startTime, endTime time.Time, excludeId string) (bool, error)
}

type business struct {
	repository  ShowtimeRepository
	movieBiz    movieBusiness.MovieBiz
	roomBiz     roomBusiness.RoomBiz
	cache       caching.Cache
	roCache     caching.ReadOnlyCache
	redisClient redis.UniversalClient
}

func NewBusiness(i *do.Injector) (ShowtimeBiz, error) {
	cache, err := do.Invoke[caching.Cache](i)
	if err != nil {
		return nil, err
	}

	roCache, err := do.Invoke[caching.ReadOnlyCache](i)
	if err != nil {
		return nil, err
	}

	repository, err := do.Invoke[ShowtimeRepository](i)
	if err != nil {
		return nil, err
	}

	movieBiz, err := do.Invoke[movieBusiness.MovieBiz](i)
	if err != nil {
		return nil, err
	}

	roomBiz, err := do.Invoke[roomBusiness.RoomBiz](i)
	if err != nil {
		return nil, err
	}

	redisClient, err := do.InvokeNamed[redis.UniversalClient](i, "redis-cache-db")
	if err != nil {
		return nil, err
	}

	return &business{
		repository:  repository,
		movieBiz:    movieBiz,
		roomBiz:     roomBiz,
		cache:       cache,
		roCache:     roCache,
		redisClient: redisClient,
	}, nil
}

func (b *business) GetShowtimeById(ctx context.Context, Id string) (*entity.Showtime, error) {
	showtime, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisShowtimeDetail(Id), CACHE_TTL_1_HOUR, func() (*entity.Showtime, error) {
		return b.repository.GetByID(ctx, Id)
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrShowtimeNotFound
		}
		return nil, fmt.Errorf("failed to get showtime: %w", err)
	}

	return showtime, nil
}

func (b *business) GetShowtimesByIds(ctx context.Context, ids []string) ([]*entity.Showtime, error) {
	if len(ids) == 0 {
		return []*entity.Showtime{}, nil
	}

	callback := func() ([]*entity.Showtime, error) {
		return b.repository.GetByIds(ctx, ids)
	}

	showtimes, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisShowtimesByIds(ids), CACHE_TTL_30_MINS, callback)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes by ids: %w", err)
	}

	return showtimes, nil
}

func (b *business) GetShowtimes(ctx context.Context, page, size int, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) ([]*entity.Showtime, int, error) {
	if page < 1 || size < 1 {
		return nil, 0, ErrInvalidShowtimeData
	}

	offset := (page - 1) * size

	showtimes, err := b.repository.GetMany(ctx, size, offset, search, movieId, roomId, format, status, dateFrom, dateTo, excludeEnded)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get showtimes: %w", err)
	}

	total, err := b.repository.GetTotalCount(ctx, search, movieId, roomId, format, status, dateFrom, dateTo, excludeEnded)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return showtimes, total, nil
}

func (b *business) GetUpcomingShowtimes(ctx context.Context, limit int) ([]*entity.Showtime, error) {
	if limit <= 0 {
		limit = 10
	}

	callback := func() ([]*entity.Showtime, error) {
		return b.repository.GetUpcoming(ctx, limit)
	}

	showtimes, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisUpcomingShowtimes(), CACHE_TTL_5_MINS, callback)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming showtimes: %w", err)
	}

	return showtimes, nil
}

func (b *business) CreateShowtime(ctx context.Context, showtime *entity.Showtime) error {
	if showtime == nil || !showtime.IsValid() {
		return ErrInvalidShowtimeData
	}

	if showtime.StartTime.Before(time.Now()) {
		return ErrShowtimeInPast
	}

	if err := b.movieBiz.ValidateMovieForShowtime(ctx, showtime.MovieId); err != nil {
		if errors.Is(err, movieBusiness.ErrMovieNotShowing) {
			return ErrMovieNotShowing
		}
		return err
	}

	if err := b.roomBiz.ValidateRoomForShowtime(ctx, showtime.RoomId); err != nil {
		if errors.Is(err, roomBusiness.ErrRoomNotActive) {
			return ErrRoomNotActive
		}
		return err
	}

	hasConflict, err := b.CheckTimeConflict(ctx, showtime.RoomId, showtime.StartTime, showtime.EndTime, "")
	if err != nil {
		return err
	}
	if hasConflict {
		return ErrTimeConflict
	}

	if err = b.repository.Create(ctx, showtime); err != nil {
		return fmt.Errorf("failed to create showtime: %w", err)
	}

	b.clearCacheForShowtime(ctx, showtime)

	return nil
}

func (b *business) UpdateShowtime(ctx context.Context, id string, updates *entity.UpdateShowtimeRequest) error {
	if id == "" || updates == nil {
		return ErrInvalidShowtimeData
	}

	showtime, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrShowtimeNotFound
		}
		return fmt.Errorf("failed to get showtime: %w", err)
	}

	oldRoomId := showtime.RoomId
	oldMovieId := showtime.MovieId
	oldDate := showtime.StartTime.Format("2006-01-02")

	if updates.MovieId != nil {
		showtime.MovieId = *updates.MovieId
		if err = b.movieBiz.ValidateMovieForShowtime(ctx, showtime.MovieId); err != nil {
			if errors.Is(err, movieBusiness.ErrMovieNotShowing) {
				return ErrMovieNotShowing
			}
			return err
		}
	}

	if updates.RoomId != nil {
		showtime.RoomId = *updates.RoomId
		if err = b.roomBiz.ValidateRoomForShowtime(ctx, showtime.RoomId); err != nil {
			if errors.Is(err, roomBusiness.ErrRoomNotActive) {
				return ErrRoomNotActive
			}
			return err
		}
	}

	if updates.StartTime != nil {
		showtime.StartTime = entity.TruncateToHalfHour(*updates.StartTime)
	}

	if updates.EndTime != nil {
		showtime.EndTime = entity.TruncateToHalfHour(*updates.EndTime)
	}

	if updates.Format != nil {
		showtime.Format = *updates.Format
	}

	if updates.BasePrice != nil {
		showtime.BasePrice = *updates.BasePrice
	}

	if updates.Status != nil {
		showtime.Status = *updates.Status
	}

	if !showtime.IsValid() {
		return ErrInvalidShowtimeData
	}

	if updates.StartTime != nil || updates.EndTime != nil || updates.RoomId != nil {
		if showtime.StartTime.Before(time.Now()) && showtime.Status == entity.ShowtimeStatusScheduled {
			return ErrShowtimeInPast
		}

		hasConflict, err := b.CheckTimeConflict(ctx, showtime.RoomId, showtime.StartTime, showtime.EndTime, id)
		if err != nil {
			return fmt.Errorf("failed to check time conflict: %w", err)
		}
		if hasConflict {
			return ErrTimeConflict
		}
	}

	if err := b.repository.Update(ctx, showtime); err != nil {
		return fmt.Errorf("failed to update showtime: %w", err)
	}

	b.clearCacheForShowtime(ctx, showtime)
	b.clearCacheForOldValues(ctx, oldMovieId, oldRoomId, oldDate)

	return nil
}

func (b *business) DeleteShowtime(ctx context.Context, id string) error {
	if id == "" {
		return ErrInvalidShowtimeData
	}

	showtime, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrShowtimeNotFound
		}
		return fmt.Errorf("failed to get showtime: %w", err)
	}

	if err = b.repository.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete showtime: %w", err)
	}

	b.clearCacheForShowtime(ctx, showtime)

	return nil
}

func (b *business) UpdateShowtimeStatus(ctx context.Context, id string, status entity.ShowtimeStatus) error {
	if id == "" {
		return ErrInvalidShowtimeData
	}

	showtime, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrShowtimeNotFound
		}
		return fmt.Errorf("failed to get showtime: %w", err)
	}

	showtime.Status = status

	if err = b.repository.Update(ctx, showtime); err != nil {
		return fmt.Errorf("failed to update showtime status: %w", err)
	}

	b.clearCacheForShowtime(ctx, showtime)

	return nil
}

func (b *business) CheckTimeConflict(ctx context.Context, roomId string, startTime, endTime time.Time, excludeId string) (bool, error) {
	return b.repository.CheckConflict(ctx, roomId, startTime, endTime, excludeId)
}

func (b *business) clearCacheForShowtime(ctx context.Context, showtime *entity.Showtime) {
	_ = b.cache.Delete(ctx, redisShowtimeDetail(showtime.Id))
	_ = b.cache.Delete(ctx, redisShowtimesList())
	_ = b.cache.Delete(ctx, redisMovieShowtimes(showtime.MovieId))
	_ = b.cache.Delete(ctx, redisRoomShowtimes(showtime.RoomId, showtime.StartTime.Format("2006-01-02")))
	_ = b.cache.Delete(ctx, redisUpcomingShowtimes())
}

func (b *business) clearCacheForOldValues(ctx context.Context, movieId, roomId, date string) {
	_ = b.cache.Delete(ctx, redisMovieShowtimes(movieId))
	_ = b.cache.Delete(ctx, redisRoomShowtimes(roomId, date))
}
