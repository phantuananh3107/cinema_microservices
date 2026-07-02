package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateRoleTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Role)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create roles table: %w", err)
	}
	return nil
}

func DropRoleTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Role)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop roles table: %w", err)
	}
	return nil
}
