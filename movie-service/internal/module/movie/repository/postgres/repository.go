package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"movie-service/internal/module/movie/business"
	"movie-service/internal/module/movie/entity"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type Repository struct {
	db   *bun.DB
	roDb *bun.DB
}

func NewMovieRepository(i *do.Injector) (business.MovieRepository, error) {
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

func (r *Repository) Create(ctx context.Context, movie *entity.Movie, genreIds []string) error {
	if movie.Id == "" {
		movie.Id = uuid.New().String()
	}

	now := time.Now()
	movie.CreatedAt = &now
	movie.UpdatedAt = &now

	_, err := r.db.NewInsert().Model(movie).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create movie: %w", err)
	}

	if len(genreIds) > 0 {
		movieGenres := make([]*entity.MovieGenre, len(genreIds))
		for i, genreId := range genreIds {
			movieGenres[i] = &entity.MovieGenre{
				Id:        uuid.New().String(),
				MovieId:   movie.Id,
				GenreId:   genreId,
				CreatedAt: time.Now(),
			}
		}

		_, err = r.db.NewInsert().Model(&movieGenres).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to create movie genres: %w", err)
		}
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.NewDelete().
		Model((*entity.Movie)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete movie: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("movie with id %s not found", id)
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*entity.Movie, error) {
	var movie entity.Movie
	err := r.roDb.NewSelect().
		Model(&movie).
		Relation("MovieGenres").
		Relation("MovieGenres.Genre").
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	movie.Genres = make([]*entity.Genre, len(movie.MovieGenres))
	for i, mg := range movie.MovieGenres {
		movie.Genres[i] = mg.Genre
	}

	return &movie, nil
}

func (r *Repository) GetMany(ctx context.Context, limit, offset int, search string, status string) ([]*entity.Movie, error) {
	var movies []*entity.Movie

	query := r.roDb.NewSelect().
		Model(&movies).
		Relation("MovieGenres").
		Relation("MovieGenres.Genre").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset)

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(`LOWER("title") LIKE ? OR LOWER("director") LIKE ? OR LOWER("cast") LIKE ?`,
			searchPattern, searchPattern, searchPattern)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Scan(ctx)
	if err != nil {
		return nil, err
	}

	for _, movie := range movies {
		movie.Genres = make([]*entity.Genre, len(movie.MovieGenres))
		for i, mg := range movie.MovieGenres {
			movie.Genres[i] = mg.Genre
		}
	}

	return movies, nil
}

func (r *Repository) GetTotalCount(ctx context.Context, search string, status string) (int, error) {
	query := r.roDb.NewSelect().
		Model((*entity.Movie)(nil))

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(`LOWER("title") LIKE ? OR LOWER("director") LIKE ? OR LOWER("cast") LIKE ?`,
			searchPattern, searchPattern, searchPattern)
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

func (r *Repository) GetMovieStats(ctx context.Context) ([]*entity.MovieStat, error) {
	var results []*entity.MovieStat
	err := r.roDb.NewSelect().
		Model((*entity.Movie)(nil)).
		Column("status").
		ColumnExpr("COUNT(*) as count").
		Group("status").
		Scan(ctx, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (r *Repository) Update(ctx context.Context, movie *entity.Movie, genreIds []string) error {
	now := time.Now()
	movie.UpdatedAt = &now

	_, err := r.db.NewUpdate().
		Model(movie).
		Column("title", "director", "cast", "duration", "release_date", "description", "trailer_url", "poster_url", "status", "updated_at").
		Where("id = ?", movie.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update movie: %w", err)
	}

	if genreIds == nil {
		return nil
	}

	_, err = r.db.NewDelete().
		Model((*entity.MovieGenre)(nil)).
		Where("movie_id = ?", movie.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete existing movie genres: %w", err)
	}

	if len(genreIds) > 0 {
		movieGenres := make([]*entity.MovieGenre, len(genreIds))
		for i, genreId := range genreIds {
			movieGenres[i] = &entity.MovieGenre{
				Id:        uuid.New().String(),
				MovieId:   movie.Id,
				GenreId:   genreId,
				CreatedAt: time.Now(),
			}
		}

		_, err = r.db.NewInsert().Model(&movieGenres).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to create movie genres: %w", err)
		}
	}

	return nil
}

func (r *Repository) GetGenres(ctx context.Context) ([]*entity.Genre, error) {
	var genres []*entity.Genre
	err := r.roDb.NewSelect().
		Model(&genres).
		Order("name ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return genres, nil
}
