package datastore

import (
	"context"
	"fmt"

	"worker-service/internal/models"

	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type OutboxRepository interface {
	GetPendingEvents(ctx context.Context, limit int) ([]models.OutboxEvent, error)
	GetBookingEventByBookingID(ctx context.Context, bookingID string) (*models.OutboxEvent, error)
	MarkEventAsSent(ctx context.Context, eventID int) error
	MarkEventAsFailed(ctx context.Context, eventID int) error
}

type outboxRepository struct {
	db *bun.DB
}

func NewOutboxRepository(i *do.Injector) (OutboxRepository, error) {
	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	return &outboxRepository{
		db: db,
	}, nil
}

func (r *outboxRepository) GetPendingEvents(ctx context.Context, limit int) ([]models.OutboxEvent, error) {
	events := make([]models.OutboxEvent, 0)

	err := r.db.NewSelect().
		Model(&events).
		Where("status = ?", models.OutboxStatusPending).
		OrderExpr("id ASC").
		Limit(limit).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to query outbox events: %w", err)
	}

	return events, nil
}

func (r *outboxRepository) GetBookingEventByBookingID(ctx context.Context, bookingID string) (*models.OutboxEvent, error) {
	event := new(models.OutboxEvent)
	err := r.db.NewSelect().
		Model(event).
		Where("event_type = ?", models.EventTypeBookingCreated).
		Where("payload::jsonb->>'booking_id' = ?", bookingID).
		Order("id DESC").
		Limit(1).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking event: %w", err)
	}

	return event, nil
}

func (r *outboxRepository) MarkEventAsSent(ctx context.Context, eventID int) error {
	_, err := r.db.NewUpdate().
		Model((*models.OutboxEvent)(nil)).
		Set("status = ?", models.OutboxStatusSent).
		SetColumn("updated_at", "NOW()").
		Where("id = ?", eventID).
		Exec(ctx)

	return err
}

func (r *outboxRepository) MarkEventAsFailed(ctx context.Context, eventID int) error {
	_, err := r.db.NewUpdate().
		Model((*models.OutboxEvent)(nil)).
		Set("status = ?", models.OutboxStatusFailed).
		SetColumn("updated_at", "NOW()").
		Where("id = ?", eventID).
		Exec(ctx)

	return err
}
