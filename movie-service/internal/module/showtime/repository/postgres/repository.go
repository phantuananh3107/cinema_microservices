package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"movie-service/internal/module/showtime/business"
	"movie-service/internal/module/showtime/entity"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type Repository struct {
	db   *bun.DB
	roDb *bun.DB
}

func NewShowtimeRepository(i *do.Injector) (business.ShowtimeRepository, error) {
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

func (r *Repository) Create(ctx context.Context, showtime *entity.Showtime) error {
	if showtime.Id == "" {
		showtime.Id = uuid.New().String()
	}

	now := time.Now()
	showtime.CreatedAt = now
	showtime.UpdatedAt = &now

	_, err := r.db.NewInsert().Model(showtime).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create showtime: %w", err)
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.NewDelete().
		Model((*entity.Showtime)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete showtime: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("showtime with id %s not found", id)
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*entity.Showtime, error) {
	showtime := new(entity.Showtime)

	err := r.roDb.NewSelect().
		Model(showtime).
		Relation("Movie").
		Relation("Room").
		Where("st.id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	var seats []*entity.Seat
	err = r.roDb.NewSelect().
		Model(&seats).
		Where("room_id = ? AND room_id IN (SELECT room_id FROM showtimes WHERE id = ?)", showtime.RoomId, id).
		OrderExpr("row_number ASC, seat_number ASC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load seats: %w", err)
	}

	showtime.Seats = seats

	return showtime, nil
}

func (r *Repository) GetMany(ctx context.Context, limit, offset int, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) ([]*entity.Showtime, error) {
	query := r.roDb.
		NewSelect().
		Model((*entity.Showtime)(nil)).
		Relation("Movie").
		Relation("Room")

	if excludeEnded {
		query = query.Where("st.end_time > ?", time.Now())
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(st.format) LIKE ? OR LOWER(st.status) LIKE ?", searchPattern, searchPattern)
	}

	if movieId != "" {
		query = query.Where("st.movie_id = ?", movieId)
	}

	if roomId != "" {
		query = query.Where("st.room_id = ?", roomId)
	}

	if format != "" {
		query = query.Where("st.format = ?", format)
	}

	if status != "" {
		query = query.Where("st.status = ?", status)
	}

	if dateFrom != nil {
		query = query.Where("st.start_time >= ?", *dateFrom)
	}

	if dateTo != nil {
		query = query.Where("st.start_time <= ?", *dateTo)
	}

	var showtimes []*entity.Showtime
	err := query.
		Order("st.start_time ASC").
		Limit(limit).
		Offset(offset).
		Scan(ctx, &showtimes)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes: %w", err)
	}

	return showtimes, nil
}

func (r *Repository) GetTotalCount(ctx context.Context, search, movieId, roomId string, format entity.ShowtimeFormat, status entity.ShowtimeStatus, dateFrom, dateTo *time.Time, excludeEnded bool) (int, error) {
	query := r.roDb.
		NewSelect().
		Model((*entity.Showtime)(nil))

	if excludeEnded {
		query = query.Where("st.end_time > ?", time.Now())
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(st.format) LIKE ? OR LOWER(st.status) LIKE ?", searchPattern, searchPattern)
	}

	if movieId != "" {
		query = query.Where("st.movie_id = ?", movieId)
	}

	if roomId != "" {
		query = query.Where("st.room_id = ?", roomId)
	}

	if format != "" {
		query = query.Where("st.format = ?", format)
	}

	if status != "" {
		query = query.Where("st.status = ?", status)
	}

	if dateFrom != nil {
		query = query.Where("st.start_time >= ?", *dateFrom)
	}

	if dateTo != nil {
		query = query.Where("st.start_time <= ?", *dateTo)
	}

	count, err := query.Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return count, nil
}

func (r *Repository) GetByMovie(ctx context.Context, movieId string) ([]*entity.Showtime, error) {
	var showtimes []*entity.Showtime
	err := r.roDb.NewSelect().
		Model(&showtimes).
		Where("movie_id = ?", movieId).
		Where("status IN (?)", bun.In([]entity.ShowtimeStatus{
			entity.ShowtimeStatusScheduled,
			entity.ShowtimeStatusOngoing,
		})).
		Order("start_time ASC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes by movie: %w", err)
	}

	return showtimes, nil
}

func (r *Repository) GetUpcoming(ctx context.Context, limit int) ([]*entity.Showtime, error) {
	now := time.Now()

	var showtimes []*entity.Showtime
	err := r.roDb.NewSelect().
		Model(&showtimes).
		Where("start_time > ?", now).
		Where("status = ?", entity.ShowtimeStatusScheduled).
		Order("start_time ASC").
		Limit(limit).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming showtimes: %w", err)
	}

	return showtimes, nil
}

func (r *Repository) Update(ctx context.Context, showtime *entity.Showtime) error {
	now := time.Now()
	showtime.UpdatedAt = &now

	result, err := r.db.NewUpdate().
		Model(showtime).
		Where("id = ?", showtime.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update showtime: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("showtime with id %s not found", showtime.Id)
	}

	return nil
}

func (r *Repository) CheckConflict(ctx context.Context, roomId string, startTime, endTime time.Time, excludeId string) (bool, error) {
	query := r.roDb.NewSelect().
		Model((*entity.Showtime)(nil)).
		Where("room_id = ?", roomId).
		Where("status IN (?)", bun.In([]entity.ShowtimeStatus{
			entity.ShowtimeStatusScheduled,
			entity.ShowtimeStatusOngoing,
		})).
		Where("start_time <= ? AND end_time > ?", endTime, startTime)

	if excludeId != "" {
		query = query.Where("id != ?", excludeId)
	}

	exists, err := query.Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to check showtime conflict: %w", err)
	}

	return exists, nil
}

func (r *Repository) GetByIds(ctx context.Context, ids []string) ([]*entity.Showtime, error) {
	showtimes := make([]*entity.Showtime, 0)

	query := r.roDb.NewSelect().
		Model(&showtimes).
		Relation("Movie").
		Relation("Room").
		Where("st.id IN (?)", bun.In(ids)).
		Order("st.start_time ASC")

	err := query.Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes by ids: %w", err)
	}

	return showtimes, nil
}
