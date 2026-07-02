import { Pool } from 'pg'
import { DocumentChunk, DOCUMENT_CHUNK_TABLE } from '../models'

export class ChunkDatastore {
    constructor(private pool: Pool) {}

    async createChunk(chunk: DocumentChunk): Promise<void> {
        const query = `
      INSERT INTO ${DOCUMENT_CHUNK_TABLE}
      (id, document_id, chunk_index, content, embedding, start_pos, end_pos, token_count, created_at)
      VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9)
    `

        const embeddingVector = `[${chunk.embedding.join(',')}]`
        const values = [
            chunk.id,
            chunk.document_id,
            chunk.chunk_index,
            chunk.content,
            embeddingVector,
            chunk.start_pos,
            chunk.end_pos,
            chunk.token_count,
            chunk.created_at || new Date(),
        ]

        try {
            await this.pool.query(query, values)
        } catch (error) {
            throw new Error(
                `Failed to insert chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async batchCreateChunks(chunks: DocumentChunk[]): Promise<void> {
        if (chunks.length === 0) {
            return
        }

        const client = await this.pool.connect()
        try {
            await client.query('BEGIN')

            const query = `
        INSERT INTO ${DOCUMENT_CHUNK_TABLE}
        (id, document_id, chunk_index, content, embedding, start_pos, end_pos, token_count, created_at)
        VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9)
      `

            for (const chunk of chunks) {
                const embeddingVector = `[${chunk.embedding.join(',')}]`
                const values = [
                    chunk.id,
                    chunk.document_id,
                    chunk.chunk_index,
                    chunk.content,
                    embeddingVector,
                    chunk.start_pos,
                    chunk.end_pos,
                    chunk.token_count,
                    chunk.created_at || new Date(),
                ]
                await client.query(query, values)
            }

            await client.query('COMMIT')
        } catch (error) {
            await client.query('ROLLBACK')
            throw new Error(
                `Failed to insert chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        } finally {
            client.release()
        }
    }

    async getAllChunks(): Promise<DocumentChunk[]> {
        const query = `
      SELECT * FROM ${DOCUMENT_CHUNK_TABLE}
      WHERE embedding IS NOT NULL
    `

        try {
            const result = await this.pool.query(query)
            return result.rows as DocumentChunk[]
        } catch (error) {
            throw new Error(
                `Failed to get chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
        const query = `
      SELECT * FROM ${DOCUMENT_CHUNK_TABLE}
      WHERE document_id = $1
      ORDER BY chunk_index ASC
    `

        try {
            const result = await this.pool.query(query, [documentId])
            return result.rows as DocumentChunk[]
        } catch (error) {
            throw new Error(
                `Failed to get chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async deleteChunksByDocumentId(documentId: string): Promise<void> {
        const query = `DELETE FROM ${DOCUMENT_CHUNK_TABLE} WHERE document_id = $1`

        try {
            await this.pool.query(query, [documentId])
        } catch (error) {
            throw new Error(
                `Failed to delete chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async findSimilarChunks(
        questionEmbedding: number[],
        threshold: number,
        limit: number,
    ): Promise<Array<{ content: string; similarity: number }>> {
        const embeddingVector = `[${questionEmbedding.join(',')}]`

        const query = `
      SELECT
        content,
        1 - (embedding <=> $1::vector) AS similarity
      FROM ${DOCUMENT_CHUNK_TABLE}
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $2
    `

        try {
            const result = await this.pool.query(query, [embeddingVector, limit])
            const filtered = result.rows
                .map((row) => ({
                    content: row.content,
                    similarity: parseFloat(row.similarity) || 0,
                }))
                .filter((item) => item.similarity > threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit)

            return filtered
        } catch (error) {
            throw new Error(
                `Failed to find similar chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }
}
