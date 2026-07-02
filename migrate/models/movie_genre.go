package models

import (
	"time"

	"github.com/uptrace/bun"
)

type MovieGenre struct {
	bun.BaseModel `bun:"table:movie_genres,alias:mg"`

	Id        string    `bun:"id,pk" json:"id"`
	MovieId   string    `bun:"movie_id,notnull" json:"movie_id"`
	GenreId   string    `bun:"genre_id,notnull" json:"genre_id"`
	CreatedAt time.Time `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`

	Movie *Movie `bun:"rel:belongs-to,join:movie_id=id" json:"movie,omitempty"`
	Genre *Genre `bun:"rel:belongs-to,join:genre_id=id" json:"genre,omitempty"`
}
