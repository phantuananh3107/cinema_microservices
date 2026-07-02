package datastore

import (
	"context"
	"encoding/json"
	"fmt"

	"booking-service/internal/models"

	"github.com/uptrace/bun"
)

func CreateOutboxEvent(ctx context.Context, db bun.IDB, eventType models.OutboxEventType, eventData interface{}) error {
	payload, err := json.Marshal(eventData)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	event := &models.OutboxEvent{
		EventType: eventType,
		Payload:   string(payload),
		Status:    models.OutboxStatusPending,
	}

	_, err = db.NewInsert().
		Model(event).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create outbox event: %w", err)
	}

	return nil
}
