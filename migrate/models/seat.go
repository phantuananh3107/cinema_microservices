package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Seat struct {
	bun.BaseModel `bun:"table:seats,alias:s"`

	Id         string     `bun:"id,pk" json:"id"`
	RoomId     string     `bun:"room_id,notnull" json:"room_id"`
	SeatNumber string     `bun:"seat_number,notnull" json:"seat_number"`
	RowNumber  string     `bun:"row_number,notnull" json:"row_number"`
	SeatType   string     `bun:"seat_type,notnull,default:'REGULAR'" json:"seat_type"`
	Status     string     `bun:"status,notnull,default:'AVAILABLE'" json:"status"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt  *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Room    *Room     `bun:"rel:belongs-to,join:room_id=id" json:"room,omitempty"`
	Tickets []*Ticket `bun:"rel:has-many,join:id=seat_id" json:"tickets,omitempty"`
}
