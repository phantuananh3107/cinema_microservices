package models

import (
	"time"

	"github.com/uptrace/bun"
)

type OutboxEvent struct {
	bun.BaseModel `bun:"table:outbox_events"`

	ID        int       `bun:"id,pk,autoincrement" json:"id"`
	EventType string    `bun:"event_type,notnull" json:"event_type"`
	Payload   string    `bun:"payload,notnull" json:"payload"`
	Status    string    `bun:"status,notnull,default:'PENDING'" json:"status"`
	CreatedAt time.Time `bun:"created_at,notnull,default:now()" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:now()" json:"updated_at"`
}

type OutboxEventStatus string

const (
	OutboxStatusPending OutboxEventStatus = "PENDING"
	OutboxStatusSent    OutboxEventStatus = "SENT"
	OutboxStatusFailed  OutboxEventStatus = "FAILED"
)

type OutboxEventType string

const (
	EventTypeBookingCreated   OutboxEventType = "BOOKING_CREATED"
	EventTypePaymentCompleted OutboxEventType = "PAYMENT_COMPLETED"
	EventTypeSeatReserved     OutboxEventType = "SEAT_RESERVED"
	EventTypeSeatReleased     OutboxEventType = "SEAT_RELEASED"
	EventTypeNotificationSent OutboxEventType = "NOTIFICATION_SENT"
)
