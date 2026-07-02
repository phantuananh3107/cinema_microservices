package business

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"movie-service/internal/pkg/paging"

	"movie-service/internal/module/seat/entity"
	"movie-service/internal/pkg/caching"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
)

var (
	ErrInvalidSeatData         = fmt.Errorf("invalid seat data")
	ErrInvalidStatusTransition = fmt.Errorf("invalid status transition")
	ErrSeatNotFound            = fmt.Errorf("seat not found")
	ErrSeatPositionExists      = fmt.Errorf("seat position already exists in this room")
)

type SeatBiz interface {
	GetSeatById(ctx context.Context, id string) (*entity.Seat, error)
	GetSeatsByIds(ctx context.Context, ids []string) ([]*entity.Seat, error)
	GetSeats(ctx context.Context, page, size int, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) ([]*entity.Seat, int, error)
	GetLockedSeatsByShowtime(ctx context.Context, showtimeId string) (*entity.LockedSeatsResponse, error)
	CreateSeat(ctx context.Context, seat *entity.Seat) error
	UpdateSeat(ctx context.Context, id string, updates *entity.UpdateSeatRequest) error
	DeleteSeat(ctx context.Context, id string) error
	UpdateSeatStatus(ctx context.Context, id string, status entity.SeatStatus) error
}

type SeatRepository interface {
	GetByID(ctx context.Context, id string) (*entity.Seat, error)
	GetByIDs(ctx context.Context, ids []string) ([]*entity.Seat, error)
	GetMany(ctx context.Context, limit, offset int, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) ([]*entity.Seat, error)
	GetTotalCount(ctx context.Context, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) (int, error)
	Create(ctx context.Context, seat *entity.Seat) error
	Update(ctx context.Context, seat *entity.Seat) error
	Delete(ctx context.Context, id string) error
	ExistsBySeatPosition(ctx context.Context, roomId, seatNumber, rowNumber string, excludeId string) (bool, error)
}

type business struct {
	repository  SeatRepository
	cache       caching.Cache
	roCache     caching.ReadOnlyCache
	redisClient redis.UniversalClient
}

func NewBusiness(i *do.Injector) (SeatBiz, error) {
	cache, err := do.Invoke[caching.Cache](i)
	if err != nil {
		return nil, err
	}

	roCache, err := do.Invoke[caching.ReadOnlyCache](i)
	if err != nil {
		return nil, err
	}

	repository, err := do.Invoke[SeatRepository](i)
	if err != nil {
		return nil, err
	}

	redisClient, err := do.InvokeNamed[redis.UniversalClient](i, "redis-db")
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

func (b *business) GetSeatById(ctx context.Context, id string) (*entity.Seat, error) {
	callback := func() (*entity.Seat, error) {
		return b.repository.GetByID(ctx, id)
	}

	seat, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, keySeatDetail(id), CACHE_TTL_1_HOUR, callback)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSeatNotFound
		}
		return nil, fmt.Errorf("failed to get seat: %w", err)
	}

	return seat, nil
}

func (b *business) GetSeatsByIds(ctx context.Context, ids []string) ([]*entity.Seat, error) {
	seats, err := b.repository.GetByIDs(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to get seats by IDs: %w", err)
	}

	return seats, nil
}

func (b *business) GetSeats(ctx context.Context, page, size int, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) ([]*entity.Seat, int, error) {
	if page < 1 || size < 1 {
		return nil, 0, ErrInvalidSeatData
	}

	offset := (page - 1) * size

	pagingObj := &paging.Paging{
		Limit:  size,
		Offset: offset,
	}

	seats, err := b.repository.GetMany(ctx, size, offset, search, roomId, rowNumber, seatType, status)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get seats: %w", err)
	}

	callbackTotal := func() (int, error) {
		return b.repository.GetTotalCount(ctx, search, roomId, rowNumber, seatType, status)
	}

	total, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, keySeatsListWithFilters(pagingObj, search+":total", roomId, rowNumber, seatType, status), CACHE_TTL_30_MINS, callbackTotal)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return seats, total, nil
}

func (b *business) getConcurrentLockedSeatsByShowtime(ctx context.Context, showtimeId string) (map[string]bool, error) {
	pattern := fmt.Sprintf("seat:concurrent_lock:%s:*", showtimeId)
	keys, err := b.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get concurrent lock keys: %w", err)
	}

	lockedSeats := make(map[string]bool)
	for _, key := range keys {
		parts := strings.Split(key, ":")
		if len(parts) == 4 {
			seatId := parts[3]
			lockedSeats[seatId] = true
		}
	}

	return lockedSeats, nil
}

func (b *business) getBookedSeatsByShowtime(ctx context.Context, showtimeId string) (map[string]bool, error) {
	pattern := fmt.Sprintf("seat_lock:%s:*", showtimeId)
	keys, err := b.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get booked seat keys: %w", err)
	}

	bookedSeats := make(map[string]bool)
	for _, key := range keys {
		parts := strings.Split(key, ":")
		if len(parts) == 3 {
			seatId := parts[2]
			bookedSeats[seatId] = true
		}
	}

	return bookedSeats, nil
}

func (b *business) GetLockedSeatsByShowtime(ctx context.Context, showtimeId string) (*entity.LockedSeatsResponse, error) {
	concurrentLockedSeatsMap, err := b.getConcurrentLockedSeatsByShowtime(ctx, showtimeId)
	if err != nil {
		return nil, fmt.Errorf("failed to get concurrent locked seats: %w", err)
	}

	lockedSeatIds := make([]string, 0, len(concurrentLockedSeatsMap))
	for seatId := range concurrentLockedSeatsMap {
		lockedSeatIds = append(lockedSeatIds, seatId)
	}

	bookedSeatsMap, err := b.getBookedSeatsByShowtime(ctx, showtimeId)
	if err != nil {
		return nil, fmt.Errorf("failed to get booked seats: %w", err)
	}

	bookedSeatIds := make([]string, 0, len(bookedSeatsMap))
	for seatId := range bookedSeatsMap {
		if concurrentLockedSeatsMap[seatId] {
			continue
		}
		bookedSeatIds = append(bookedSeatIds, seatId)
	}

	return &entity.LockedSeatsResponse{
		LockedSeatIds: lockedSeatIds,
		BookedSeatIds: bookedSeatIds,
	}, nil
}

func (b *business) CreateSeat(ctx context.Context, seat *entity.Seat) error {
	if seat == nil || !seat.IsValid() {
		return ErrInvalidSeatData
	}

	exists, err := b.repository.ExistsBySeatPosition(ctx, seat.RoomId, seat.SeatNumber, seat.RowNumber, "")
	if err != nil {
		return fmt.Errorf("failed to check seat position: %w", err)
	}
	if exists {
		return ErrSeatPositionExists
	}

	if err := b.repository.Create(ctx, seat); err != nil {
		return fmt.Errorf("failed to create seat: %w", err)
	}

	b.invalidateSeatsListCache(ctx)

	return nil
}

func (b *business) UpdateSeat(ctx context.Context, id string, updates *entity.UpdateSeatRequest) error {
	seat, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeatNotFound
		}
		return fmt.Errorf("failed to get seat: %w", err)
	}

	if updates.SeatNumber != nil || updates.RowNumber != nil {
		seatNumber := seat.SeatNumber
		rowNumber := seat.RowNumber

		if updates.SeatNumber != nil {
			seatNumber = *updates.SeatNumber
		}
		if updates.RowNumber != nil {
			rowNumber = *updates.RowNumber
		}

		exists, err := b.repository.ExistsBySeatPosition(ctx, seat.RoomId, seatNumber, rowNumber, id)
		if err != nil {
			return fmt.Errorf("failed to check seat position: %w", err)
		}
		if exists {
			return ErrSeatPositionExists
		}

		seat.SeatNumber = seatNumber
		seat.RowNumber = rowNumber
	}

	if updates.SeatType != nil {
		seat.SeatType = *updates.SeatType
	}

	if updates.Status != nil {
		seat.Status = *updates.Status
	}

	if !seat.IsValid() {
		return ErrInvalidSeatData
	}

	if err := b.repository.Update(ctx, seat); err != nil {
		return fmt.Errorf("failed to update seat: %w", err)
	}

	_ = b.cache.Delete(ctx, keySeatDetail(id))

	return nil
}

func (b *business) DeleteSeat(ctx context.Context, id string) error {
	_, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeatNotFound
		}
		return fmt.Errorf("failed to get seat: %w", err)
	}

	if err = b.repository.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete seat: %w", err)
	}

	b.invalidateSeatsListCache(ctx)
	_ = b.cache.Delete(ctx, keySeatDetail(id))

	return nil
}

func (b *business) UpdateSeatStatus(ctx context.Context, id string, status entity.SeatStatus) error {
	seat, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeatNotFound
		}
		return fmt.Errorf("failed to get seat: %w", err)
	}

	seat.Status = status

	if err := b.repository.Update(ctx, seat); err != nil {
		return fmt.Errorf("failed to update seat status: %w", err)
	}

	b.invalidateSeatsListCache(ctx)
	_ = b.cache.Delete(ctx, keySeatDetail(id))

	return nil
}

func (b *business) invalidateSeatsListCache(ctx context.Context) {
	_ = caching.DeleteKeys(ctx, b.redisClient, keySeatsListPattern)
	_ = caching.DeleteKeys(ctx, b.redisClient, keySeatDetailPattern)
}
