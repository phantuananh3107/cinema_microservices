package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Showtime struct {
	bun.BaseModel `bun:"table:showtimes,alias:st"`

	Id        string     `bun:"id,pk" json:"id"`
	MovieId   string     `bun:"movie_id,notnull" json:"movie_id"`
	RoomId    string     `bun:"room_id,notnull" json:"room_id"`
	StartTime time.Time  `bun:"start_time,notnull" json:"start_time"`
	EndTime   time.Time  `bun:"end_time,notnull" json:"end_time"`
	Format    string     `bun:"format,notnull" json:"format"`
	BasePrice float64    `bun:"base_price,notnull,type:decimal(10,2)" json:"base_price"`
	Status    string     `bun:"status,notnull,default:'SCHEDULED'" json:"status"`
	CreatedAt time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Movie    *Movie     `bun:"rel:belongs-to,join:movie_id=id" json:"movie,omitempty"`
	Room     *Room      `bun:"rel:belongs-to,join:room_id=id" json:"room,omitempty"`
	Bookings []*Booking `bun:"rel:has-many,join:id=showtime_id" json:"bookings,omitempty"`
}
