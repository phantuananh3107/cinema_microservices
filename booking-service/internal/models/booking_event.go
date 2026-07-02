package models

type BookingEventData struct {
	BookingId   string        `json:"booking_id"`
	UserId      string        `json:"user_id"`
	ShowtimeId  string        `json:"showtime_id"`
	RoomId      string        `json:"room_id"`
	SeatIds     []string      `json:"seat_ids"`
	TotalAmount float64       `json:"total_amount"`
	Status      BookingStatus `json:"status"`
}
