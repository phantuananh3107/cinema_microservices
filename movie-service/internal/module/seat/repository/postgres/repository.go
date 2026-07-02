package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"movie-service/internal/module/seat/business"
	"movie-service/internal/module/seat/entity"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type Repository struct {
	db   *bun.DB
	roDb *bun.DB
}

func NewSeatRepository(i *do.Injector) (business.SeatRepository, error) {
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

func (r *Repository) Create(ctx context.Context, seat *entity.Seat) error {
	if seat.Id == "" {
		seat.Id = uuid.New().String()
	}

	now := time.Now()
	seat.CreatedAt = now
	seat.UpdatedAt = &now

	_, err := r.db.NewInsert().Model(seat).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create seat: %w", err)
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.NewDelete().
		Model((*entity.Seat)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete seat: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("seat with id %s not found", id)
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*entity.Seat, error) {
	var seat entity.Seat
	err := r.roDb.NewSelect().
		Model(&seat).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return &seat, nil
}

func (r *Repository) GetByIDs(ctx context.Context, ids []string) ([]*entity.Seat, error) {
	if len(ids) == 0 {
		return []*entity.Seat{}, nil
	}

	var seats []*entity.Seat
	err := r.roDb.NewSelect().
		Model(&seats).
		Where("id IN (?)", bun.In(ids)).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get seats by IDs: %w", err)
	}

	return seats, nil
}

func (r *Repository) GetMany(ctx context.Context, limit, offset int, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) ([]*entity.Seat, error) {
	query := r.roDb.NewSelect().Model((*entity.Seat)(nil))

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(seat_number) LIKE ? OR LOWER(row_number) LIKE ?", searchPattern, searchPattern)
	}

	if roomId != "" {
		query = query.Where("room_id = ?", roomId)
	}

	if rowNumber != "" {
		query = query.Where("row_number = ?", rowNumber)
	}

	if seatType != "" {
		query = query.Where("seat_type = ?", seatType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var seats []*entity.Seat
	err := query.
		OrderExpr("row_number ASC, seat_number ASC").
		Limit(limit).
		Offset(offset).
		Scan(ctx, &seats)
	if err != nil {
		return nil, err
	}

	return seats, nil
}

func (r *Repository) GetTotalCount(ctx context.Context, search, roomId, rowNumber string, seatType entity.SeatType, status entity.SeatStatus) (int, error) {
	query := r.roDb.NewSelect().Model((*entity.Seat)(nil))

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(seat_number) LIKE ? OR LOWER(row_number) LIKE ?", searchPattern, searchPattern)
	}

	if roomId != "" {
		query = query.Where("room_id = ?", roomId)
	}

	if rowNumber != "" {
		query = query.Where("row_number = ?", rowNumber)
	}

	if seatType != "" {
		query = query.Where("seat_type = ?", seatType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	count, err := query.Count(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *Repository) Update(ctx context.Context, seat *entity.Seat) error {
	now := time.Now()
	seat.UpdatedAt = &now

	result, err := r.db.NewUpdate().
		Model(seat).
		Where("id = ?", seat.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update seat: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("seat with id %s not found", seat.Id)
	}

	return nil
}

func (r *Repository) ExistsBySeatPosition(ctx context.Context, roomId, seatNumber, rowNumber string, excludeId string) (bool, error) {
	query := r.roDb.NewSelect().
		Model((*entity.Seat)(nil)).
		Where("room_id = ? AND seat_number = ? AND row_number = ?", roomId, seatNumber, rowNumber)

	if excludeId != "" {
		query = query.Where("id != ?", excludeId)
	}

	exists, err := query.Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to check seat position existence: %w", err)
	}

	return exists, nil
}
