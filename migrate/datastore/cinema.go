package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateMovieTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Movie)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create movies table: %w", err)
	}
	return nil
}

func CreateRoomTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Room)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create rooms table: %w", err)
	}
	return nil
}

func CreateSeatTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Seat)(nil)).
		IfNotExists().
		ForeignKey("(room_id) REFERENCES rooms(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create seats table: %w", err)
	}
	return nil

	// TODO: create index on roomId, rowNumber, columnNumber on seats
}

func CreateShowtimeTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Showtime)(nil)).
		IfNotExists().
		ForeignKey("(room_id) REFERENCES rooms(id) ON DELETE CASCADE").
		ForeignKey("(movie_id) REFERENCES movies(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create showtimes table: %w", err)
	}
	return nil
}

func DropMovieTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Movie)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop movies table: %w", err)
	}
	return nil
}

func DropRoomTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Room)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop rooms table: %w", err)
	}
	return nil
}

func DropSeatTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Seat)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop seats table: %w", err)
	}
	return nil
}

func DropShowtimeTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Showtime)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop showtimes table: %w", err)
	}
	return nil
}
