import { Document } from './Document'

export interface DocumentChunk {
    id: string
    document_id: string
    chunk_index: number
    content: string
    embedding: number[]
    start_pos: number
    end_pos: number
    token_count: number
    created_at?: Date
    document?: Document
}

export const DOCUMENT_CHUNK_TABLE = 'document_chunks'
