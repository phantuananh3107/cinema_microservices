package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateGenreTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Genre)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create genres table: %w", err)
	}
	return nil
}

func DropGenreTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Genre)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop genres table: %w", err)
	}
	return nil
}

func CreateMovieGenreTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.MovieGenre)(nil)).
		IfNotExists().
		ForeignKey(`("movie_id") REFERENCES "movies" ("id") ON DELETE CASCADE`).
		ForeignKey(`("genre_id") REFERENCES "genres" ("id") ON DELETE CASCADE`).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create movie_genres table: %w", err)
	}

	// Create indexes for better query performance
	_, err = db.NewCreateIndex().
		Model((*models.MovieGenre)(nil)).
		Index("idx_movie_genres_movie_id").
		Column("movie_id").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on movie_id: %w", err)
	}

	_, err = db.NewCreateIndex().
		Model((*models.MovieGenre)(nil)).
		Index("idx_movie_genres_genre_id").
		Column("genre_id").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on genre_id: %w", err)
	}

	// Create unique constraint to prevent duplicate movie-genre pairs
	_, err = db.NewCreateIndex().
		Model((*models.MovieGenre)(nil)).
		Index("idx_movie_genres_unique").
		Column("movie_id", "genre_id").
		Unique().
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create unique index: %w", err)
	}

	return nil
}

func DropMovieGenreTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.MovieGenre)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop movie_genres table: %w", err)
	}
	return nil
}
