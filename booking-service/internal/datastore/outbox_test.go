package datastore

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

	"booking-service/internal/models"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

func newMockOutboxDB(t *testing.T) (*bun.DB, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("failed to create sqlmock database: %v", err)
	}

	db := bun.NewDB(sqlDB, pgdialect.New())
	t.Cleanup(func() {
		_ = db.Close()
	})

	return db, mock
}

func TestCreateOutboxEvent(t *testing.T) {
	ctx := context.Background()

	t.Run("creates one pending outbox insert with the marshaled payload", func(t *testing.T) {
		// Test Case ID: TC-GO-DB-009
		// Objective: CreateOutboxEvent must persist one local outbox insert with PENDING status and serialized payload.
		db, mock := newMockOutboxDB(t)
		createdAt := time.Date(2026, 4, 17, 10, 0, 0, 0, time.UTC)

		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "outbox_events" ("id", "event_type", "payload", "status", "created_at", "updated_at") VALUES (DEFAULT, 'BOOKING_CREATED', '{"amount":180000,"booking_id":"booking-1"}', 'PENDING', DEFAULT, DEFAULT) RETURNING "id", "created_at", "updated_at"`)).
			WillReturnRows(sqlmock.NewRows([]string{"id", "event_type", "payload", "status", "created_at", "updated_at"}).
				AddRow(1, models.EventTypeBookingCreated, `{"amount":180000,"booking_id":"booking-1"}`, models.OutboxStatusPending, createdAt, createdAt))

		err := CreateOutboxEvent(ctx, db, models.EventTypeBookingCreated, map[string]interface{}{
			"amount":     180000,
			"booking_id": "booking-1",
		})
		if err != nil {
			t.Fatalf("expected CreateOutboxEvent to succeed, got %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("database expectations were not met: %v", err)
		}
	})

	t.Run("returns a marshal error before touching the database", func(t *testing.T) {
		// Test Case ID: TC-GO-DB-010
		// Objective: unsupported event payloads must fail fast at the marshal boundary.
		err := CreateOutboxEvent(ctx, nil, models.EventTypeBookingCreated, map[string]interface{}{
			"unsupported": func() {},
		})
		if err == nil {
			t.Fatal("expected CreateOutboxEvent to fail on unsupported payload")
		}
		if !strings.Contains(err.Error(), "failed to marshal event data") {
			t.Fatalf("expected marshal error context, got %v", err)
		}
	})
}
