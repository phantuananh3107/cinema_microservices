package datastore

import (
	"context"
	"fmt"

	"worker-service/internal/models"

	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type NewsArticleRepository interface {
	ArticleExists(ctx context.Context, sourceURL string) (bool, error)
	UpsertArticle(ctx context.Context, article *models.NewsArticle) error
	UpdateArticle(ctx context.Context, article *models.NewsArticle, sourceURL string) error
	CreateArticle(ctx context.Context, article *models.NewsArticle) error
}

type newsArticleRepository struct {
	db *bun.DB
}

func NewNewsArticleRepository(i *do.Injector) (NewsArticleRepository, error) {
	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	return &newsArticleRepository{
		db: db,
	}, nil
}

func (r *newsArticleRepository) ArticleExists(ctx context.Context, sourceURL string) (bool, error) {
	exists, err := r.db.NewSelect().
		Model((*models.NewsArticle)(nil)).
		Where("source_url = ?", sourceURL).
		Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to check article existence: %w", err)
	}

	return exists, nil
}

func (r *newsArticleRepository) UpsertArticle(ctx context.Context, article *models.NewsArticle) error {
	exists, err := r.ArticleExists(ctx, article.SourceURL)
	if err != nil {
		return err
	}

	if exists {
		return r.UpdateArticle(ctx, article, article.SourceURL)
	}

	return r.CreateArticle(ctx, article)
}

func (r *newsArticleRepository) UpdateArticle(ctx context.Context, article *models.NewsArticle, sourceURL string) error {
	_, err := r.db.NewUpdate().
		Model(article).
		Where("source_url = ?", sourceURL).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update article: %w", err)
	}

	return nil
}

func (r *newsArticleRepository) CreateArticle(ctx context.Context, article *models.NewsArticle) error {
	_, err := r.db.NewInsert().
		Model(article).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to insert article: %w", err)
	}

	return nil
}