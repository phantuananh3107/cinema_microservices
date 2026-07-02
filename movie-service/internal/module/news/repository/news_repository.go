package repository

import (
	"context"

	"movie-service/internal/module/news/entity"

	"github.com/uptrace/bun"
)

type NewsRepository interface {
	GetNewsSummaries(ctx context.Context, category string, limit int, offset int, includeInactive bool) ([]*entity.NewsSummary, error)
	GetNewsSummaryByID(ctx context.Context, id string) (*entity.NewsSummary, error)
	GetArticlesByIDs(ctx context.Context, ids []string) ([]*entity.NewsArticle, error)
	CountSummaries(ctx context.Context, category string, includeInactive bool) (int, error)
	UpdateNewsSummary(ctx context.Context, id string, title string, summary string) error
	UpdateNewsSummaryIsActive(ctx context.Context, id string, isActive bool) error
}

type newsRepository struct {
	db *bun.DB
}

func NewNewsRepository(db *bun.DB) NewsRepository {
	return &newsRepository{db: db}
}

func (r *newsRepository) GetNewsSummaries(ctx context.Context, category string, limit int, offset int, includeInactive bool) ([]*entity.NewsSummary, error) {
	var summaries []*entity.NewsSummary

	query := r.db.NewSelect().
		Model(&summaries).
		Where("status IN (?)", bun.In([]string{"PUBLISHED", "SUMMARIZED"})).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset)

	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}

	if category != "" && category != "all" {
		query = query.Where("category = ?", category)
	}

	err := query.Scan(ctx)
	if err != nil {
		return nil, err
	}

	return summaries, nil
}

func (r *newsRepository) GetNewsSummaryByID(ctx context.Context, id string) (*entity.NewsSummary, error) {
	var summary entity.NewsSummary

	err := r.db.NewSelect().
		Model(&summary).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return &summary, nil
}

func (r *newsRepository) GetArticlesByIDs(ctx context.Context, ids []string) ([]*entity.NewsArticle, error) {
	var articles []*entity.NewsArticle

	err := r.db.NewSelect().
		Model(&articles).
		Where("id IN (?)", bun.In(ids)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return articles, nil
}

func (r *newsRepository) CountSummaries(ctx context.Context, category string, includeInactive bool) (int, error) {
	query := r.db.NewSelect().
		Model((*entity.NewsSummary)(nil)).
		Where("status IN (?)", bun.In([]string{"PUBLISHED", "SUMMARIZED"}))

	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}

	if category != "" && category != "all" {
		query = query.Where("category = ?", category)
	}

	count, err := query.Count(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *newsRepository) UpdateNewsSummary(ctx context.Context, id string, title string, summary string) error {
	_, err := r.db.NewUpdate().
		Model((*entity.NewsSummary)(nil)).
		Set("title = ?", title).
		Set("summary = ?", summary).
		Set("updated_at = NOW()").
		Where("id = ?", id).
		Exec(ctx)
	return err
}

func (r *newsRepository) UpdateNewsSummaryIsActive(ctx context.Context, id string, isActive bool) error {
	_, err := r.db.NewUpdate().
		Model((*entity.NewsSummary)(nil)).
		Set("is_active = ?", isActive).
		Set("updated_at = NOW()").
		Where("id = ?", id).
		Exec(ctx)
	return err
}
