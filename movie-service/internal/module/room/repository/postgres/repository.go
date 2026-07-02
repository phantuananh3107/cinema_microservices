package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"movie-service/internal/module/room/business"
	"movie-service/internal/module/room/entity"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type Repository struct {
	db   *bun.DB
	roDb *bun.DB
}

func NewRoomRepository(i *do.Injector) (business.RoomRepository, error) {
	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	roDb, err := do.InvokeNamed[*bun.DB](i, "readonly-db")
	if err != nil {
		return nil, err
	}

	return &Repository{
		db:   db,
		roDb: roDb,
	}, nil
}

func (r *Repository) Create(ctx context.Context, room *entity.Room) error {
	if room.Id == "" {
		room.Id = uuid.New().String()
	}

	now := time.Now()
	room.CreatedAt = now
	room.UpdatedAt = &now

	_, err := r.db.NewInsert().Model(room).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create room: %w", err)
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.NewDelete().
		Model((*entity.Room)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete room: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("room with id %s not found", id)
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*entity.Room, error) {
	var room entity.Room
	err := r.roDb.NewSelect().
		Model(&room).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return &room, nil
}

func (r *Repository) GetMany(ctx context.Context, limit, offset int, search string, roomType entity.RoomType, status entity.RoomStatus) ([]*entity.Room, error) {
	query := r.roDb.NewSelect().Model((*entity.Room)(nil))

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(CAST(room_number AS TEXT)) LIKE ? OR LOWER(room_type) LIKE ?", searchPattern, searchPattern)
	}

	if roomType != "" {
		query = query.Where("room_type = ?", roomType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var rooms []*entity.Room
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(ctx, &rooms)
	if err != nil {
		return nil, fmt.Errorf("failed to get rooms: %w", err)
	}

	return rooms, nil
}

func (r *Repository) GetTotalCount(ctx context.Context, search string, roomType entity.RoomType, status entity.RoomStatus) (int, error) {
	query := r.roDb.NewSelect().Model((*entity.Room)(nil))

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(CAST(room_number AS TEXT)) LIKE ? OR LOWER(room_type) LIKE ?", searchPattern, searchPattern)
	}

	if roomType != "" {
		query = query.Where("room_type = ?", roomType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	count, err := query.Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return count, nil
}

func (r *Repository) Update(ctx context.Context, room *entity.Room) error {
	now := time.Now()
	room.UpdatedAt = &now

	result, err := r.db.NewUpdate().
		Model(room).
		Where("id = ?", room.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update room: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("room with id %s not found", room.Id)
	}

	return nil
}

func (r *Repository) ExistsByRoomNumber(ctx context.Context, roomNumber int, excludeId string) (bool, error) {
	query := r.roDb.NewSelect().
		Model((*entity.Room)(nil)).
		Where("room_number = ?", roomNumber)

	if excludeId != "" {
		query = query.Where("id != ?", excludeId)
	}

	exists, err := query.Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to check room number existence: %w", err)
	}

	return exists, nil
}
