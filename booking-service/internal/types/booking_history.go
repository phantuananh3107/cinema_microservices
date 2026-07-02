package types

import "time"

type BookingHistory struct {
	Id          string     `json:"id"`
	UserId      string     `json:"user_id"`
	ShowtimeId  string     `json:"showtime_id"`
	TotalAmount float64    `json:"total_amount"`
	Status      string     `json:"status"`
	StaffId     string     `json:"staff_id,omitempty"`
	BookingType string     `json:"booking_type"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty"`

	MovieTitle   string `json:"movie_title,omitempty"`
	ShowtimeDate string `json:"showtime_date,omitempty"`
	ShowtimeTime string `json:"showtime_time,omitempty"`
	SeatNumbers  string `json:"seat_numbers,omitempty"`
}

type TicketWithBookingInfo struct {
	Id         string     `json:"id"`
	BookingId  string     `json:"booking_id"`
	ShowtimeId string     `json:"showtime_id"`
	SeatId     string     `json:"seat_id"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty"`

	BookingType  string  `json:"booking_type"`
	TotalAmount  float64 `json:"total_amount"`
	MovieTitle   string  `json:"movie_title,omitempty"`
	ShowtimeDate string  `json:"showtime_date,omitempty"`
	ShowtimeTime string  `json:"showtime_time,omitempty"`
	RoomName     string  `json:"room_name,omitempty"`
	SeatRow      string  `json:"seat_row,omitempty"`
	SeatNumber   string  `json:"seat_number,omitempty"`
	SeatType     string  `json:"seat_type,omitempty"`
}
