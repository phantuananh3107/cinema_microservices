package datastore

import (
	"context"

	"github.com/uptrace/bun"
)

type BunDatastore struct {
	bun *bun.DB
}

func NewBunDatastore(db *bun.DB) *BunDatastore {
	return &BunDatastore{bun: db}
}

func Migrate(ctx context.Context, db *bun.DB) error {
	funcs := make([]func(context.Context, *bun.DB) error, 0)
	funcs = append(funcs, CreateNotificationTable)

	for _, f := range funcs {
		if err := f(ctx, db); err != nil {
			return err
		}
	}

	return nil
}
