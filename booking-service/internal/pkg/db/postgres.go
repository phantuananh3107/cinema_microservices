package db

import (
	"database/sql"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

type PostgresConfig struct {
	DSN          string
	Password     string
	MaxOpenConns int
	MaxIdleConns int
}

func NewPostgres(cfg *PostgresConfig) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(
		pgdriver.WithDSN(cfg.DSN),
		pgdriver.WithPassword(cfg.Password),
	))

	maxOpenConns := 400
	if cfg.MaxOpenConns > 0 {
		maxOpenConns = cfg.MaxOpenConns
	}
	maxIdleConns := 400
	if cfg.MaxIdleConns > 0 {
		maxIdleConns = cfg.MaxIdleConns
	}
	sqldb.SetMaxOpenConns(maxOpenConns)
	sqldb.SetMaxIdleConns(maxIdleConns)

	db := bun.NewDB(sqldb, pgdialect.New())
	return db, nil
}
