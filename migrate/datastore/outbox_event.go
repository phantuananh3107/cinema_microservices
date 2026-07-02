package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateOutboxEventTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.OutboxEvent)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create outbox events table: %w", err)
	}
	return nil
}

func DropOutboxEventTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.OutboxEvent)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop outbox events table: %w", err)
	}
	return nil
}
