export enum DocumentStatus {
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export interface Document {
    id: string
    title: string
    file_path: string
    file_type: string
    size: number
    status: DocumentStatus
    created_at?: Date
}

export const DOCUMENT_TABLE = 'documents'
