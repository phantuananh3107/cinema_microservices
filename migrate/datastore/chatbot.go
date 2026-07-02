package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateDocumentTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Document)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create documents table: %w", err)
	}

	// Create index on status for faster queries
	_, err = db.NewCreateIndex().
		Model((*models.Document)(nil)).
		Index("idx_documents_status").
		Column("status").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on documents.status: %w", err)
	}

	// Create index on created_at for sorting
	_, err = db.NewCreateIndex().
		Model((*models.Document)(nil)).
		Index("idx_documents_created_at").
		Column("created_at").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on documents.created_at: %w", err)
	}

	fmt.Println("✓ Documents table created successfully")
	return nil
}

func CreateDocumentChunkTable(ctx context.Context, db *bun.DB) error {
	_, err := db.Exec("CREATE EXTENSION IF NOT EXISTS vector")
	if err != nil {
		return fmt.Errorf("failed to create pgvector extension: %w", err)
	}

	_, err = db.NewCreateTable().
		Model((*models.DocumentChunk)(nil)).
		IfNotExists().
		ForeignKey("(document_id) REFERENCES documents(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create document_chunks table: %w", err)
	}

	// Create index on document_id for faster queries
	_, err = db.NewCreateIndex().
		Model((*models.DocumentChunk)(nil)).
		Index("idx_document_chunks_document_id").
		Column("document_id").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on document_chunks.document_id: %w", err)
	}

	// Create composite index on document_id and chunk_index for ordering
	_, err = db.NewCreateIndex().
		Model((*models.DocumentChunk)(nil)).
		Index("idx_document_chunks_chunk_index").
		Column("document_id", "chunk_index").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on document_chunks.chunk_index: %w", err)
	}

	fmt.Println("✓ Document chunks table created successfully")
	return nil
}

func CreateChatTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Chat)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create chats table: %w", err)
	}

	// Create index on created_at for sorting
	_, err = db.NewCreateIndex().
		Model((*models.Chat)(nil)).
		Index("idx_chats_created_at").
		Column("created_at").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index on chats.created_at: %w", err)
	}

	fmt.Println("✓ Chats table created successfully")
	return nil
}

func DropDocumentChunkTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.DocumentChunk)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop document_chunks table: %w", err)
	}
	fmt.Println("✓ Document chunks table dropped successfully")
	return nil
}

func DropDocumentTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Document)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop documents table: %w", err)
	}
	fmt.Println("✓ Documents table dropped successfully")
	return nil
}

func DropChatTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Chat)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop chats table: %w", err)
	}
	fmt.Println("✓ Chats table dropped successfully")
	return nil
}
