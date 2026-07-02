package models

import (
	"time"

	"github.com/uptrace/bun"
)

type BookingStatus string

const (
	BookingStatusPending   BookingStatus = "PENDING"
	BookingStatusConfirmed BookingStatus = "CONFIRMED"
	BookingStatusCancelled BookingStatus = "CANCELLED"
)

type BookingType string

const (
	BookingTypeOnline  BookingType = "ONLINE"
	BookingTypeOffline BookingType = "OFFLINE"
)

type Booking struct {
	bun.BaseModel `bun:"table:bookings,alias:b"`

	Id          string        `bun:"id,pk" json:"id"`
	UserId      string        `bun:"user_id,notnull" json:"user_id"`
	ShowtimeId  string        `bun:"showtime_id,notnull" json:"showtime_id"`
	TotalAmount float64       `bun:"total_amount,notnull,type:decimal(10,2)" json:"total_amount"`
	Status      BookingStatus `bun:"status,notnull,default:'PENDING'" json:"status"`
	StaffId     string        `bun:"staff_id" json:"staff_id,omitempty"`
	BookingType BookingType   `bun:"booking_type,notnull" json:"booking_type"`
	CreatedAt   time.Time     `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time    `bun:"updated_at" json:"updated_at,omitempty"`

	Ticket []*Ticket `bun:"rel:has-many,join:id=booking_id" json:"ticket,omitempty"`
}
