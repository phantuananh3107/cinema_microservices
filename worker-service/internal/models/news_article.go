package models

import (
	"time"

	"github.com/uptrace/bun"
)

type NewsArticleStatus string

const (
	NewsArticleStatusPending   NewsArticleStatus = "PENDING"
	NewsArticleStatusPublished NewsArticleStatus = "PUBLISHED"
	NewsArticleStatusRejected  NewsArticleStatus = "REJECTED"
)

type NewsArticle struct {
	bun.BaseModel `bun:"table:news_articles,alias:na"`

	Id          string            `bun:"id,pk" json:"id"`
	Title       string            `bun:"title,notnull" json:"title"`
	Slug        string            `bun:"slug,notnull" json:"slug"`
	Source      string            `bun:"source,notnull" json:"source"`
	SourceURL   string            `bun:"source_url,notnull" json:"source_url"`
	Author      string            `bun:"author" json:"author"`
	Content     string            `bun:"content,type:text" json:"content"`
	Summary     string            `bun:"summary,type:text" json:"summary"`
	ImageURL    string            `bun:"image_url" json:"image_url"`
	Category    string            `bun:"category" json:"category"`
	Tags        []string          `bun:"tags,array" json:"tags"`
	Language    string            `bun:"language,notnull,default:'vi'" json:"language"`
	PublishedAt *time.Time        `bun:"published_at" json:"published_at"`
	Status      NewsArticleStatus `bun:"status,notnull,default:'PENDING'" json:"status"`
	CreatedAt   *time.Time        `bun:"created_at,nullzero,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time        `bun:"updated_at" json:"updated_at"`
}
