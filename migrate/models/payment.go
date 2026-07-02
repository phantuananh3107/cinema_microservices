package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Payment struct {
	bun.BaseModel `bun:"table:payments,alias:py"`

	Id            string    `bun:"id,pk" json:"id"`
	BookingId     string    `bun:"booking_id,notnull" json:"booking_id"`
	Amount        float64   `bun:"amount,notnull,type:decimal(10,2)" json:"amount"`
	PaymentDate   time.Time `bun:"payment_date,notnull" json:"payment_date"`
	PaymentMethod string    `bun:"payment_method,notnull" json:"payment_method"`
	TransactionId *string   `bun:"transaction_id" json:"transaction_id,omitempty"`
	Status        string    `bun:"status,notnull,default:'PENDING'" json:"status"`
	Payload       *string   `bun:"payload" json:"payload,omitempty"`

	CreatedAt time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Booking *Booking `bun:"rel:belongs-to,join:booking_id=id" json:"booking,omitempty"`
}
