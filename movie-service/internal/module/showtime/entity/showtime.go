package entity

import (
	"time"

	"github.com/uptrace/bun"
)

type Movie struct {
	bun.BaseModel `bun:"table:movies"`

	Id          string    `bun:"id,pk" json:"id"`
	Title       string    `bun:"title" json:"title"`
	Description string    `bun:"description" json:"description"`
	Duration    int       `bun:"duration" json:"duration"`
	ReleaseDate time.Time `bun:"release_date" json:"release_date"`
	Director    string    `bun:"director" json:"director"`
	Cast        string    `bun:"cast" json:"cast"`
	PosterUrl   string    `bun:"poster_url" json:"poster_url"`
	TrailerUrl  string    `bun:"trailer_url" json:"trailer_url"`
	Status      string    `bun:"status" json:"status"`
}

type Room struct {
	bun.BaseModel `bun:"table:rooms"`

	Id         string `bun:"id,pk" json:"id"`
	RoomNumber int    `bun:"room_number" json:"room_number"`
	Capacity   int    `bun:"capacity" json:"capacity"`
	RoomType   string `bun:"room_type" json:"room_type"`
	Status     string `bun:"status" json:"status"`
}

type Seat struct {
	Id         string `bun:"id,pk" json:"id"`
	RoomId     string `bun:"room_id" json:"room_id"`
	SeatNumber string `bun:"seat_number" json:"seat_number"`
	RowNumber  string `bun:"row_number" json:"row_number"`
	SeatType   string `bun:"seat_type" json:"seat_type"`
	Status     string `bun:"status" json:"status"`
}

type ShowtimeStatus string

const (
	ShowtimeStatusScheduled ShowtimeStatus = "SCHEDULED"
	ShowtimeStatusOngoing   ShowtimeStatus = "ONGOING"
	ShowtimeStatusCompleted ShowtimeStatus = "COMPLETED"
	ShowtimeStatusCanceled  ShowtimeStatus = "CANCELED"
)

type ShowtimeFormat string

const (
	ShowtimeFormat2D   ShowtimeFormat = "2D"
	ShowtimeFormat3D   ShowtimeFormat = "3D"
	ShowtimeFormatIMAX ShowtimeFormat = "IMAX"
)

type Showtime struct {
	bun.BaseModel `bun:"table:showtimes,alias:st"`

	Id        string         `bun:"id,pk" json:"id"`
	MovieId   string         `bun:"movie_id,notnull" json:"movie_id"`
	RoomId    string         `bun:"room_id,notnull" json:"room_id"`
	StartTime time.Time      `bun:"start_time,notnull" json:"start_time"`
	EndTime   time.Time      `bun:"end_time,notnull" json:"end_time"`
	Format    ShowtimeFormat `bun:"format,notnull" json:"format"`
	BasePrice float64        `bun:"base_price,notnull,type:decimal(10,2)" json:"base_price"`
	Status    ShowtimeStatus `bun:"status,notnull,default:'SCHEDULED'" json:"status"`
	CreatedAt time.Time      `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt *time.Time     `bun:"updated_at" json:"updated_at,omitempty"`

	// Relations
	Movie *Movie  `bun:"rel:belongs-to,join:movie_id=id" json:"movie,omitempty"`
	Room  *Room   `bun:"rel:belongs-to,join:room_id=id" json:"room,omitempty"`
	Seats []*Seat `bun:"-" json:"seats,omitempty"`
}

func TruncateToHalfHour(t time.Time) time.Time {
	minutes := t.Minute()
	if minutes < 30 {
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location())
	}
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 30, 0, 0, t.Location())
}

func (s *Showtime) IsValid() bool {
	if s.MovieId == "" || s.RoomId == "" {
		return false
	}
	if s.BasePrice < 0 {
		return false
	}
	if s.EndTime.Before(s.StartTime) || s.EndTime.Equal(s.StartTime) {
		return false
	}
	return true
}

func (s *Showtime) IsActiveStatus() bool {
	return s.Status == ShowtimeStatusScheduled || s.Status == ShowtimeStatusOngoing
}

func (s *Showtime) IsUpcoming() bool {
	return s.Status == ShowtimeStatusScheduled && time.Now().Before(s.StartTime)
}

func (s *Showtime) IsOngoing() bool {
	now := time.Now()
	return s.Status == ShowtimeStatusOngoing ||
		(s.Status == ShowtimeStatusScheduled && now.After(s.StartTime) && now.Before(s.EndTime))
}

func (s *Showtime) CalculateDuration() time.Duration {
	return s.EndTime.Sub(s.StartTime)
}
