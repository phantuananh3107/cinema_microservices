package entity

import (
	"time"

	"github.com/uptrace/bun"
)

type MovieStatus string

const (
	MovieStatusUpcoming MovieStatus = "UPCOMING"
	MovieStatusShowing  MovieStatus = "SHOWING"
	MovieStatusEnded    MovieStatus = "ENDED"
)

type Genre struct {
	bun.BaseModel `bun:"table:genres,alias:g"`

	Id          string  `bun:"id,pk" json:"id"`
	Name        string  `bun:"name,notnull,unique" json:"name"`
	Slug        string  `bun:"slug,notnull,unique" json:"slug"`
	Description *string `bun:"description" json:"description"`
}

type MovieGenre struct {
	bun.BaseModel `bun:"table:movie_genres,alias:mg"`

	Id        string    `bun:"id,pk" json:"id"`
	MovieId   string    `bun:"movie_id,notnull" json:"movie_id"`
	GenreId   string    `bun:"genre_id,notnull" json:"genre_id"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`

	Movie *Movie `bun:"rel:belongs-to,join:movie_id=id" json:"movie,omitempty"`
	Genre *Genre `bun:"rel:belongs-to,join:genre_id=id" json:"genre,omitempty"`
}

type Movie struct {
	bun.BaseModel `bun:"table:movies,alias:m"`

	Id          string      `bun:"id,pk" json:"id"`
	Title       string      `bun:"title,notnull" json:"title"`
	Slug        string      `bun:"slug,notnull" json:"slug"`
	Director    string      `bun:"director" json:"director"`
	Cast        string      `bun:"cast" json:"cast"`
	Duration    int         `bun:"duration,notnull" json:"duration"`
	ReleaseDate *time.Time  `bun:"release_date,type:date" json:"release_date"`
	Description string      `bun:"description" json:"description"`
	TrailerURL  string      `bun:"trailer_url" json:"trailer_url"`
	PosterURL   string      `bun:"poster_url" json:"poster_url"`
	Status      MovieStatus `bun:"status,notnull" json:"status"`
	CreatedAt   *time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time  `bun:"updated_at" json:"updated_at"`

	MovieGenres []*MovieGenre `bun:"rel:has-many,join:id=movie_id" json:"movie_genres,omitempty"`
	Genres      []*Genre      `bun:"-" json:"genres,omitempty"` // Computed field
}

func (m *Movie) IsValid() bool {
	if m.Title == "" || m.Duration <= 0 {
		return false
	}
	return true
}

func (m *Movie) CanTransitionTo(newStatus MovieStatus) bool {
	switch m.Status {
	case MovieStatusUpcoming:
		return newStatus == MovieStatusShowing
	case MovieStatusShowing:
		return newStatus == MovieStatusEnded
	default:
		return false
	}
}
