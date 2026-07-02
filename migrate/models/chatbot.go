package models

import (
	"time"

	"github.com/pgvector/pgvector-go"
	"github.com/uptrace/bun"
)

type Document struct {
	bun.BaseModel `bun:"table:documents,alias:d"`

	ID        string    `bun:"id,pk,type:uuid,default:gen_random_uuid()"`
	Title     string    `bun:"title,notnull"`
	FilePath  string    `bun:"file_path,notnull"`
	FileType  string    `bun:"file_type,notnull"`
	Size      int64     `bun:"size,notnull"`
	Status    string    `bun:"status,notnull,default:'processing'"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

type DocumentChunk struct {
	bun.BaseModel `bun:"table:document_chunks,alias:dc"`

	ID         string          `bun:"id,pk,type:uuid,default:gen_random_uuid()"`
	DocumentID string          `bun:"document_id,notnull,type:uuid"`
	ChunkIndex int             `bun:"chunk_index,notnull"`
	Content    string          `bun:"content,notnull,type:text"`
	Embedding  pgvector.Vector `bun:"embedding,notnull,type:vector(3072)"`
	StartPos   int             `bun:"start_pos,notnull"`
	EndPos     int             `bun:"end_pos,notnull"`
	TokenCount int             `bun:"token_count,notnull"`
	CreatedAt  time.Time       `bun:"created_at,nullzero,notnull,default:current_timestamp"`

	Document *Document `bun:"rel:belongs-to,join:document_id=id"`
}

type Chat struct {
	bun.BaseModel `bun:"table:chats,alias:c"`

	ID        string    `bun:"id,pk,type:uuid,default:gen_random_uuid()"`
	Question  string    `bun:"question,notnull,type:text"`
	Answer    string    `bun:"answer,notnull,type:text"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}
