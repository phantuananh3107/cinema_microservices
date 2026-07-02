package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Room struct {
	bun.BaseModel `bun:"table:rooms,alias:r"`

	Id         string     `bun:"id,pk" json:"id"`
	RoomNumber int        `bun:"room_number,notnull,unique" json:"room_number"`
	Capacity   int        `bun:"capacity,notnull" json:"capacity"`
	RoomType   string     `bun:"room_type,notnull" json:"room_type"`
	Status     string     `bun:"status,notnull,default:'ACTIVE'" json:"status"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt  *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Seats     []*Seat     `bun:"rel:has-many,join:id=room_id" json:"seats,omitempty"`
	Showtimes []*Showtime `bun:"rel:has-many,join:id=room_id" json:"showtimes,omitempty"`
}
