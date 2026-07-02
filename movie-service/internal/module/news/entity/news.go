package entity

import "time"

type NewsSummary struct {
	ID          string    `bun:"id,pk" json:"id"`
	Title       string    `bun:"title" json:"title"`
	Summary     string    `bun:"summary" json:"summary"`
	ArticleIDs  []string  `bun:"article_ids,array" json:"article_ids"`
	SourceCount int       `bun:"source_count" json:"source_count"`
	Category    string    `bun:"category" json:"category"`
	Language    string    `bun:"language" json:"language"`
	Tags        []string  `bun:"tags,array" json:"tags"`
	ImageURL    string    `bun:"image_url" json:"image_url"`
	Status      string    `bun:"status" json:"status"`
	IsActive    bool      `bun:"is_active" json:"is_active"`
	CreatedAt   time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at" json:"updated_at"`
}

type NewsArticle struct {
	ID          string    `bun:"id,pk" json:"id"`
	Title       string    `bun:"title" json:"title"`
	Slug        string    `bun:"slug" json:"slug"`
	Source      string    `bun:"source" json:"source"`
	SourceURL   string    `bun:"source_url" json:"source_url"`
	Author      string    `bun:"author" json:"author"`
	Content     string    `bun:"content" json:"content"`
	Summary     string    `bun:"summary" json:"summary"`
	ImageURL    string    `bun:"image_url" json:"image_url"`
	Category    string    `bun:"category" json:"category"`
	Tags        []string  `bun:"tags,array" json:"tags"`
	Language    string    `bun:"language" json:"language"`
	PublishedAt time.Time `bun:"published_at" json:"published_at"`
	Status      string    `bun:"status" json:"status"`
	CreatedAt   time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at" json:"updated_at"`
}

type NewsSummaryWithSources struct {
	NewsSummary
	Sources []NewsArticle `json:"sources"`
}
