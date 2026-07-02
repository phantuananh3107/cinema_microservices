package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateNotificationTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Notification)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create notifications table: %w", err)
	}
	return nil
}

func DropNotificationTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Notification)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop notifications table: %w", err)
	}
	return nil
}
