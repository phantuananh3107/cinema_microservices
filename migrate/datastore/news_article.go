package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateNewsArticleTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.NewsArticle)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create news_articles table: %w", err)
	}

	// Create indexes for better query performance
	_, err = db.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_news_articles_status ON news_articles(status);
		CREATE INDEX IF NOT EXISTS idx_news_articles_language ON news_articles(language);
		CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
		CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
		CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON news_articles(created_at DESC);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_source_url ON news_articles(source_url);
	`)
	if err != nil {
		return fmt.Errorf("failed to create indexes on news_articles table: %w", err)
	}

	return nil
}

func DropNewsArticleTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.NewsArticle)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop news_articles table: %w", err)
	}
	return nil
}
