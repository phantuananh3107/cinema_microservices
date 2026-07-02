import { Pool } from 'pg'
import { Document, DocumentStatus, DOCUMENT_TABLE } from '../models'
import { wrapDatabaseError } from '../utils/errorHandler'

export class DocumentDatastore {
    constructor(private pool: Pool) {}

    async createDocument(doc: Document): Promise<void> {
        const query = `
      INSERT INTO ${DOCUMENT_TABLE} (id, title, file_path, file_type, size, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

        const values = [
            doc.id,
            doc.title,
            doc.file_path,
            doc.file_type,
            doc.size,
            doc.status,
            doc.created_at || new Date(),
        ]

        try {
            await this.pool.query(query, values)
        } catch (error) {
            throw wrapDatabaseError('Failed to insert document', error)
        }
    }

    async getDocument(id: string): Promise<Document | null> {
        const query = `SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1`

        try {
            const result = await this.pool.query(query, [id])
            if (result.rows.length === 0) {
                return null
            }
            return result.rows[0] as Document
        } catch (error) {
            throw new Error(
                `Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async updateDocumentStatus(docID: string, status: DocumentStatus): Promise<void> {
        const query = `
      UPDATE ${DOCUMENT_TABLE}
      SET status = $1
      WHERE id = $2
    `

        try {
            await this.pool.query(query, [status, docID])
        } catch (error) {
            throw new Error(
                `Failed to update document status: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async getAllDocuments(limit: number, offset: number): Promise<Document[]> {
        const query = `
      SELECT * FROM ${DOCUMENT_TABLE}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `

        try {
            const result = await this.pool.query(query, [limit, offset])
            return result.rows as Document[]
        } catch (error) {
            throw new Error(
                `Failed to get documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    async deleteDocument(id: string): Promise<void> {
        const query = `DELETE FROM ${DOCUMENT_TABLE} WHERE id = $1`

        try {
            await this.pool.query(query, [id])
        } catch (error) {
            throw new Error(
                `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }
}
