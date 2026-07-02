package types

import (
	"encoding/json"
)

type EmailVerify struct {
	From       string `json:"from"`
	To         string `json:"to"`
	Subject    string `json:"subject"`
	Body       string `json:"body"`
	VerifyCode string `json:"verify_code"`
	VerifyURL  string `json:"verify_url"`
	BookingId  string `json:"booking_id"`
}

type EmailPayload struct {
	From    string
	To      string
	Subject string
	Body    string
}

type EmailVerifyMessage struct {
	UserId     string `json:"user_id"`
	To         string `json:"to"`
	VerifyCode string `json:"verify_code"`
	VerifyURL  string `json:"verify_url"`
	BookingId  string `json:"booking_id"`
}

type BookingSuccessMessage struct {
	UserId    string                `json:"user_id"`
	UserEmail string                `json:"user_email"`
	To        string                `json:"to"`
	BookingId string                `json:"booking_id"`
	Seats     []BookingSeatDetail   `json:"seats"`
	Showtime  BookingShowtimeDetail `json:"showtime"`
}

type BookingSeatDetail struct {
	SeatRow    string `json:"seat_row"`
	SeatNumber int32  `json:"seat_number"`
	SeatType   string `json:"seat_type"`
}

type BookingShowtimeDetail struct {
	ShowtimeId string `json:"showtime_id"`
	StartTime  string `json:"start_time"`
	MovieName  string `json:"movie_name"`
	RoomName   string `json:"room_name"`
}

type (
	SeatInfo     = BookingSeatDetail
	ShowtimeInfo = BookingShowtimeDetail
)

type StaffWelcomeMessage struct {
	UserId   string `json:"user_id"`
	To       string `json:"to"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func UnmarshalEmailVerify(data []byte) (interface{}, error) {
	emailVerify := new(EmailVerifyMessage)
	if err := json.Unmarshal(data, emailVerify); err != nil {
		return nil, err
	}
	return emailVerify, nil
}

func UnmarshalBookingSuccess(data []byte) (interface{}, error) {
	var wrapper map[string]interface{}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return nil, err
	}

	nestedData, ok := wrapper["Data"]
	if !ok {
		// Try direct unmarshal without wrapper
		bookingSuccess := new(BookingSuccessMessage)
		if err := json.Unmarshal(data, bookingSuccess); err != nil {
			return nil, err
		}
		return bookingSuccess, nil
	}

	nestedBytes, err := json.Marshal(nestedData)
	if err != nil {
		return nil, err
	}

	bookingSuccess := new(BookingSuccessMessage)
	if err := json.Unmarshal(nestedBytes, bookingSuccess); err != nil {
		return nil, err
	}

	return bookingSuccess, nil
}

func UnmarshalStaffWelcome(data []byte) (interface{}, error) {
	staffWelcome := new(StaffWelcomeMessage)
	if err := json.Unmarshal(data, staffWelcome); err != nil {
		return nil, err
	}
	return staffWelcome, nil
}
