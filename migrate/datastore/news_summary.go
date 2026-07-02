package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateNewsSummaryTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.NewsSummary)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create news_summaries table: %w", err)
	}

	// Add is_active column if not exists (for existing tables)
	_, err = db.ExecContext(ctx, `
		ALTER TABLE news_summaries
		ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
	`)
	if err != nil {
		return fmt.Errorf("failed to add is_active column to news_summaries table: %w", err)
	}

	// Create indexes
	_, err = db.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_news_summaries_status ON news_summaries(status);
		CREATE INDEX IF NOT EXISTS idx_news_summaries_category ON news_summaries(category);
		CREATE INDEX IF NOT EXISTS idx_news_summaries_created_at ON news_summaries(created_at DESC);
	`)
	if err != nil {
		return fmt.Errorf("failed to create indexes on news_summaries table: %w", err)
	}

	return nil
}

func DropNewsSummaryTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.NewsSummary)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop news_summaries table: %w", err)
	}
	return nil
}
