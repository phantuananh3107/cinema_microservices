package entity

import (
	"time"

	"github.com/uptrace/bun"
)

type RoomStatus string

const (
	RoomStatusActive      RoomStatus = "ACTIVE"
	RoomStatusInactive    RoomStatus = "INACTIVE"
	RoomStatusMaintenance RoomStatus = "MAINTENANCE"
)

type RoomType string

const (
	RoomTypeStandard RoomType = "STANDARD"
	RoomTypeVIP      RoomType = "VIP"
	RoomTypeIMAX     RoomType = "IMAX"
)

type Room struct {
	bun.BaseModel `bun:"table:rooms,alias:r"`

	Id         string     `bun:"id,pk" json:"id"`
	RoomNumber int        `bun:"room_number,notnull,unique" json:"room_number"`
	Capacity   int        `bun:"capacity,notnull" json:"capacity"`
	RoomType   RoomType   `bun:"room_type,notnull" json:"room_type"`
	Status     RoomStatus `bun:"status,notnull,default:'ACTIVE'" json:"status"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt  *time.Time `bun:"updated_at" json:"updated_at,omitempty"`
}

func (r *Room) IsValid() bool {
	if r.RoomNumber <= 0 || r.Capacity <= 0 {
		return false
	}
	return true
}
