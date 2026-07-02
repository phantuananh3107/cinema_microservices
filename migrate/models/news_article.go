package models

import (
	"time"

	"github.com/uptrace/bun"
)

type NewsArticle struct {
	bun.BaseModel `bun:"table:news_articles,alias:na"`

	Id          string     `bun:"id,pk" json:"id"`
	Title       string     `bun:"title,notnull" json:"title"`
	Slug        string     `bun:"slug,notnull" json:"slug"`
	Source      string     `bun:"source,notnull" json:"source"` // Source website name
	SourceURL   string     `bun:"source_url,notnull" json:"source_url"`
	Author      string     `bun:"author" json:"author"`
	Content     string     `bun:"content,type:text" json:"content"`               // Full article content
	Summary     string     `bun:"summary,type:text" json:"summary"`               // AI-generated summary
	ImageURL    string     `bun:"image_url" json:"image_url"`                     // Featured image
	Category    string     `bun:"category" json:"category"`                       // e.g., "domestic", "international", "review", "box-office"
	Tags        []string   `bun:"tags,array" json:"tags"`                         // Related topics/keywords
	Language    string     `bun:"language,notnull,default:'vi'" json:"language"`  // "vi" or "en"
	PublishedAt *time.Time `bun:"published_at" json:"published_at"`               // Original publish date from source
	Status      string     `bun:"status,notnull,default:'PENDING'" json:"status"` // pending, summarized, published
	CreatedAt   *time.Time `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at"`
}
