import { Request, Response } from 'express'
import { UploadedFile } from 'express-fileupload'
import path from 'path'
import { DocumentService } from '../services/index.js'
import { DocumentResponse } from '../types/index.js'
import { createDirIfNotExists, sanitizeFilename } from '../utils/index.js'
import { logger } from '../utils/logger.js'

export class DocumentHandler {
    private uploadDir = './uploads'
    private maxFileSize = 10 * 1024 * 1024 // 10MB
    private allowedTypes = new Set(['.txt', '.md', '.pdf'])
    private documentService: DocumentService

    constructor({ documentService }: { documentService: DocumentService }) {
        this.documentService = documentService
    }

    uploadDocument = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.files || !req.files.document) {
                res.status(400).json({
                    error: 'No file uploaded',
                })
                return
            }

            const file = req.files.document as UploadedFile

            if (file.size > this.maxFileSize) {
                res.status(400).json({
                    error: `File too large. Max size: ${this.maxFileSize / (1024 * 1024)} MB`,
                })
                return
            }

            const ext = path.extname(file.name)
            if (!this.allowedTypes.has(ext)) {
                res.status(400).json({
                    error: `File type not supported: ${ext}`,
                })
                return
            }

            let title = req.body.title as string
            if (!title) {
                title = file.name
            }

            const timestamp = Date.now()
            const sanitizedName = sanitizeFilename(file.name)
            const filename = `${timestamp}_${sanitizedName}`
            const filePath = path.join(this.uploadDir, filename)

            await createDirIfNotExists(this.uploadDir)

            await file.mv(filePath)

            const doc = await this.documentService.processDocument(filePath, title)

            const response: DocumentResponse = {
                id: doc.id,
                title: doc.title,
                status: doc.status,
                message: 'Document uploaded and processing started',
            }

            res.status(200).json(response)
        } catch (error) {
            logger.error('Error uploading document', { error })
            res.status(500).json({
                error: `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
        }
    }

    getDocument = async (req: Request, res: Response): Promise<void> => {
        try {
            const docID = req.params.id

            if (!docID) {
                res.status(400).json({
                    error: 'Document ID is required',
                })
                return
            }

            const doc = await this.documentService.getDocument(docID)

            if (!doc) {
                res.status(404).json({
                    error: 'Document not found',
                })
                return
            }

            res.status(200).json(doc)
        } catch (error) {
            logger.error('Error getting document', { docID: req.params.id, error })
            res.status(500).json({
                error: 'Failed to fetch document',
            })
        }
    }

    listDocuments = async (req: Request, res: Response): Promise<void> => {
        try {
            let limit = parseInt(req.query.limit as string) || 10
            let offset = parseInt(req.query.offset as string) || 0

            if (limit < 1 || limit > 100) {
                limit = 10
            }

            if (offset < 0) {
                offset = 0
            }

            const docs = await this.documentService.listDocuments(limit, offset)

            res.status(200).json({
                documents: docs,
                limit,
                offset,
                count: docs.length,
            })
        } catch (error) {
            logger.error('Error listing documents', { error })
            res.status(500).json({
                error: 'Failed to fetch documents',
            })
        }
    }

    deleteDocument = async (req: Request, res: Response): Promise<void> => {
        try {
            const docID = req.params.id

            if (!docID) {
                res.status(400).json({
                    error: 'Document ID is required',
                })
                return
            }

            await this.documentService.deleteDocument(docID)

            res.status(200).json({
                message: 'Document deleted successfully',
            })
        } catch (error) {
            logger.error('Error deleting document', { docID: req.params.id, error })
            res.status(500).json({
                error: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
        }
    }

    getDocumentChunks = async (req: Request, res: Response): Promise<void> => {
        try {
            const docID = req.params.id

            if (!docID) {
                res.status(400).json({
                    error: 'Document ID is required',
                })
                return
            }

            const chunks = await this.documentService.getDocumentChunks(docID)

            res.status(200).json({
                document_id: docID,
                chunks,
                count: chunks.length,
            })
        } catch (error) {
            logger.error('Error getting document chunks', { docID: req.params.id, error })
            res.status(500).json({
                error: 'Failed to fetch document chunks',
            })
        }
    }
}
