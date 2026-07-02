package business

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"movie-service/internal/module/room/entity"
	"movie-service/internal/pkg/caching"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
)

var (
	ErrInvalidRoomData         = fmt.Errorf("invalid room data")
	ErrInvalidStatusTransition = fmt.Errorf("invalid status transition")
	ErrRoomNotFound            = fmt.Errorf("room not found")
	ErrRoomNumberExists        = fmt.Errorf("room number already exists")
	ErrRoomNotActive           = fmt.Errorf("room is not in ACTIVE status")
)

type RoomBiz interface {
	GetRoomById(ctx context.Context, id string) (*entity.Room, error)
	GetRooms(ctx context.Context, page, size int, search string, roomType entity.RoomType, status entity.RoomStatus) ([]*entity.Room, int, error)
	CreateRoom(ctx context.Context, room *entity.Room) error
	UpdateRoom(ctx context.Context, id string, updates *entity.UpdateRoomRequest) error
	DeleteRoom(ctx context.Context, id string) error
	UpdateRoomStatus(ctx context.Context, id string, status entity.RoomStatus) error
	ValidateRoomForShowtime(ctx context.Context, roomId string) error
}

type RoomRepository interface {
	GetByID(ctx context.Context, id string) (*entity.Room, error)
	GetMany(ctx context.Context, limit, offset int, search string, roomType entity.RoomType, status entity.RoomStatus) ([]*entity.Room, error)
	GetTotalCount(ctx context.Context, search string, roomType entity.RoomType, status entity.RoomStatus) (int, error)
	Create(ctx context.Context, room *entity.Room) error
	Update(ctx context.Context, room *entity.Room) error
	Delete(ctx context.Context, id string) error
	ExistsByRoomNumber(ctx context.Context, roomNumber int, excludeId string) (bool, error)
}

type business struct {
	repository  RoomRepository
	cache       caching.Cache
	roCache     caching.ReadOnlyCache
	redisClient redis.UniversalClient
}

func NewBusiness(i *do.Injector) (RoomBiz, error) {
	cache, err := do.Invoke[caching.Cache](i)
	if err != nil {
		return nil, err
	}

	roCache, err := do.Invoke[caching.ReadOnlyCache](i)
	if err != nil {
		return nil, err
	}

	repository, err := do.Invoke[RoomRepository](i)
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

func (b *business) GetRoomById(ctx context.Context, id string) (*entity.Room, error) {
	callback := func() (*entity.Room, error) {
		return b.repository.GetByID(ctx, id)
	}

	room, err := caching.UseCacheWithRO(ctx, b.roCache, b.cache, redisRoomDetail(id), CACHE_TTL_1_HOUR, callback)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	return room, nil
}

func (b *business) GetRooms(ctx context.Context, page, size int, search string, roomType entity.RoomType, status entity.RoomStatus) ([]*entity.Room, int, error) {
	if page < 1 || size < 1 {
		return nil, 0, ErrInvalidRoomData
	}

	offset := (page - 1) * size

	rooms, err := b.repository.GetMany(ctx, size, offset, search, roomType, status)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get rooms: %w", err)
	}

	total, err := b.repository.GetTotalCount(ctx, search, roomType, status)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return rooms, total, nil
}

func (b *business) CreateRoom(ctx context.Context, room *entity.Room) error {
	if room == nil || !room.IsValid() {
		return ErrInvalidRoomData
	}

	exists, err := b.repository.ExistsByRoomNumber(ctx, room.RoomNumber, "")
	if err != nil {
		return fmt.Errorf("failed to check room number: %w", err)
	}
	if exists {
		return ErrRoomNumberExists
	}

	if err = b.repository.Create(ctx, room); err != nil {
		return fmt.Errorf("failed to create room: %w", err)
	}

	b.clearCacheForRoom(ctx, room.Id)

	return nil
}

func (b *business) UpdateRoom(ctx context.Context, id string, updates *entity.UpdateRoomRequest) error {
	if id == "" || updates == nil {
		return ErrInvalidRoomData
	}

	room, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoomNotFound
		}
		return fmt.Errorf("failed to get room: %w", err)
	}

	if updates.RoomNumber != nil {
		exists, err := b.repository.ExistsByRoomNumber(ctx, *updates.RoomNumber, id)
		if err != nil {
			return fmt.Errorf("failed to check room number: %w", err)
		}
		if exists {
			return ErrRoomNumberExists
		}
		room.RoomNumber = *updates.RoomNumber
	}

	if updates.Capacity != nil {
		room.Capacity = *updates.Capacity
	}

	if updates.RoomType != nil {
		room.RoomType = *updates.RoomType
	}

	if updates.Status != nil {
		room.Status = *updates.Status
	}

	if !room.IsValid() {
		return ErrInvalidRoomData
	}

	if err = b.repository.Update(ctx, room); err != nil {
		return fmt.Errorf("failed to update room: %w", err)
	}

	b.clearCacheForRoom(ctx, id)

	return nil
}

func (b *business) DeleteRoom(ctx context.Context, id string) error {
	if id == "" {
		return ErrInvalidRoomData
	}

	if err := b.repository.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete room: %w", err)
	}

	b.clearCacheForRoom(ctx, id)

	return nil
}

func (b *business) UpdateRoomStatus(ctx context.Context, id string, status entity.RoomStatus) error {
	if id == "" {
		return ErrInvalidRoomData
	}

	room, err := b.repository.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoomNotFound
		}
		return fmt.Errorf("failed to get room: %w", err)
	}

	room.Status = status

	if err = b.repository.Update(ctx, room); err != nil {
		return fmt.Errorf("failed to update room status: %w", err)
	}

	b.clearCacheForRoom(ctx, id)

	return nil
}

func (b *business) ValidateRoomForShowtime(ctx context.Context, roomId string) error {
	if roomId == "" {
		return ErrInvalidRoomData
	}

	room, err := b.GetRoomById(ctx, roomId)
	if err != nil {
		return err
	}

	if room.Status != entity.RoomStatusActive {
		return ErrRoomNotActive
	}

	return nil
}

func (b *business) clearCacheForRoom(ctx context.Context, roomId string) {
	_ = b.cache.Delete(ctx, redisRoomDetail(roomId))
	_ = b.cache.Delete(ctx, redisRoomsList())
}
