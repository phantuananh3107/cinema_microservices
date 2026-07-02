package entity

import (
	"time"

	"github.com/uptrace/bun"
)

type SeatStatus string

const (
	SeatStatusAvailable   SeatStatus = "AVAILABLE"
	SeatStatusOccupied    SeatStatus = "OCCUPIED"
	SeatStatusMaintenance SeatStatus = "MAINTENANCE"
	SeatStatusBlocked     SeatStatus = "BLOCKED"
)

type SeatType string

const (
	SeatTypeRegular SeatType = "REGULAR"
	SeatTypeVIP     SeatType = "VIP"
	SeatTypeCouple  SeatType = "COUPLE"
)

type Seat struct {
	bun.BaseModel `bun:"table:seats,alias:s"`

	Id         string     `bun:"id,pk" json:"id"`
	RoomId     string     `bun:"room_id,notnull" json:"room_id"`
	SeatNumber string     `bun:"seat_number,notnull" json:"seat_number"`
	RowNumber  string     `bun:"row_number,notnull" json:"row_number"`
	SeatType   SeatType   `bun:"seat_type,notnull,default:'REGULAR'" json:"seat_type"`
	Status     SeatStatus `bun:"status,notnull,default:'AVAILABLE'" json:"status"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt  *time.Time `bun:"updated_at" json:"updated_at,omitempty"`
}

func (s *Seat) IsValid() bool {
	if s.RoomId == "" || s.SeatNumber == "" || s.RowNumber == "" {
		return false
	}
	return true
}

func GetSeatTypePriceMultiplier(seatType SeatType) float64 {
	switch seatType {
	case SeatTypeRegular:
		return 1.0
	case SeatTypeVIP:
		return 1.5
	case SeatTypeCouple:
		return 2.5
	default:
		return 1.0
	}
}

func (s *Seat) CalculatePrice(basePrice float64) float64 {
	return basePrice * GetSeatTypePriceMultiplier(s.SeatType)
}
