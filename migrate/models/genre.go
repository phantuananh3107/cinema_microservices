package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Genre struct {
	bun.BaseModel `bun:"table:genres,alias:g"`

	Id          string     `bun:"id,pk" json:"id"`
	Name        string     `bun:"name,notnull,unique" json:"name"`
	Slug        string     `bun:"slug,notnull,unique" json:"slug"`
	Description *string    `bun:"description" json:"description"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at"`

	Movies []*Movie `bun:"m2m:movie_genres,join:Genre=Movie" json:"movies,omitempty"`
}
