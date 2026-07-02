package models

import (
	"time"

	"github.com/uptrace/bun"
)

type NewsSummary struct {
	bun.BaseModel `bun:"table:news_summaries,alias:ns"`

	Id          string     `bun:"id,pk" json:"id"`
	Title       string     `bun:"title,notnull" json:"title"`
	Summary     string     `bun:"summary,type:text,notnull" json:"summary"`
	ArticleIds  []string   `bun:"article_ids,array,notnull" json:"article_ids"`
	SourceCount int        `bun:"source_count,notnull" json:"source_count"`
	Category    string     `bun:"category" json:"category"`
	Language    string     `bun:"language,notnull,default:'vi'" json:"language"`
	Tags        []string   `bun:"tags,array" json:"tags"`
	ImageURL    string     `bun:"image_url" json:"image_url"`
	Status      string     `bun:"status,notnull,default:'published'" json:"status"`
	IsActive    *bool      `bun:"is_active,notnull,default:true" json:"is_active"`
	CreatedAt   *time.Time `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at"`
}
